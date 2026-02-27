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
