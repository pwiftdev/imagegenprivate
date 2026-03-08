-- Run in Supabase SQL Editor.
-- Moodboards: sets of reference images for reuse in image generation.

-- 1. Moodboards table
CREATE TABLE IF NOT EXISTS public.moodboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  reference_image_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodboards_user_id ON public.moodboards(user_id);

-- 2. RLS: users can only see and manage their own moodboards
ALTER TABLE public.moodboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own moodboards" ON public.moodboards;
DROP POLICY IF EXISTS "Users can insert own moodboards" ON public.moodboards;
DROP POLICY IF EXISTS "Users can update own moodboards" ON public.moodboards;
DROP POLICY IF EXISTS "Users can delete own moodboards" ON public.moodboards;

CREATE POLICY "Users can select own moodboards"
ON public.moodboards FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moodboards"
ON public.moodboards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moodboards"
ON public.moodboards FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own moodboards"
ON public.moodboards FOR DELETE TO authenticated
USING (auth.uid() = user_id);
