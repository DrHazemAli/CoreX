/**
 * ============================================================================
 * COREX: Auth Callback Route
 * Description: Handle OAuth and email confirmation callbacks
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect");
  const next = redirect || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Use service client to bypass RLS for profile creation
      const serviceClient = createServiceClient();

      // Check if profile exists
      const { data: existingProfile } = await serviceClient
        .from("user_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .single();

      if (!existingProfile) {
        // Create profile with service role (bypasses RLS)
        const { error: profileError } = await serviceClient
          .from("user_profiles")
          .insert({
            user_id: data.user.id,
            email: data.user.email || "",
            full_name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
          });

        if (profileError) {
          console.error("Failed to create user profile:", profileError);
        }
      }

      // Successful authentication
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error - redirect to login with error message
  return NextResponse.redirect(
    `${origin}/login?message=Authentication failed. Please try again.`,
  );
}
