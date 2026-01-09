/**
 * ============================================================================
 * COREX: Tooltip Component
 * Description: Tooltip using Radix UI
 * ============================================================================
 */

"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// Provider
// ============================================================================

const TooltipProvider = TooltipPrimitive.Provider;

// ============================================================================
// Root
// ============================================================================

const Tooltip = TooltipPrimitive.Root;

// ============================================================================
// Trigger
// ============================================================================

const TooltipTrigger = TooltipPrimitive.Trigger;

// ============================================================================
// Content
// ============================================================================

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Base styles
      "z-50 overflow-hidden rounded-md px-3 py-1.5",
      "bg-gray-900 text-xs text-white shadow-md",
      // Animation
      "animate-in fade-in-0 zoom-in-95",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      "data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",
      // Dark mode
      "dark:bg-gray-100 dark:text-gray-900",
      className,
    )}
    {...props}
  />
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// ============================================================================
// Simple Tooltip Wrapper
// ============================================================================

export interface SimpleTooltipProps {
  /** Content to show in tooltip */
  content: React.ReactNode;
  /** Side of the trigger to show tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment of the tooltip */
  align?: "start" | "center" | "end";
  /** Delay before showing tooltip (ms) */
  delayDuration?: number;
  /** Children to wrap with tooltip */
  children: React.ReactNode;
}

/**
 * Simple tooltip wrapper for common use cases
 *
 * @example
 * ```tsx
 * <SimpleTooltip content="This is a tooltip">
 *   <Button>Hover me</Button>
 * </SimpleTooltip>
 * ```
 */
export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  side = "top",
  align = "center",
  delayDuration = 200,
  children,
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================================================
// Exports
// ============================================================================

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
