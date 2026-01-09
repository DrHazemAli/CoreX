/**
 * ============================================================================
 * COREX: Signup Form
 * Description: Client-side signup form with email/password and OAuth
 * ============================================================================
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Github, Mail, User, Eye, EyeOff, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains number", test: (p) => /\d/.test(p) },
];

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [showRequirements, setShowRequirements] = React.useState(false);

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const password = formData.get("password") as string;

    // Validate password
    const failedRequirements = passwordRequirements.filter(
      (req) => !req.test(password),
    );
    if (failedRequirements.length > 0) {
      setError("Password does not meet requirements");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Redirect to confirm email page
      router.push("/signup?message=Check your email to confirm your account");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignup = async () => {
    setIsOAuthLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
            onClick={handleGitHubSignup}
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
        <form onSubmit={handleEmailSignup} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Input
            name="fullName"
            type="text"
            label="Full Name"
            placeholder="John Doe"
            required
            autoComplete="name"
            leftIcon={<User className="h-4 w-4" />}
            disabled={isLoading || isOAuthLoading}
          />

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

          <div className="space-y-2">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={isLoading || isOAuthLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowRequirements(true)}
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

            {/* Password Requirements */}
            {showRequirements && password.length > 0 && (
              <div className="space-y-1 p-3 rounded-lg bg-secondary/50">
                {passwordRequirements.map((req, index) => {
                  const passed = req.test(password);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        passed
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {passed ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {req.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            loadingText="Creating account..."
            disabled={isOAuthLoading}
          >
            Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
