/**
 * ============================================================================
 * COREX: Dashboard Sidebar
 * Description: Navigation sidebar for dashboard
 * ============================================================================
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Settings, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Navigation sections for regular users.
 * Only includes routes that actually exist in the app.
 */
const userNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Account",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

/**
 * Admin navigation sections are intentionally omitted until
 * the admin pages are implemented. Add them back when ready:
 *
 * const adminNavSections: NavSection[] = [
 *   {
 *     title: "Admin",
 *     items: [
 *       { href: "/dashboard/admin", label: "Admin Dashboard", icon: Shield },
 *       { href: "/dashboard/admin/users", label: "Users", icon: Users },
 *       { href: "/dashboard/admin/jobs", label: "Jobs", icon: Activity },
 *       { href: "/dashboard/admin/system", label: "System", icon: Database },
 *     ],
 *   },
 * ];
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DashboardSidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  /**
   * Check admin access using centralized role utility.
   * This ensures consistent role checking across the application.
   * Use isAdmin when admin pages are implemented:
   *   import { hasAdminAccess } from "@/lib/auth/roles";
   *   const isAdmin = hasAdminAccess(role);
   */

  /**
   * For now, only show user sections since admin pages don't exist yet.
   * When admin pages are implemented, uncomment:
   *   const navSections = isAdmin ? [...userNavSections, ...adminNavSections] : userNavSections;
   */
  const navSections = userNavSections;

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-20 left-4 z-50 p-2 rounded-lg lg:hidden",
          "bg-background border border-border shadow-lg",
          "hover:bg-secondary transition-colors",
        )}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64",
          "bg-background border-r border-border",
          "transform transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <nav className="h-full overflow-y-auto p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg",
                          "text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
