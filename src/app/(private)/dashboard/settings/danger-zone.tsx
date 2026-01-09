/**
 * ============================================================================
 * COREX: Danger Zone
 * Description: Account deletion and other dangerous actions
 * ============================================================================
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function DangerZone() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;

    setIsDeleting(true);
    setError(null);

    try {
      // In a real app, you'd call an API endpoint that handles account deletion
      // This would delete user data and then the auth user
      setError(
        "Account deletion requires admin action. Please contact support.",
      );
    } catch {
      setError("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card variant="default" padding="lg" className="border-destructive/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        {/* Sign out from all devices */}
        <div>
          <h3 className="font-medium text-foreground">Sign out everywhere</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sign out from all devices and sessions
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleSignOut}
          >
            Sign out from all devices
          </Button>
        </div>

        {/* Delete Account */}
        <div className="border-t border-border pt-6">
          <h3 className="font-medium text-foreground">Delete Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          {!showConfirm ? (
            <Button
              variant="danger"
              size="sm"
              className="mt-3"
              onClick={() => setShowConfirm(true)}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete Account
            </Button>
          ) : (
            <div className="mt-4 space-y-3 p-4 rounded-lg bg-destructive/10">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}
              <p className="text-sm text-destructive font-medium">
                Type DELETE to confirm account deletion
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                disabled={isDeleting}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText("");
                    setError(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== "DELETE" || isDeleting}
                  isLoading={isDeleting}
                  loadingText="Deleting..."
                >
                  Permanently Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
