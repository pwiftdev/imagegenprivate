-- Thumbnail path for grid (backend creates thumb at upload time)
-- Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS thumb_storage_path text;
