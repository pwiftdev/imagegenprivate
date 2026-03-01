/**
 * Supabase storage for generated images
 */

import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'generated-images';
const REFS_PATH_PREFIX = 'refs/';

/**
 * Upload reference image to Supabase Storage.
 * Returns public URL - backend will fetch from this URL to avoid payload limits.
 * Path: refs/{timestamp}-{random}.jpg (same bucket, separate path)
 */
export async function uploadReferenceImage(base64DataUrl: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const base64Clean = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  const ext = base64DataUrl.includes('image/png') ? 'png' : 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const storagePath = REFS_PATH_PREFIX + fileName;

  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: ext === 'png' ? 'image/png' : 'image/jpeg' });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, blob, {
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

/**
 * Upload multiple reference images to Supabase. Returns array of public URLs.
 * Use these URLs with the backend to avoid hitting request body limits.
 */
export async function uploadReferenceImages(base64DataUrls: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const dataUrl of base64DataUrls) {
    const url = await uploadReferenceImage(dataUrl);
    urls.push(url);
  }
  return urls;
}

export interface StoredImage {
  id: string;
  created_at: string;
  user_id: string | null;
  prompt: string | null;
  aspect_ratio: string | null;
  image_size: string | null;
  storage_path: string;
  file_name: string | null;
  reference_image_urls?: string[] | null;
  url: string; // Public URL for display
}

/**
 * Upload base64 image to Supabase Storage and save metadata to DB
 */
export async function saveImageToSupabase(
  base64Data: string,
  prompt: string,
  aspectRatio: string,
  imageSize: string,
  referenceImageUrls?: string[]
): Promise<StoredImage> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;
  const storagePath = fileName;

  // Convert base64 to blob
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, blob, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const { data: { user } } = await supabase.auth.getUser();
  const insertPayload: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    image_size: imageSize,
    storage_path: storagePath,
    file_name: fileName
  };
  if (user?.id) insertPayload.user_id = user.id;
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    insertPayload.reference_image_urls = referenceImageUrls;
  }

  // Insert metadata
  const { data: row, error: dbError } = await supabase
    .from('images')
    .insert(insertPayload)
    .select()
    .single();

  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`);
  }

  return {
    ...row,
    url: publicUrl
  };
}

/**
 * Save metadata only - image already in Supabase Storage (uploaded by backend)
 */
export async function saveImageMetadataToSupabase(
  storagePath: string,
  prompt: string,
  aspectRatio: string,
  imageSize: string,
  referenceImageUrls?: string[]
): Promise<StoredImage> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const { data: { user } } = await supabase.auth.getUser();
  const insertPayload: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    image_size: imageSize,
    storage_path: storagePath,
    file_name: storagePath,
  };
  if (user?.id) insertPayload.user_id = user.id;
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    insertPayload.reference_image_urls = referenceImageUrls;
  }

  const { data: row, error: dbError } = await supabase
    .from('images')
    .insert(insertPayload)
    .select()
    .single();

  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`);
  }

  return {
    ...row,
    url: publicUrl
  };
}

export type ImageScope = 'mine' | 'all';

const DEFAULT_PAGE_SIZE = 24;

export interface FetchImagesResult {
  images: StoredImage[];
  hasMore: boolean;
}

/**
 * Fetch images from Supabase (newest first), paginated to reduce egress.
 * scope: 'mine' = only current user's images, 'all' = everyone's images
 */
export async function fetchImagesFromSupabase(
  scope: ImageScope = 'mine',
  options?: { limit?: number; offset?: number }
): Promise<FetchImagesResult> {
  if (!supabase) {
    return { images: [], hasMore: false };
  }

  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  const baseSelect = 'id, created_at, user_id, prompt, aspect_ratio, image_size, storage_path, file_name';
  let rows: Record<string, unknown>[] | null = null;
  let error: Error | null = null;

  // Try with reference_image_urls first (requires migration)
  let query = supabase
    .from('images')
    .select(`${baseSelect}, reference_image_urls`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (scope === 'mine') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) query = query.eq('user_id', user.id);
  }
  const result1 = await query;
  if (!result1.error) {
    rows = (result1.data ?? null) as Record<string, unknown>[] | null;
  } else {
    // Fallback: column may not exist yet
    let query2 = supabase
      .from('images')
      .select(baseSelect, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (scope === 'mine') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) query2 = query2.eq('user_id', user.id);
    }
    const result2 = await query2;
    rows = (result2.data ?? null) as Record<string, unknown>[] | null;
    error = result2.error as Error | null;
  }

  if (error) {
    console.error('Failed to fetch images:', error);
    throw error;
  }

  if (!rows || rows.length === 0) {
    return { images: [], hasMore: false };
  }

  const client = supabase;
  if (!client) return { images: [], hasMore: false };

  const images = (rows || []).map((row) => {
    const r = row as { storage_path: string; [k: string]: unknown };
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(r.storage_path);

    return {
      ...r,
      url: urlData.publicUrl
    } as StoredImage;
  });

  const hasMore = rows.length === limit;

  return { images, hasMore };
}

const COST_PER_IMAGE = 0.05;

export interface ImageStats {
  totalImages: number;
  totalApiCalls: number;
  totalCost: number;
  monthlyOverview: { month: string; images: number; cost: number }[];
  recentActivity: { date: string; count: number; cost: number }[];
}

/**
 * Fetch stats derived from Supabase (source of truth for image count)
 */
export async function fetchStatsFromSupabase(): Promise<ImageStats> {
  if (!supabase) {
    return {
      totalImages: 0,
      totalApiCalls: 0,
      totalCost: 0,
      monthlyOverview: [],
      recentActivity: []
    };
  }

  const { data: rows, error } = await supabase
    .from('images')
    .select('id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch stats:', error);
    return {
      totalImages: 0,
      totalApiCalls: 0,
      totalCost: 0,
      monthlyOverview: [],
      recentActivity: []
    };
  }

  const images = rows || [];
  const totalImages = images.length;
  const totalCost = totalImages * COST_PER_IMAGE;

  const byMonth = new Map<string, { images: number; cost: number }>();
  const byDay = new Map<string, { count: number; cost: number }>();

  for (const img of images) {
    const date = new Date(img.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = date.toISOString().slice(0, 10);

    if (!byMonth.has(monthKey)) byMonth.set(monthKey, { images: 0, cost: 0 });
    const m = byMonth.get(monthKey)!;
    m.images += 1;
    m.cost += COST_PER_IMAGE;

    if (!byDay.has(dayKey)) byDay.set(dayKey, { count: 0, cost: 0 });
    const d = byDay.get(dayKey)!;
    d.count += 1;
    d.cost += COST_PER_IMAGE;
  }

  const monthlyOverview = Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => ({
      month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      images: data.images,
      cost: data.cost
    }));

  const recentActivity = Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10)
    .map(([dateStr, data]) => ({
      date: new Date(dateStr).toLocaleDateString('en-US', { dateStyle: 'medium' }),
      count: data.count,
      cost: data.cost
    }));

  return {
    totalImages,
    totalApiCalls: totalImages,
    totalCost,
    monthlyOverview,
    recentActivity
  };
}
