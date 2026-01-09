/**
 * ============================================================================
 * COREX: Settings Form
 * Description: Client-side form for updating user settings
 * ============================================================================
 */

"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Mail, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface SettingsFormProps {
  profile: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string;
  };
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fullName, setFullName] = React.useState(profile.fullName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (authError) throw authError;

      // Update profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ full_name: fullName })
        .eq("user_id", profile.id);

      if (profileError) throw profileError;

      setSuccess("Profile updated successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="default" padding="lg">
      <CardHeader className="pb-4">
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.fullName}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                Avatar is synced from your GitHub account
              </p>
            </div>
          </div>

          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            leftIcon={<User className="h-4 w-4" />}
            disabled={isLoading}
          />

          <Input
            label="Email"
            value={profile.email}
            disabled
            leftIcon={<Mail className="h-4 w-4" />}
            helperText="Email cannot be changed"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            loadingText="Saving..."
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
