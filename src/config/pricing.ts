/**
 * Stripe Payment Links for each plan.
 * Each button opens Stripe's hosted checkout with ?client_reference_id={userId}.
 */

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    credits: 200,
    perCredit: '$0.095',
    paymentLink: 'https://buy.stripe.com/4gMeVe15b8s4aicakC0oM00',
    popular: false,
  },
  {
    id: 'kreator',
    name: 'Kreator ⭐',
    price: 35,
    credits: 400,
    perCredit: '$0.0875',
    paymentLink: 'https://buy.stripe.com/eVq00k6pv37K4XS3We0oM01',
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 85,
    credits: 1000,
    perCredit: '$0.085',
    paymentLink: 'https://buy.stripe.com/8x25kEbJP8s4eyseAS0oM02',
    popular: false,
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];

export function getCheckoutUrl(paymentLink: string, userId: string): string {
  const sep = paymentLink.includes('?') ? '&' : '?';
  return `${paymentLink}${sep}client_reference_id=${encodeURIComponent(userId)}`;
}
