import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  // Don't throw at import time in dev — checkout route guards on this instead,
  // so the catalogue still renders without Stripe configured.
  console.warn("[stripe] STRIPE_SECRET_KEY not set — checkout is disabled.");
}

// Pin to the SDK's bundled API version to avoid drift between deploys.
export const stripe = key ? new Stripe(key) : null;

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  }
  return stripe;
}
