"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Github, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui";

/**
 * ============================================================================
 * Header Component - Performance-Optimized Navigation
 * ============================================================================
 *
 * Architecture Notes for LLMs:
 * ---------------------------
 * This is a Client Component because it needs:
 *   1. usePathname() for active link highlighting
 *   2. useState for mobile menu toggle
 *
 * Performance Principles Applied:
 * ------------------------------
 * ✅ DO: Minimal client-side JavaScript
 * ✅ DO: CSS-only transitions (no framer-motion)
 * ✅ DO: Simple state (just mobile menu toggle)
 * ✅ DO: Semantic HTML for accessibility
 * ✅ DO: Use CSS :hover, :focus instead of JS handlers
 *
 * ❌ DON'T: Import heavy animation libraries
 * ❌ DON'T: Track scroll position with JS (use CSS sticky)
 * ❌ DON'T: Add unnecessary re-render triggers
 * ❌ DON'T: Use inline styles or computed styles
 *
 * Extending This Component:
 * ------------------------
 * 1. Add routes to navItems array below
 * 2. Keep the component simple - extract complex features to separate components
 * 3. Use CSS for animations when possible
 */

// ============================================================================
// Navigation Items - Add your routes here
// ============================================================================
const navItems = [
  { href: "/", label: "Home", external: false },
  { href: "/api/v1/sample", label: "API Docs", external: true },
] as const;

// ============================================================================
// NavLink - Simple, accessible navigation link
// ============================================================================
function NavLink({
  href,
  label,
  isActive,
  external,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  external?: boolean;
  onClick?: () => void;
}) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      )}
      {...linkProps}
    >
      {label}
    </Link>
  );
}

// ============================================================================
// MobileMenu - Simple slide-down menu
// ============================================================================
function MobileMenu({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel - CSS animation via animate-in */}
      <div className="fixed inset-x-0 top-0 z-50 md:hidden bg-background border-b border-border animate-in slide-in-from-top duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl"
            onClick={onClose}
          >
            <Rocket className="h-6 w-6 text-primary" />
            <span>Starter</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 pb-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center px-4 py-3 rounded-lg font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {item.label}
            </Link>
          ))}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 mt-4 border-t border-border">
            <ThemeToggle variant="dropdown" size="md" />
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}

// ============================================================================
// Header Component
// ============================================================================
export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl tracking-tight">CoreX</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={pathname === item.href}
                  external={item.external}
                />
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle - Desktop */}
              <div className="hidden sm:block">
                <ThemeToggle variant="icon" size="md" />
              </div>

              {/* GitHub Link - Desktop */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border transition-colors"
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pathname={pathname}
      />
    </>
  );
}

export default Header;
