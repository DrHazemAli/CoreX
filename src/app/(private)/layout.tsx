/**
 * ============================================================================
 * COREX: Dashboard Layout
 * Description: Protected layout for authenticated user dashboard
 * ============================================================================
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "./components/sidebar";
import { DashboardHeader } from "./components/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login?message=Please sign in to access the dashboard");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const userProfile = {
    id: user.id,
    email: user.email || "",
    fullName: profile?.full_name || user.user_metadata?.full_name || "User",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
    role: profile?.role || "user",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <DashboardHeader user={userProfile} />

      <div className="flex">
        {/* Sidebar */}
        <DashboardSidebar role={userProfile.role} />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
