/**
 * Profile service - fetch/update user profile (username, avatar)
 */

import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  credits: number;
  created_at: string;
  updated_at: string;
}

const AVATARS_BUCKET = 'generated-images';
const AVATARS_PATH_PREFIX = 'avatars/';

export async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, { username: string; avatar_url: string | null }>> {
  const map = new Map<string, { username: string; avatar_url: string | null }>();
  if (!supabase || userIds.length === 0) return map;

  const unique = [...new Set(userIds.filter(Boolean))];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', unique);

  if (error) return map;
  for (const p of data || []) {
    map.set(p.id, {
      username: p.username || 'Creator',
      avatar_url: p.avatar_url,
    });
  }
  return map;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, credits, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  userId: string,
  updates: { username?: string; avatar_url?: string }
): Promise<Profile> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const ext = file.type.includes('png') ? 'png' : 'jpg';
  const path = `${AVATARS_PATH_PREFIX}${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
      cacheControl: '31536000', // 1 year - reduce repeated downloads from CDN
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
