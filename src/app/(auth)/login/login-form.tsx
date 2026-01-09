/**
 * ============================================================================
 * COREX: Login Form
 * Description: Client-side login form with email/password and OAuth
 * ============================================================================
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Github, Mail, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push(redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsOAuthLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectQuery = redirectTo
        ? `?redirect=${encodeURIComponent(redirectTo)}`
        : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${redirectQuery}`,
          scopes: "read:user user:email",
        },
      });

      if (error) {
        setError(error.message);
        setIsOAuthLoading(false);
      }
    } catch {
      setError("An unexpected error occurred");
      setIsOAuthLoading(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardContent className="p-0">
        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGitHubLogin}
            disabled={isOAuthLoading || isLoading}
            leftIcon={
              isOAuthLoading ? undefined : <Github className="h-5 w-5" />
            }
            isLoading={isOAuthLoading}
            loadingText="Connecting..."
          >
            Continue with GitHub
          </Button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={isLoading || isOAuthLoading}
          />

          <div className="space-y-1.5">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading || isOAuthLoading}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            loadingText="Signing in..."
            disabled={isOAuthLoading}
          >
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
