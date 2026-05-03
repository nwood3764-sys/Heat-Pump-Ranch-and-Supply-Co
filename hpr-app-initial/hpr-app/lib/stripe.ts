import Stripe from "stripe";

/**
 * Server-side Stripe client. NEVER import this in client components.
 * Uses the secret key from environment variables.
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, {
    typescript: true,
  });
}

/**
 * Credit card surcharge constants.
 * Stripe charges 2.9% + $0.30 per successful domestic card transaction.
 * We pass this through to the customer when they choose to pay by card.
 */
export const CC_SURCHARGE_RATE = 0.029;
export const CC_SURCHARGE_FLAT = 0.30;

/**
 * Calculate the credit card processing fee for a given subtotal.
 * Uses the formula: (subtotal + flat) / (1 - rate) - subtotal
 * This ensures the surcharge covers itself (since Stripe also charges on the surcharge amount).
 */
export function calculateCCSurcharge(subtotal: number): number {
  const total = (subtotal + CC_SURCHARGE_FLAT) / (1 - CC_SURCHARGE_RATE);
  return Math.round((total - subtotal) * 100) / 100;
}
