/**
 * ============================================================================
 * COREX: User Settings Page
 * Description: User profile and settings management
 * ============================================================================
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { DangerZone } from "./danger-zone";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  const userProfile = {
    id: user?.id || "",
    email: user?.email || "",
    fullName: profile?.full_name || user?.user_metadata?.full_name || "",
    avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || "",
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <SettingsForm profile={userProfile} />

      <DangerZone />
    </div>
  );
}
