-- Run in Supabase SQL Editor.
-- Adds folders (projects) for organizing images. "My Kreations" = images with folder_id IS NULL.

-- 1. Folders table (one per user per project)
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add folder_id to images (NULL = "My Kreations", else belongs to that folder)
ALTER TABLE public.images
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_images_folder_id ON public.images(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);

-- 3. RLS: users can only see and manage their own folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

CREATE POLICY "Users can select own folders"
ON public.folders FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
ON public.folders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
ON public.folders FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
ON public.folders FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4. Images: ensure folder_id (if set) belongs to the current user
-- Existing policies stay; we only need to allow insert/update with folder_id in user's folders.
-- Postgres: (folder_id IS NULL OR folder_id IN (SELECT id FROM folders WHERE user_id = auth.uid()))
DROP POLICY IF EXISTS "Users can insert own images" ON public.images;
CREATE POLICY "Users can insert own images"
ON public.images FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (folder_id IS NULL OR EXISTS (SELECT 1 FROM public.folders f WHERE f.id = folder_id AND f.user_id = auth.uid()))
);

-- Allow update (e.g. move to folder) and delete own images
CREATE POLICY "Users can update own images"
ON public.images FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (folder_id IS NULL OR EXISTS (SELECT 1 FROM public.folders f WHERE f.id = folder_id AND f.user_id = auth.uid()))
);

CREATE POLICY "Users can delete own images"
ON public.images FOR DELETE TO authenticated
USING (auth.uid() = user_id);
