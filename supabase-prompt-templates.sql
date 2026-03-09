-- Run in Supabase SQL Editor.
-- Saved prompts with handles for @ mention in control panel (e.g. @lens40).

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  prompt_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, handle)
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id ON public.prompt_templates(user_id);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own prompt_templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Users can insert own prompt_templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Users can update own prompt_templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Users can delete own prompt_templates" ON public.prompt_templates;

CREATE POLICY "Users can select own prompt_templates"
ON public.prompt_templates FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt_templates"
ON public.prompt_templates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt_templates"
ON public.prompt_templates FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt_templates"
ON public.prompt_templates FOR DELETE TO authenticated
USING (auth.uid() = user_id);
