/**
 * ============================================================================
 * COREX: Custom React Hooks
 * Description: Reusable hooks for common patterns across the application
 *
 * This module provides optimized hooks that follow React best practices:
 * - Proper cleanup to prevent memory leaks
 * - Stable references to avoid unnecessary re-renders
 * - SSR-safe implementations for Next.js
 *
 * @module lib/hooks
 * ============================================================================
 */

"use client";

import * as React from "react";

// ============================================================================
// HYDRATION SAFETY
// ============================================================================

/**
 * Track if the component has mounted on the client
 *
 * Essential for Next.js hydration safety - prevents mismatches between
 * server and client renders when accessing browser-only APIs like
 * localStorage, window, or navigator.
 *
 * @returns boolean - true after first client-side render
 *
 * @example
 * ```tsx
 * function ThemeSwitch() {
 *   const mounted = useMounted();
 *   // Avoid rendering theme-dependent UI until mounted
 *   if (!mounted) return <Skeleton />;
 *   return <ActualThemeSwitch />;
 * }
 * ```
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Stable event listener that doesn't recreate on every render
 *
 * Uses a ref to always have access to the latest callback without
 * needing to add/remove listeners when the callback changes.
 * This prevents memory leaks and improves performance.
 *
 * @param eventName - The event to listen for
 * @param handler - The event handler callback
 * @param element - The target element (defaults to window)
 * @param options - AddEventListener options
 *
 * @example
 * ```tsx
 * function ScrollTracker() {
 *   // Handler can reference state without being in deps
 *   useEventListener('scroll', () => {
 *     console.log('Scrolled, count:', count);
 *   });
 * }
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: Window | HTMLElement | null,
  options?: AddEventListenerOptions,
): void {
  // Store handler in ref to avoid recreating listener
  const savedHandler = React.useRef(handler);

  // Update ref when handler changes (no effect re-run needed)
  React.useLayoutEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const targetElement = element ?? window;

    // Wrapper calls current ref value
    const eventListener = (event: WindowEventMap[K]) => {
      savedHandler.current(event);
    };

    targetElement.addEventListener(
      eventName,
      eventListener as EventListener,
      options,
    );

    return () => {
      targetElement.removeEventListener(
        eventName,
        eventListener as EventListener,
        options,
      );
    };
    // Only re-run if element or event name changes
  }, [eventName, element, options]);
}

// ============================================================================
// MEDIA QUERIES
// ============================================================================

/**
 * Subscribe to media query changes with proper cleanup
 *
 * Automatically updates when the media query match state changes,
 * such as when the user resizes the window or changes system preferences.
 *
 * @param query - CSS media query string
 * @returns boolean - whether the query currently matches
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create listener with proper cleanup
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern API with fallback for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Legacy fallback
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

// ============================================================================
// CLICK OUTSIDE
// ============================================================================

/**
 * Detect clicks outside of a referenced element
 *
 * Commonly used for closing dropdowns, modals, and popovers.
 * Uses mousedown for better UX (triggers before the click completes).
 *
 * @param ref - React ref to the container element
 * @param handler - Callback when click occurs outside
 * @param enabled - Whether the listener is active (default: true)
 *
 * @example
 * ```tsx
 * function Dropdown() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   const ref = useRef<HTMLDivElement>(null);
 *
 *   useClickOutside(ref, () => setIsOpen(false), isOpen);
 *
 *   return <div ref={ref}>...</div>;
 * }
 * ```
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true,
): void {
  // Store handler in ref to avoid effect re-runs
  const savedHandler = React.useRef(handler);

  React.useLayoutEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      // Do nothing if clicking ref's element or its descendants
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      savedHandler.current(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, enabled]);
}

// ============================================================================
// DEBOUNCE
// ============================================================================

/**
 * Debounce a value - delays updating until the value stops changing
 *
 * Useful for search inputs, resize handlers, or any rapidly changing value
 * where you want to wait for the user to "settle" before acting.
 *
 * @param value - The value to debounce
 * @param delay - Milliseconds to wait before updating
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function Search() {
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *
 *   // API call only triggers when user stops typing
 *   useEffect(() => {
 *     if (debouncedQuery) searchAPI(debouncedQuery);
 *   }, [debouncedQuery]);
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout on value change or unmount
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// PREVIOUS VALUE
// ============================================================================

/**
 * Track the previous value of a variable across renders
 *
 * Useful for comparing current vs previous state, detecting changes,
 * or implementing undo functionality.
 *
 * Note: Uses useState to store the previous value to avoid accessing
 * ref.current during render, which violates React's rules.
 *
 * @param value - The value to track
 * @returns The value from the previous render (undefined on first render)
 *
 * @example
 * ```tsx
 * function Counter({ count }) {
 *   const prevCount = usePrevious(count);
 *   const direction = count > (prevCount ?? 0) ? 'up' : 'down';
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const [previous, setPrevious] = React.useState<T | undefined>(undefined);
  const ref = React.useRef<T>(value);

  React.useEffect(() => {
    setPrevious(ref.current);
    ref.current = value;
  }, [value]);

  return previous;
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

/**
 * Persist state to localStorage with SSR safety
 *
 * Automatically syncs state with localStorage while handling:
 * - SSR (no localStorage on server)
 * - Parse errors (corrupted data)
 * - Storage quota errors
 *
 * @param key - localStorage key
 * @param initialValue - Default value if no stored value exists
 * @returns [value, setValue] tuple like useState
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // State to store our value
  const [storedValue, setStoredValue] = React.useState<T>(initialValue);
  const mounted = useMounted();

  // Load from localStorage after mount
  React.useEffect(() => {
    if (!mounted) return;

    try {
      const item = localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch {
      // Use initial value if parsing fails
    }
  }, [key, mounted]);

  // Wrapped setter that also updates localStorage
  const setValue: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (value) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;

        // Save to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch {
          // Ignore storage errors (quota exceeded, etc.)
        }

        return valueToStore;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
