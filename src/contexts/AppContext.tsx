/**
 * ============================================================================
 * COREX: Application Context Provider
 * Description: Centralized state management for application-wide settings
 *
 * This context provides:
 * - Visual preferences (compact mode, reduced motion, visual effects)
 * - Sound settings
 * - Sidebar collapse state
 * - Command palette visibility
 *
 * ARCHITECTURE NOTES:
 * - Single source of truth for app settings
 * - Persisted to localStorage for user preference retention
 * - Respects system preferences (reduced motion)
 * - Provides both required (useApp) and optional (useAppOptional) hooks
 *
 * USAGE:
 * ```tsx
 * // In components that require settings
 * const { settings, toggleCompactMode } = useApp();
 *
 * // In components where settings are optional
 * const app = useAppOptional();
 * if (app?.settings.compactMode) { ... }
 * ```
 *
 * @see src/components/providers/index.ts - Provider composition
 * @see src/components/ui/SettingsDropdown.tsx - Settings UI
 * ============================================================================
 */

"use client";

import * as React from "react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Application settings state
 * These preferences affect the entire app's appearance and behavior
 */
interface AppSettings {
  /** Enable compact UI with reduced spacing and smaller elements */
  compactMode: boolean;
  /** Reduce or disable animations for accessibility */
  reducedMotion: boolean;
  /** Enable sound effects for interactions */
  soundEffects: boolean;
  /** Enable decorative visual effects (glows, particles, etc.) */
  visualEffects: boolean;
  /** Collapse the sidebar in dashboard views */
  sidebarCollapsed: boolean;
}

/**
 * Context value interface
 * Provides settings state and updater functions
 */
interface AppContextValue {
  /** Current application settings */
  settings: AppSettings;
  /** Update a specific setting by key */
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  /** Toggle compact mode on/off */
  toggleCompactMode: () => void;
  /** Toggle reduced motion on/off */
  toggleReducedMotion: () => void;
  /** Toggle visual effects on/off */
  toggleVisualEffects: () => void;
  /** Toggle sidebar collapsed state */
  toggleSidebar: () => void;
  /** Command palette open state */
  isCommandPaletteOpen: boolean;
  /** Set command palette open state */
  setCommandPaletteOpen: (open: boolean) => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default settings applied on first load
 * These can be overridden by localStorage values
 */
const defaultSettings: AppSettings = {
  compactMode: false,
  reducedMotion: false,
  soundEffects: false,
  visualEffects: true,
  sidebarCollapsed: false,
};

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * React context for application state
 * Undefined when accessed outside of AppProvider
 */
const AppContext = React.createContext<AppContextValue | undefined>(undefined);

// ============================================================================
// CONSTANTS
// ============================================================================

/** LocalStorage key for persisting settings */
const STORAGE_KEY = "discover-app-settings";

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * Application Context Provider
 *
 * Wraps the application to provide global state management.
 * Handles persistence, system preferences, and keyboard shortcuts.
 *
 * @param children - React children to wrap
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <AppProvider>
 *   <ThemeProvider>
 *     {children}
 *   </ThemeProvider>
 * </AppProvider>
 * ```
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Application settings state */
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings);

  /** Command palette visibility */
  const [isCommandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  /** Track if component has mounted (for SSR safety) */
  const [mounted, setMounted] = React.useState(false);

  // -------------------------------------------------------------------------
  // EFFECTS: Initialization and Persistence
  // -------------------------------------------------------------------------

  /**
   * Effect: Load settings from localStorage on mount
   * Also checks system reduced-motion preference
   */
  React.useEffect(() => {
    setMounted(true);

    // Load persisted settings
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore parse errors - use defaults
    }

    // Respect system reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setSettings((prev) => ({ ...prev, reducedMotion: true }));
    }
  }, []);

  /**
   * Effect: Persist settings to localStorage when changed
   */
  React.useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [settings, mounted]);

  /**
   * Effect: Apply CSS classes to document root
   * Enables global CSS targeting based on settings
   */
  React.useEffect(() => {
    if (mounted) {
      // Toggle CSS classes for global styling
      document.documentElement.classList.toggle(
        "compact",
        settings.compactMode,
      );
      document.documentElement.classList.toggle(
        "reduced-motion",
        settings.reducedMotion,
      );
      document.documentElement.classList.toggle(
        "visual-effects",
        settings.visualEffects,
      );
    }
  }, [
    settings.compactMode,
    settings.reducedMotion,
    settings.visualEffects,
    mounted,
  ]);

  /**
   * Effect: Global keyboard shortcuts
   * ⌘K / Ctrl+K: Toggle command palette
   * Escape: Close command palette
   *
   * Uses a ref for isCommandPaletteOpen to avoid recreating the listener
   * on every state change - the ref always has the current value
   */
  const isOpenRef = React.useRef(isCommandPaletteOpen);
  React.useEffect(() => {
    isOpenRef.current = isCommandPaletteOpen;
  }, [isCommandPaletteOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Escape to close command palette - check ref to avoid stale closure
      if (e.key === "Escape" && isOpenRef.current) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty deps - listener is stable, uses ref for current state

  // -------------------------------------------------------------------------
  // CALLBACKS: Setting Updaters
  // -------------------------------------------------------------------------

  /**
   * Update a specific setting by key
   * Generic function for any setting update
   */
  const updateSetting = React.useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /** Toggle compact mode */
  /** Toggle compact mode */
  const toggleCompactMode = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, compactMode: !prev.compactMode }));
  }, []);

  /** Toggle reduced motion */
  const toggleReducedMotion = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  }, []);

  /** Toggle visual effects */
  const toggleVisualEffects = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, visualEffects: !prev.visualEffects }));
  }, []);

  /** Toggle sidebar collapsed state */
  const toggleSidebar = React.useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  // -------------------------------------------------------------------------
  // CONTEXT VALUE
  // -------------------------------------------------------------------------

  /**
   * Memoized context value
   * Prevents unnecessary re-renders of consumers
   */
  const value: AppContextValue = React.useMemo(
    () => ({
      settings,
      updateSetting,
      toggleCompactMode,
      toggleReducedMotion,
      toggleVisualEffects,
      toggleSidebar,
      isCommandPaletteOpen,
      setCommandPaletteOpen,
    }),
    [
      settings,
      updateSetting,
      toggleCompactMode,
      toggleReducedMotion,
      toggleVisualEffects,
      toggleSidebar,
      isCommandPaletteOpen,
    ],
  );

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Access application context (required)
 *
 * Use this hook when the component MUST have access to app settings.
 * Throws an error if used outside of AppProvider.
 *
 * @throws {Error} When used outside of AppProvider
 * @returns AppContextValue
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { settings, toggleCompactMode } = useApp();
 *   return (
 *     <button onClick={toggleCompactMode}>
 *       {settings.compactMode ? 'Normal' : 'Compact'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useApp() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

/**
 * Access application context (optional)
 *
 * Use this hook when the component can work without app settings.
 * Returns undefined if used outside of AppProvider (doesn't throw).
 *
 * @returns AppContextValue | undefined
 *
 * @example
 * ```tsx
 * function OptionalComponent() {
 *   const app = useAppOptional();
 *   // Handle case where context is not available
 *   const isCompact = app?.settings.compactMode ?? false;
 *   return <div className={isCompact ? 'compact' : ''}>...</div>;
 * }
 * ```
 */
export function useAppOptional() {
  return React.useContext(AppContext);
}
