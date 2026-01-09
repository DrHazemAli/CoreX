/**
 * ============================================================================
 * COREX: Forgot Password Page
 * Description: Password reset request form
 * ============================================================================
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Discover account password",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; success?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect if already logged in
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reset password</h1>
        <p className="text-muted-foreground mt-2">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {params.message && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {params.message}
        </div>
      )}

      {params.success && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm text-center">
          {params.success}
        </div>
      )}

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
