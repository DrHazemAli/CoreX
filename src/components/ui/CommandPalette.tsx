/**
 * ============================================================================
 * COREX: Command Palette (⌘K)
 * Description: Spotlight-style command palette for quick navigation & actions
 * ============================================================================
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  TrendingUp,
  GitCompare,
  Moon,
  Sun,
  Monitor,
  Minimize2,
  Sparkles,
  FileText,
  Shield,
  ArrowRight,
  Command,
  CornerDownLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";

// ============================================================================
// Types
// ============================================================================

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  category: "navigation" | "theme" | "settings" | "quick";
  action: () => void;
  shortcut?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    settings,
    toggleCompactMode,
    toggleVisualEffects,
  } = useApp();
  const { setTheme } = useTheme();
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  /**
   * Store router in a ref to avoid including it in useMemo dependencies.
   * Next.js router object is stable but not referentially equal between renders,
   * which would cause unnecessary recalculation of commands array.
   */
  const routerRef = React.useRef(router);
  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Build command items - uses routerRef to avoid dependency on router object
  const commands: CommandItem[] = React.useMemo(
    () => [
      // Navigation - use routerRef.current for stable reference
      {
        id: "home",
        label: "Go to Home",
        description: "Dashboard and overview",
        icon: Home,
        category: "navigation",
        action: () => routerRef.current.push("/"),
        shortcut: "G H",
      },
      {
        id: "search",
        label: "Go to Search",
        description: "Search repositories",
        icon: Search,
        category: "navigation",
        action: () => routerRef.current.push("/search"),
        shortcut: "G S",
      },
      {
        id: "rankings",
        label: "Go to Rankings",
        description: "View top repositories",
        icon: TrendingUp,
        category: "navigation",
        action: () => routerRef.current.push("/rankings"),
        shortcut: "G R",
      },
      {
        id: "compare",
        label: "Go to Compare",
        description: "Compare repositories",
        icon: GitCompare,
        category: "navigation",
        action: () => routerRef.current.push("/compare"),
        shortcut: "G C",
      },
      {
        id: "terms",
        label: "Terms of Service",
        description: "Legal terms",
        icon: FileText,
        category: "navigation",
        action: () => routerRef.current.push("/terms"),
      },
      {
        id: "privacy",
        label: "Privacy Policy",
        description: "Privacy information",
        icon: Shield,
        category: "navigation",
        action: () => routerRef.current.push("/privacy"),
      },
      // Theme
      {
        id: "theme-light",
        label: "Light Theme",
        description: "Switch to light mode",
        icon: Sun,
        category: "theme",
        action: () => setTheme("light"),
      },
      {
        id: "theme-dark",
        label: "Dark Theme",
        description: "Switch to dark mode",
        icon: Moon,
        category: "theme",
        action: () => setTheme("dark"),
      },
      {
        id: "theme-system",
        label: "System Theme",
        description: "Follow system preference",
        icon: Monitor,
        category: "theme",
        action: () => setTheme("system"),
      },
      // Settings
      {
        id: "compact-mode",
        label: settings.compactMode
          ? "Disable Compact Mode"
          : "Enable Compact Mode",
        description: "Toggle compact interface",
        icon: Minimize2,
        category: "settings",
        action: toggleCompactMode,
      },
      {
        id: "visual-effects",
        label: settings.visualEffects
          ? "Disable Visual Effects"
          : "Enable Visual Effects",
        description: "Toggle glow and blur effects",
        icon: Sparkles,
        category: "settings",
        action: toggleVisualEffects,
      },
    ],
    [
      setTheme,
      settings.compactMode,
      settings.visualEffects,
      toggleCompactMode,
      toggleVisualEffects,
    ],
  );

  // Filter commands by search
  const filteredCommands = React.useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.description?.toLowerCase().includes(lower),
    );
  }, [commands, search]);

  // Group filtered commands by category
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opening
  React.useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filteredCommands.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + totalItems) % totalItems);
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setCommandPaletteOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setCommandPaletteOpen(false);
        break;
    }
  };

  // Scroll selected item into view
  React.useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    theme: "Theme",
    settings: "Settings",
    quick: "Quick Actions",
  };

  /**
   * Pre-compute item indices per category for stable selection tracking.
   * This avoids mutating a variable during render which violates React's
   * rules about pure render functions.
   */
  const categoryStartIndices = React.useMemo(() => {
    const indices: Record<string, number> = {};
    let runningIndex = 0;
    Object.entries(groupedCommands).forEach(([category, items]) => {
      indices[category] = runningIndex;
      runningIndex += items.length;
    });
    return indices;
  }, [groupedCommands]);

  return (
    <Dialog.Root
      open={isCommandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    >
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-[20%] z-[101] w-full max-w-xl -translate-x-1/2",
                  "overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl",
                )}
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onKeyDown={handleKeyDown}
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 border-b border-border px-4">
                  <Search
                    size={20}
                    className="text-muted-foreground shrink-0"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search commands..."
                    className={cn(
                      "flex-1 bg-transparent py-4 text-base outline-none",
                      "placeholder:text-muted-foreground",
                    )}
                  />
                  <kbd className="hidden sm:flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    <Command size={12} />K
                  </kbd>
                </div>

                {/* Results */}
                <div
                  ref={listRef}
                  className="max-h-[400px] overflow-y-auto p-2"
                >
                  {filteredCommands.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Search className="mx-auto h-10 w-10 opacity-40" />
                      <p className="mt-2 text-sm">No commands found</p>
                    </div>
                  ) : (
                    Object.entries(groupedCommands).map(([category, items]) => (
                      <div key={category} className="mb-2">
                        <h3 className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {categoryLabels[category]}
                        </h3>
                        <div className="space-y-0.5">
                          {items.map((item, indexInCategory) => {
                            // Calculate flat index from pre-computed category start indices
                            const flatIndex =
                              categoryStartIndices[category] + indexInCategory;
                            const isSelected = selectedIndex === flatIndex;
                            const Icon = item.icon;

                            return (
                              <button
                                key={item.id}
                                data-selected={isSelected}
                                onClick={() => {
                                  item.action();
                                  setCommandPaletteOpen(false);
                                }}
                                onMouseEnter={() => setSelectedIndex(flatIndex)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                  isSelected
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-accent/50",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-lg",
                                    isSelected
                                      ? "bg-primary/20"
                                      : "bg-secondary",
                                  )}
                                >
                                  <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {item.label}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {item.shortcut && (
                                  <kbd className="text-xs text-muted-foreground">
                                    {item.shortcut}
                                  </kbd>
                                )}
                                {isSelected && (
                                  <ArrowRight
                                    size={16}
                                    className="text-muted-foreground"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-secondary px-1.5 py-0.5">
                        ↑↓
                      </kbd>
                      <span>Navigate</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CornerDownLeft size={14} />
                      <span>Select</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-secondary px-1.5 py-0.5">
                        Esc
                      </kbd>
                      <span>Close</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export default CommandPalette;
