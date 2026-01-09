import { createBrowserClient } from "@supabase/ssr";
import { isAuthEnabled, isSupabaseConfigured } from "@/lib/config";

/**
 * Create a Supabase browser client
 *
 * @throws {Error} When auth is disabled or Supabase is not configured
 */
export function createClient() {
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    throw new Error(
      "Supabase auth is disabled or not configured. " +
        "Set NEXT_PUBLIC_ENABLE_AUTH=1 and configure Supabase credentials.",
    );
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
