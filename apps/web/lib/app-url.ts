/**
 * Resolve the app's public base URL across environments:
 *   1. NEXT_PUBLIC_APP_URL if explicitly set (best — use your real domain)
 *   2. VERCEL_URL at runtime (auto-set by Vercel on every deployment)
 *   3. localhost for local dev
 *
 * Used for Stripe success/cancel redirects so deploys work without manual config.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
