/**
 * Subscription plans.
 * Payment Links point to Stripe subscription checkout with ?client_reference_id={userId}.
 * Update the paymentLink URLs after creating subscription products in Stripe Dashboard.
 */

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For first-time AI content creators',
    price: 11,
    period: '/mo',
    credits: 100,
    perCredit: '$0.11',
    paymentLink: 'https://buy.stripe.com/aFa8wQg059w83TO1O60oM03',
    popular: false,
    badge: null,
  },
  {
    id: 'kreator',
    name: 'Kreator',
    description: 'For consistent AI content creators',
    price: 39,
    period: '/mo',
    credits: 500,
    perCredit: '$0.078',
    paymentLink: 'https://buy.stripe.com/fZucN6eW1gYAduoboG0oM04',
    popular: true,
    badge: 'Most popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For studios and production teams',
    price: 95,
    period: '/mo',
    credits: 1500,
    perCredit: '$0.063',
    paymentLink: 'https://buy.stripe.com/9B6aEY29f8s49e89gy0oM05',
    popular: false,
    badge: 'Best value',
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];

export function getCheckoutUrl(paymentLink: string, userId: string): string {
  const sep = paymentLink.includes('?') ? '&' : '?';
  return `${paymentLink}${sep}client_reference_id=${encodeURIComponent(userId)}`;
}
