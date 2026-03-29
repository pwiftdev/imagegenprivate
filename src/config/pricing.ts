/**
 * Stripe Buy Button IDs for each plan.
 * The buy-button web component passes client-reference-id={userId} so the
 * webhook knows which user to credit.
 */

export const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51OCL6dIy7MDihOoSBXzhKrSEmhw7dINdMibJM95BrrQjRUSoQMneLhLeyBCbcfdVQp4BZ2BopD1d52E2MVVscnz700vM0hq7dI';

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    credits: 200,
    perCredit: '$0.095',
    buyButtonId: 'buy_btn_1TGHGbIy7MDihOoSZmEDBI5U',
    popular: false,
  },
  {
    id: 'kreator',
    name: 'Kreator ⭐',
    price: 35,
    credits: 400,
    perCredit: '$0.0875',
    buyButtonId: 'buy_btn_1TGHJiIy7MDihOoS2mPNG9q4',
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 85,
    credits: 1000,
    perCredit: '$0.085',
    buyButtonId: 'buy_btn_1TGH6yIy7MDihOoSxgsnjCkQ',
    popular: false,
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];
