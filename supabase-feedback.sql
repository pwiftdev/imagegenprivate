-- Run in Supabase SQL Editor.
-- Feedback: user feedback sent to devs.

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- RLS: anyone can insert feedback; only service role can read (for devs in dashboard)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow insert from anonymous and authenticated users
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
CREATE POLICY "Anyone can insert feedback"
ON public.feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);
