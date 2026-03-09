/**
 * Saved prompts with handles for @ mention in the control panel (e.g. @lens40).
 */

import { supabase } from '../lib/supabase';

/** Shape used for both default and user prompts (id optional for display). */
export interface PromptTemplateRow {
  id: string;
  handle: string;
  prompt_text: string;
}

/** Default prompts every user can see and use via @ in the control panel. */
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplateRow[] = [
  { id: 'default-85mm-portrait', handle: '85mm-portrait', prompt_text: 'shot on 85mm lens, shallow depth of field, creamy bokeh, professional portrait photography' },
  { id: 'default-wide-angle', handle: 'wide-angle', prompt_text: 'shot on 24mm wide-angle lens, expansive perspective, cinematic composition' },
  { id: 'default-macro', handle: 'macro', prompt_text: 'macro photography, extreme close-up, 100mm macro lens, ultra detailed textures' },
  { id: 'default-telephoto', handle: 'telephoto', prompt_text: 'shot on 200mm telephoto lens, compressed background, cinematic framing' },
  { id: 'default-fisheye', handle: 'fisheye', prompt_text: 'fisheye lens, ultra wide distortion, dynamic perspective' },
  { id: 'default-cinematic-light', handle: 'cinematic-light', prompt_text: 'cinematic lighting, dramatic shadows, volumetric light beams' },
  { id: 'default-golden-hour', handle: 'golden-hour', prompt_text: 'golden hour lighting, warm sunlight, soft glowing highlights' },
  { id: 'default-studio-light', handle: 'studio-light', prompt_text: 'professional studio lighting, softbox lighting, evenly lit subject' },
  { id: 'default-neon-light', handle: 'neon-light', prompt_text: 'neon lighting, vibrant glow, cyberpunk atmosphere' },
  { id: 'default-rim-light', handle: 'rim-light', prompt_text: 'rim lighting, glowing edge light, dramatic silhouette highlights' },
];

export interface PromptTemplate {
  id: string;
  user_id: string;
  handle: string;
  prompt_text: string;
  created_at: string;
}

/** Normalize handle: lowercase, no @, no spaces (for storage and matching). */
export function normalizeHandle(handle: string): string {
  return handle.replace(/^@?\s*/, '').replace(/\s+/g, '').toLowerCase();
}

export async function fetchPromptTemplates(userId: string): Promise<PromptTemplate[]> {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('id, user_id, handle, prompt_text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch prompt templates:', error);
    throw error;
  }
  return (data ?? []) as PromptTemplate[];
}

export async function createPromptTemplate(
  userId: string,
  handle: string,
  promptText: string
): Promise<PromptTemplate> {
  if (!supabase || !userId) throw new Error('Not authenticated');
  const normalized = normalizeHandle(handle);
  if (!normalized) throw new Error('Handle is required');
  const { data, error } = await supabase
    .from('prompt_templates')
    .insert({
      user_id: userId,
      handle: normalized,
      prompt_text: promptText.trim() || '',
    })
    .select()
    .single();
  if (error) throw error;
  return data as PromptTemplate;
}

export async function updatePromptTemplate(
  id: string,
  userId: string,
  updates: { handle?: string; prompt_text?: string }
): Promise<PromptTemplate> {
  if (!supabase) throw new Error('Supabase not configured');
  const payload: Record<string, unknown> = {};
  if (updates.handle !== undefined) {
    const normalized = normalizeHandle(updates.handle);
    if (!normalized) throw new Error('Handle is required');
    payload.handle = normalized;
  }
  if (updates.prompt_text !== undefined) payload.prompt_text = updates.prompt_text.trim() ?? '';
  const { data, error } = await supabase
    .from('prompt_templates')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as PromptTemplate;
}

export async function deletePromptTemplate(id: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('prompt_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}
