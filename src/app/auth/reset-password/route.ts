/**
 * ============================================================================
 * COREX: Reset Password Callback
 * Description: Handle password reset token and redirect to reset page
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the reset password page
      return NextResponse.redirect(`${origin}/reset-password`);
    }
  }

  // Error - redirect to forgot password
  return NextResponse.redirect(
    `${origin}/forgot-password?message=Invalid or expired reset link`,
  );
}
