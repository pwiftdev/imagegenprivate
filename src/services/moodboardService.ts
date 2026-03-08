/**
 * Moodboards: reusable sets of reference images for image generation.
 * Max ref images = generation max (6) - 1 = 5.
 */

import { supabase } from '../lib/supabase';
import { uploadReferenceImage } from './imageStorage';

export const MAX_MOODBOARD_IMAGES = 5;

export interface Moodboard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  reference_image_urls: string[];
  created_at: string;
}

export async function fetchMoodboards(userId: string): Promise<Moodboard[]> {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('moodboards')
    .select('id, user_id, name, description, reference_image_urls, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch moodboards:', error);
    throw error;
  }
  return (data ?? []).map((r) => ({
    ...r,
    reference_image_urls: Array.isArray(r.reference_image_urls) ? r.reference_image_urls : [],
  })) as Moodboard[];
}

export async function createMoodboard(
  userId: string,
  name: string,
  description: string | null,
  referenceImageUrls: string[]
): Promise<Moodboard> {
  if (!supabase || !userId) throw new Error('Not authenticated');
  const trimmed = name.trim() || 'Untitled moodboard';
  const urls = referenceImageUrls.slice(0, MAX_MOODBOARD_IMAGES);
  const { data, error } = await supabase
    .from('moodboards')
    .insert({ user_id: userId, name: trimmed, description: description?.trim() || null, reference_image_urls: urls })
    .select()
    .single();
  if (error) throw error;
  return { ...data, reference_image_urls: data.reference_image_urls ?? [] } as Moodboard;
}

export async function updateMoodboard(
  moodboardId: string,
  userId: string,
  updates: { name?: string; description?: string | null; reference_image_urls?: string[] }
): Promise<Moodboard> {
  if (!supabase) throw new Error('Supabase not configured');
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim() || 'Untitled moodboard';
  if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
  if (updates.reference_image_urls !== undefined) {
    payload.reference_image_urls = updates.reference_image_urls.slice(0, MAX_MOODBOARD_IMAGES);
  }
  const { data, error } = await supabase
    .from('moodboards')
    .update(payload)
    .eq('id', moodboardId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return { ...data, reference_image_urls: data.reference_image_urls ?? [] } as Moodboard;
}

export async function deleteMoodboard(moodboardId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('moodboards')
    .delete()
    .eq('id', moodboardId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Upload reference images and return public URLs for use in a moodboard.
 */
export async function uploadMoodboardImages(base64DataUrls: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const dataUrl of base64DataUrls.slice(0, MAX_MOODBOARD_IMAGES)) {
    const url = await uploadReferenceImage(dataUrl);
    urls.push(url);
  }
  return urls;
}
