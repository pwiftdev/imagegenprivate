/**
 * Supabase storage for generated images
 */

import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'generated-images';

export interface StoredImage {
  id: string;
  created_at: string;
  prompt: string | null;
  aspect_ratio: string | null;
  image_size: string | null;
  storage_path: string;
  file_name: string | null;
  url: string; // Public URL for display
}

/**
 * Upload base64 image to Supabase Storage and save metadata to DB
 */
export async function saveImageToSupabase(
  base64Data: string,
  prompt: string,
  aspectRatio: string,
  imageSize: string
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

  // Insert metadata
  const { data: row, error: dbError } = await supabase
    .from('images')
    .insert({
      prompt,
      aspect_ratio: aspectRatio,
      image_size: imageSize,
      storage_path: storagePath,
      file_name: fileName
    })
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
 * Fetch all images from Supabase (newest first)
 */
export async function fetchImagesFromSupabase(): Promise<StoredImage[]> {
  if (!supabase) {
    return [];
  }

  const { data: rows, error } = await supabase
    .from('images')
    .select('id, created_at, prompt, aspect_ratio, image_size, storage_path, file_name')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch images:', error);
    throw error;
  }

  if (!rows || rows.length === 0) {
    return [];
  }

  const client = supabase;
  if (!client) return [];

  // Build public URLs for each image
  return (rows || []).map((row) => {
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(row.storage_path);

    return {
      ...row,
      url: urlData.publicUrl
    };
  });
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
