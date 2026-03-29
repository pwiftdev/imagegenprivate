-- Stripe payment integration migration
-- Run this in Supabase SQL Editor after supabase-credits-migration.sql

-- 1. Credit purchases log table
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  credits integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  stripe_session_id text UNIQUE NOT NULL,
  plan_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only read their own purchases
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.credit_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (backend webhook) inserts via SECURITY DEFINER function below

-- 2. Atomic add_credits function (mirrors deduct_credits)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits integer;
BEGIN
  UPDATE public.profiles
  SET credits = credits + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING credits INTO new_credits;

  IF new_credits IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;

  RETURN new_credits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer) TO service_role;

-- 3. Function to log a purchase (called by backend webhook)
CREATE OR REPLACE FUNCTION public.log_credit_purchase(
  p_user_id uuid,
  p_credits integer,
  p_amount_cents integer,
  p_currency text,
  p_stripe_session_id text,
  p_plan_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purchase_id uuid;
BEGIN
  INSERT INTO public.credit_purchases (user_id, credits, amount_cents, currency, stripe_session_id, plan_name)
  VALUES (p_user_id, p_credits, p_amount_cents, p_currency, p_stripe_session_id, p_plan_name)
  RETURNING id INTO purchase_id;

  RETURN purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_credit_purchase(uuid, integer, integer, text, text, text) TO service_role;
