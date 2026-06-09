import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side Supabase client using the service-role key. Use ONLY in server
 * code (route handlers, server actions). Never import into a client component.
 */
export function supabaseAdmin() {
  if (!url || !serviceRole) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}
