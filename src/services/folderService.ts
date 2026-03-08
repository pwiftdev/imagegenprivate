/**
 * Folders (projects) for organizing images.
 * "My Kreations" = folder_id null. Other folders = user-created projects.
 */

import { supabase } from '../lib/supabase';

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export async function fetchFolders(userId: string): Promise<Folder[]> {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('folders')
    .select('id, user_id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to fetch folders:', error);
    throw error;
  }
  return (data ?? []) as Folder[];
}

export async function createFolder(userId: string, name: string): Promise<Folder> {
  if (!supabase || !userId) throw new Error('Not authenticated');
  const trimmed = name.trim() || 'Untitled project';
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: userId, name: trimmed })
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function updateFolder(folderId: string, userId: string, name: string): Promise<Folder> {
  if (!supabase) throw new Error('Supabase not configured');
  const trimmed = name.trim() || 'Untitled project';
  const { data, error } = await supabase
    .from('folders')
    .update({ name: trimmed })
    .eq('id', folderId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function deleteFolder(folderId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId);
  if (error) throw error;
}
