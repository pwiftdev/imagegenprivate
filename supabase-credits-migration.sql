-- Credits system migration
-- Run this in Supabase SQL Editor after supabase-profiles.sql
-- https://supabase.com/dashboard/project/_/sql

-- 1. Add credits column to profiles (new users get 20, existing users get 20)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 20;

-- 2. Ensure existing rows have credits (in case column existed without default)
UPDATE public.profiles SET credits = 20 WHERE credits IS NULL;

-- 3. Atomic deduct function for backend (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits integer;
BEGIN
  UPDATE public.profiles
  SET credits = credits - p_amount,
      updated_at = now()
  WHERE id = p_user_id
    AND credits >= p_amount
  RETURNING credits INTO new_credits;
  RETURN new_credits;
END;
$$;

-- Allow service role (backend) to call deduct_credits
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer) TO service_role;
