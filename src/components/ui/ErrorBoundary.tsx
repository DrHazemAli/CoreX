/**
 * ============================================================================
 * COREX: Error Boundary Component
 * Description: Catches JavaScript errors in child components and displays fallback UI
 *
 * React Error Boundaries are class components because there's no hook equivalent
 * for componentDidCatch. This component provides a declarative way to handle
 * runtime errors without crashing the entire application.
 *
 * ERROR HANDLING STRATEGY:
 * - Errors during rendering are caught and logged
 * - A user-friendly fallback UI is displayed
 * - Users can retry by clicking "Try again"
 * - Errors are optionally reported to monitoring services
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 * ============================================================================
 */

"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Custom fallback UI (overrides default) */
  fallback?: React.ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom error message */
  message?: string;
  /** Show retry button */
  showRetry?: boolean;
  /** Additional CSS classes for the fallback container */
  className?: string;
}

interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

/**
 * Error Boundary - Gracefully handles runtime errors
 *
 * Wrap sections of your app to prevent a single error from crashing
 * the entire application. Each boundary acts as a "catch" block.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <RiskyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomError />}>
 *   <Dashboard />
 * </ErrorBoundary>
 *
 * // With error reporting
 * <ErrorBoundary onError={(error) => reportToSentry(error)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state when an error is caught
   * Called during the "render" phase - no side effects here
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Side effects after an error is caught
   * Called during the "commit" phase - safe for side effects
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // Call optional error handler (for reporting to Sentry, etc.)
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset error state to allow retry
   */
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    const {
      children,
      fallback,
      message = "Something went wrong",
      showRetry = true,
      className,
    } = this.props;
    const { hasError, error } = this.state;

    // Render fallback if error caught
    if (hasError) {
      // Custom fallback takes precedence
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 text-center",
            "min-h-[200px] rounded-lg border border-destructive/20 bg-destructive/5",
            className,
          )}
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {message}
          </h2>
          {error && (
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {error.message || "An unexpected error occurred"}
            </p>
          )}
          {showRetry && (
            <button
              onClick={this.handleRetry}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground font-medium",
                "hover:bg-primary/90 transition-colors",
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      );
    }

    // No error - render children normally
    return children;
  }
}

// ============================================================================
// HOOK FOR PROGRAMMATIC ERROR THROWING
// ============================================================================

/**
 * Hook to manually trigger the nearest error boundary
 *
 * Useful for handling errors in event handlers or async code,
 * which aren't caught by error boundaries automatically.
 *
 * @returns Function to throw an error to the nearest boundary
 *
 * @example
 * ```tsx
 * function SaveButton() {
 *   const throwError = useErrorBoundary();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *     } catch (error) {
 *       // This will trigger the error boundary
 *       throwError(error);
 *     }
 *   };
 * }
 * ```
 */
export function useErrorBoundary(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    // Throwing during render triggers the error boundary
    setError(() => {
      throw error;
    });
  }, []);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorBoundary;
