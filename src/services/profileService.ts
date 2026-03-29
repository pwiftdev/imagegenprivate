/**
 * Profile service - fetch/update user profile (username, avatar)
 */

import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  credits: number;
  stripe_customer_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

const AVATARS_BUCKET = 'generated-images';
const AVATARS_PATH_PREFIX = 'avatars/';

// In-memory cache for profile lookups (avoids refetching on load more / filter)
const profileCache = new Map<string, { username: string; avatar_url: string | null }>();

export async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, { username: string; avatar_url: string | null }>> {
  const map = new Map<string, { username: string; avatar_url: string | null }>();
  if (!supabase || userIds.length === 0) return map;

  const unique = [...new Set(userIds.filter(Boolean))] as string[];
  const toFetch = unique.filter((id) => !profileCache.has(id));

  // Return cached for all requested
  for (const id of unique) {
    const cached = profileCache.get(id);
    if (cached) map.set(id, cached);
  }

  if (toFetch.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', toFetch);

  if (error) return map;
  for (const p of data || []) {
    const entry = { username: p.username || 'Creator', avatar_url: p.avatar_url };
    profileCache.set(p.id, entry);
    map.set(p.id, entry);
  }
  return map;
}

export interface CreditPurchase {
  id: string;
  credits: number;
  amount_cents: number;
  currency: string;
  plan_name: string | null;
  created_at: string;
}

export async function fetchPurchases(userId: string): Promise<CreditPurchase[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('credit_purchases')
    .select('id, credits, amount_cents, currency, plan_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, credits, stripe_customer_id, subscription_plan, subscription_status, subscription_current_period_end, created_at, updated_at')
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

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function createPortalSession(userId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/stripe/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create portal session' }));
    throw new Error(err.error || 'Failed to create portal session');
  }
  const data = (await res.json()) as { url: string };
  return data.url;
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
