/**
 * ============================================================================
 * COREX: Reset Password Page
 * Description: Set new password after reset
 * ============================================================================
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set your new password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be authenticated (via reset link) to access this page
  if (!user) {
    redirect(
      "/forgot-password?message=Please request a new password reset link",
    );
  }

  const params = await searchParams;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Set new password</h1>
        <p className="text-muted-foreground mt-2">
          Enter your new password below
        </p>
      </div>

      {params.message && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {params.message}
        </div>
      )}

      <ResetPasswordForm />
    </div>
  );
}
