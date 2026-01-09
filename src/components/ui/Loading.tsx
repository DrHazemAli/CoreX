/**
 * ============================================================================
 * COREX: Loading Components
 * Description: Loading states and skeletons
 * ============================================================================
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================================
// Spinner
// ============================================================================

export interface SpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Animated spinner for loading states
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className }) => {
  return (
    <Loader2
      className={cn(
        "animate-spin text-primary-600",
        spinnerSizes[size],
        className,
      )}
      aria-hidden="true"
    />
  );
};

// ============================================================================
// Skeleton
// ============================================================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
}

/**
 * Skeleton placeholder for loading content
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  style,
  ...props
}) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-secondary", className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
};

// ============================================================================
// Loading Overlay
// ============================================================================

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean;
  /** Loading message to display */
  message?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Full overlay with spinner for loading states
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = "Loading...",
  className,
}) => {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

// ============================================================================
// Page Loading
// ============================================================================

/**
 * Full page loading state
 */
export const PageLoading: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <Spinner size="lg" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
};

// ============================================================================
// Card Skeleton
// ============================================================================

/**
 * Skeleton for repository cards
 */
export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
};

/**
 * Multiple card skeletons
 */
export const CardSkeletonList: React.FC<{ count?: number }> = ({
  count = 3,
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

// ============================================================================
// Table Skeleton
// ============================================================================

/**
 * Skeleton for table rows
 */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 pb-3 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
