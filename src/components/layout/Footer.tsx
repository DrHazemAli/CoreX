/**
 * ============================================================================
 * COREX: Premium Footer Component
 * Description: Elegant footer with animations and visual effects
 * ============================================================================
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, Github, Twitter, Heart, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppOptional } from "@/contexts/AppContext";

// ============================================================================
// Footer Links
// ============================================================================

const footerLinks = {
  product: [
    { href: "/", label: "Home" },
    { href: "https://github.com/DrHazemAli/CoreX", label: "Repo" },
    { href: "https://github.com/DrHazemAli/CoreX/issues", label: "Issues" },
  ],
  resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/api", label: "API" },
    { href: "/changelog", label: "Changelog" },
  ],
  company: [
    { href: "/about", label: "About" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
};

// ============================================================================
// Animated Link Component
// ============================================================================

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http");

  const LinkComponent = isExternal ? "a" : Link;
  const linkProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
      <LinkComponent
        href={href}
        {...linkProps}
        className={cn(
          "group flex items-center gap-1 text-sm text-muted-foreground",
          "hover:text-foreground transition-colors",
        )}
      >
        <span>{children}</span>
        {isExternal && (
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </LinkComponent>
    </motion.div>
  );
}

// ============================================================================
// Footer Component
// ============================================================================

// eslint-disable-next-line sonarjs/cognitive-complexity -- UI component with multiple conditional renders
export function Footer() {
  const app = useAppOptional();
  const settings = app?.settings;

  return (
    <footer
      className={cn(
        "relative border-t border-border bg-background/50 backdrop-blur-sm",
        settings?.compactMode ? "py-8" : "py-12",
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid gap-8",
            settings?.compactMode
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-2 md:grid-cols-4 lg:gap-12",
          )}
        >
          {/* Brand */}
          <motion.div
            className="col-span-2 md:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 group">
              <motion.div
                className="relative"
                whileHover={{ rotate: 15 }}
                transition={{ duration: 0.2 }}
              >
                <Compass
                  className={cn(
                    "text-primary",
                    settings?.compactMode ? "h-5 w-5" : "h-6 w-6",
                  )}
                />
                {settings?.visualEffects && (
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </motion.div>
              <span
                className={cn(
                  "font-bold tracking-tight",
                  settings?.compactMode ? "text-lg" : "text-xl",
                )}
              >
                CoreX
              </span>
            </Link>
            <p
              className={cn(
                "mt-4 max-w-xs text-muted-foreground",
                settings?.compactMode ? "text-xs" : "text-sm",
              )}
            >
              Enterprise-grade foundation for scalable web apps, built with
              Next.js, React, and TypeScript.
            </p>

            {/* Social links */}
            <div className="mt-4 flex items-center gap-3">
              <motion.a
                href="https://github.com/DrHazemAli/CoreX"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-center rounded-xl",
                  "bg-secondary/50 hover:bg-secondary transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  settings?.compactMode ? "h-8 w-8" : "h-10 w-10",
                )}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="GitHub"
              >
                <Github
                  className={settings?.compactMode ? "h-4 w-4" : "h-5 w-5"}
                />
              </motion.a>
              <motion.a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-center rounded-xl",
                  "bg-secondary/50 hover:bg-secondary transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  settings?.compactMode ? "h-8 w-8" : "h-10 w-10",
                )}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Twitter"
              >
                <Twitter
                  className={settings?.compactMode ? "h-4 w-4" : "h-5 w-5"}
                />
              </motion.a>
            </div>
          </motion.div>

          {/* Product links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3
              className={cn(
                "font-semibold mb-4",
                settings?.compactMode ? "text-xs" : "text-sm",
              )}
            >
              Product
            </h3>
            <ul className={settings?.compactMode ? "space-y-2" : "space-y-3"}>
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3
              className={cn(
                "font-semibold mb-4",
                settings?.compactMode ? "text-xs" : "text-sm",
              )}
            >
              Resources
            </h3>
            <ul className={settings?.compactMode ? "space-y-2" : "space-y-3"}>
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3
              className={cn(
                "font-semibold mb-4",
                settings?.compactMode ? "text-xs" : "text-sm",
              )}
            >
              Company
            </h3>
            <ul className={settings?.compactMode ? "space-y-2" : "space-y-3"}>
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          className={cn(
            "border-t border-border",
            settings?.compactMode ? "mt-8 pt-6" : "mt-12 pt-8",
          )}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p
              className={cn(
                "text-muted-foreground flex items-center gap-1.5",
                settings?.compactMode ? "text-xs" : "text-sm",
              )}
            >
              © 2026 CoreX. Built with
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              </motion.span>
              by{" "}
              <a
                href="https://github.com/DrHazemAli/CoreX"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                Hazem Ali
              </a>
            </p>

            {/* Keyboard shortcut hint */}
            <p
              className={cn(
                "text-muted-foreground flex items-center gap-2",
                settings?.compactMode ? "text-xs" : "text-sm",
              )}
            >
              <span>Press</span>
              <kbd className="px-2 py-1 rounded-md bg-secondary text-xs font-mono">
                ⌘K
              </kbd>
              <span>to search</span>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

export default Footer;
