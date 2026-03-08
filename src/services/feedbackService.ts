/**
 * Feedback: user feedback sent to devs, stored in Supabase.
 */

import { supabase } from '../lib/supabase';

export interface FeedbackInput {
  message: string;
  email?: string;
}

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const trimmed = input.message.trim();
  if (!trimmed) throw new Error('Message is required');

  const { data: { user } } = await supabase.auth.getUser();

  const payload: Record<string, unknown> = {
    message: trimmed,
  };
  if (user?.id) payload.user_id = user.id;
  if (input.email?.trim()) payload.email = input.email.trim();

  const { error } = await supabase.from('feedback').insert(payload);

  if (error) {
    console.error('Feedback insert error:', error);
    throw new Error('Failed to send feedback. Please try again.');
  }
}
