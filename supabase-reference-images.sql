-- Run in Supabase SQL Editor to store reference image URLs with each generated image
-- Enables "Re-run" to restore prompt + refs used for that generation

ALTER TABLE public.images
ADD COLUMN IF NOT EXISTS reference_image_urls text[] DEFAULT '{}';

-- Optional: index for queries (usually not needed)
-- CREATE INDEX IF NOT EXISTS idx_images_reference_urls ON public.images USING GIN (reference_image_urls);
