import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAuthEnabled, isSupabaseConfigured } from "@/lib/config";

/**
 * Create a Supabase server client for authenticated requests
 *
 * @throws {Error} When auth is disabled or Supabase is not configured
 */
export async function createClient() {
  if (!isAuthEnabled() || !isSupabaseConfigured()) {
    throw new Error(
      "Supabase auth is disabled or not configured. " +
        "Set NEXT_PUBLIC_ENABLE_AUTH=1 and configure Supabase credentials.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/**
 * Create a Supabase client with service role key
 * Use this for admin operations that bypass RLS
 *
 * @throws {Error} When Supabase is not configured
 */
export function createServiceClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
