-- Run this in Supabase SQL Editor to fix "images not loading on reload".
-- Supabase enables RLS by default, which blocks SELECT until policies exist.
-- Upload works because storage has its own policies; the images table needs these.

-- Option A: Add policies (recommended)
create policy "Allow anon to insert images"
on public.images for insert to anon with check (true);

create policy "Allow anon to select images"
on public.images for select to anon using (true);

-- Option B: If policies fail (e.g. "policy already exists"), disable RLS on images:
-- alter table public.images disable row level security;
