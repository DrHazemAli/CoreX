/**
 * ============================================================================
 * COREX: Theme Toggle
 * Description: Advanced theme toggle with animations and visual feedback
 * ============================================================================
 */

"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ThemeToggleProps {
  variant?: "icon" | "switch" | "dropdown";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// ============================================================================
// Icon Theme Toggle
// ============================================================================

function IconToggle({
  size = "md",
  className,
}: Pick<ThemeToggleProps, "size" | "className">) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-lg bg-secondary/50 animate-pulse",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-12 w-12",
          className,
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;

  return (
    <motion.button
      onClick={cycleTheme}
      className={cn(
        "relative flex items-center justify-center rounded-xl",
        "bg-secondary/50 hover:bg-secondary transition-colors",
        "border border-border/50 hover:border-border",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12",
        className,
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -10, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 10, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {theme === "light" && (
            <Sun size={iconSize} className="text-amber-500" />
          )}
          {theme === "dark" && (
            <Moon size={iconSize} className="text-blue-400" />
          )}
          {theme === "system" && (
            <Monitor
              size={iconSize}
              className={isDark ? "text-blue-400" : "text-amber-500"}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

// ============================================================================
// Switch Theme Toggle (Light/Dark only)
// ============================================================================

function SwitchToggle({
  size = "md",
  showLabel,
  className,
}: Pick<ThemeToggleProps, "size" | "showLabel" | "className">) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-full bg-secondary/50 animate-pulse",
          size === "sm" && "h-6 w-11",
          size === "md" && "h-7 w-14",
          size === "lg" && "h-8 w-16",
          className,
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
      <motion.button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "relative rounded-full transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDark ? "bg-blue-600" : "bg-amber-400",
          size === "sm" && "h-6 w-11",
          size === "md" && "h-7 w-14",
          size === "lg" && "h-8 w-16",
        )}
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      >
        <motion.div
          className={cn(
            "absolute top-0.5 flex items-center justify-center rounded-full bg-white shadow-md",
            size === "sm" && "h-5 w-5",
            size === "md" && "h-6 w-6",
            size === "lg" && "h-7 w-7",
          )}
          initial={false}
          animate={{
            x: isDark ? (size === "sm" ? 20 : size === "md" ? 28 : 32) : 2,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDark ? "moon" : "sun"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isDark ? (
                <Moon
                  size={size === "sm" ? 12 : size === "md" ? 14 : 16}
                  className="text-blue-600"
                />
              ) : (
                <Sun
                  size={size === "sm" ? 12 : size === "md" ? 14 : 16}
                  className="text-amber-500"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.button>
    </div>
  );
}

// ============================================================================
// Dropdown Theme Toggle
// ============================================================================

function DropdownToggle({
  size = "md",
  className,
}: Pick<ThemeToggleProps, "size" | "className">) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-lg bg-secondary/50 animate-pulse",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-12 w-12",
          className,
        )}
      />
    );
  }

  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;

  const themes = [
    { value: "light", label: "Light", icon: Sun, color: "text-amber-500" },
    { value: "dark", label: "Dark", icon: Moon, color: "text-blue-400" },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      color: "text-muted-foreground",
    },
  ] as const;

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];

  return (
    <div className={cn("relative", className)}>
      <motion.button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center justify-center rounded-xl",
          "bg-secondary/50 hover:bg-secondary transition-colors",
          "border border-border/50 hover:border-border",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-12 w-12",
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Theme options"
        aria-expanded={open}
      >
        <currentTheme.icon size={iconSize} className={currentTheme.color} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {/* Dropdown */}
            <motion.div
              className={cn(
                "absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl",
                "bg-popover border border-border shadow-lg",
              )}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTheme(t.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <Icon size={16} className={t.color} />
                    <span>{t.label}</span>
                    {isActive && (
                      <motion.div
                        className="ml-auto h-2 w-2 rounded-full bg-primary"
                        layoutId="theme-indicator"
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ThemeToggle({
  variant = "icon",
  size = "md",
  showLabel = false,
  className,
}: ThemeToggleProps) {
  switch (variant) {
    case "switch":
      return (
        <SwitchToggle size={size} showLabel={showLabel} className={className} />
      );
    case "dropdown":
      return <DropdownToggle size={size} className={className} />;
    default:
      return <IconToggle size={size} className={className} />;
  }
}

export default ThemeToggle;
