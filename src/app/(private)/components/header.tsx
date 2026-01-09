/**
 * ============================================================================
 * COREX: Dashboard Header
 * Description: Header with user menu for dashboard pages
 * ============================================================================
 */

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Compass,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { isFullAdmin } from "@/lib/auth/roles";

interface DashboardHeaderProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: string;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isAdmin = isFullAdmin(user.role);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-foreground"
        >
          <Compass className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">Discover</span>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Back to main site */}
          <Link
            href="/"
            className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-sm text-muted-foreground hover:text-foreground",
              "hover:bg-secondary transition-colors",
            )}
          >
            Back to site
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg",
                "hover:bg-secondary transition-colors",
                isMenuOpen && "bg-secondary",
              )}
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.fullName}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isMenuOpen && "rotate-180",
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-2 w-64",
                  "bg-background border border-border rounded-lg shadow-lg",
                  "py-2 z-50",
                )}
              >
                {/* User Info */}
                <div className="px-4 py-2 border-b border-border">
                  <p className="font-medium text-foreground truncate">
                    {user.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      <Shield className="h-3 w-3" />
                      {user.role}
                    </span>
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Compass className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/dashboard/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>

                {/* Sign Out */}
                <div className="border-t border-border pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
