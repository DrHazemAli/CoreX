/**
 * ============================================================================
 * COREX: Settings Dropdown
 * Description: Quick settings dropdown for compact mode, animations, etc.
 * ============================================================================
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  Minimize2,
  Maximize2,
  Sparkles,
  Gauge,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";

// ============================================================================
// Types
// ============================================================================

interface SettingsDropdownProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SettingsDropdown({
  size = "md",
  className,
}: SettingsDropdownProps) {
  const {
    settings,
    toggleCompactMode,
    toggleReducedMotion,
    toggleVisualEffects,
  } = useApp();
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;

  const settingsItems = [
    {
      label: "Compact Mode",
      description: "Reduce spacing and padding",
      icon: settings.compactMode ? Minimize2 : Maximize2,
      enabled: settings.compactMode,
      toggle: toggleCompactMode,
    },
    {
      label: "Visual Effects",
      description: "Glow, blur, and gradient effects",
      icon: Sparkles,
      enabled: settings.visualEffects,
      toggle: toggleVisualEffects,
    },
    {
      label: "Reduced Motion",
      description: "Minimize animations",
      icon: Gauge,
      enabled: settings.reducedMotion,
      toggle: toggleReducedMotion,
    },
  ];

  return (
    <div className={cn("relative", className)}>
      <motion.button
        ref={buttonRef}
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
        aria-label="Settings"
        aria-expanded={open}
      >
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Settings2 size={iconSize} className="text-muted-foreground" />
        </motion.div>
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
                "absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl",
                "bg-popover border border-border shadow-2xl",
              )}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div className="border-b border-border px-4 py-3">
                <h3 className="font-semibold text-sm">Quick Settings</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize your experience
                </p>
              </div>

              {/* Settings Items */}
              <div className="p-2">
                {settingsItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      onClick={item.toggle}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        "hover:bg-accent/50",
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          item.enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          item.enabled
                            ? "bg-primary border-primary"
                            : "border-border",
                        )}
                      >
                        {item.enabled && (
                          <Check
                            size={12}
                            className="text-primary-foreground"
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-border p-2">
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors",
                  )}
                >
                  <span>All settings</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SettingsDropdown;
