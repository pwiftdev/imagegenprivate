-- Run these in Supabase SQL Editor.
-- Enables auth and per-user image scoping.

-- 1. Add user_id column to images (run if column doesn't exist)
alter table public.images add column if not exists user_id uuid references auth.users(id);

-- 2. Drop old anon policies if they exist (for migration from anon to auth)
drop policy if exists "Allow anon to insert images" on public.images;
drop policy if exists "Allow anon to select images" on public.images;

-- 3. Auth-based RLS: users see and insert only their own images
create policy "Users can insert own images"
on public.images for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can select own images"
on public.images for select to authenticated
using (auth.uid() = user_id);

create policy "Users can view all images in gallery"
on public.images for select to authenticated
using (true);

-- 4. Storage policies for generated-images bucket (run if bucket already exists)
-- If bucket doesn't exist, create it in Dashboard: Storage > New bucket > "generated-images" > Public
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Anyone can view images" on storage.objects;
create policy "Authenticated users can upload images"
on storage.objects for insert to authenticated
with check (bucket_id = 'generated-images');
create policy "Anyone can view images"
on storage.objects for select
using (bucket_id = 'generated-images');
