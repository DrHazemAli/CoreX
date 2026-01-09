/**
 * ============================================================================
 * COREX: UI Component Utility Classes
 * Description: Shared component variants and styles using CVA
 * ============================================================================
 */

import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button variants with professional styling
 */
export const buttonVariants = cva(
  // Base styles
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-lg font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-offset-2 focus-visible:ring-primary",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 active:bg-primary/80",
          "shadow-sm hover:shadow-md",
        ],
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-accent active:bg-accent/80",
        ],
        ghost: [
          "bg-transparent text-foreground",
          "hover:bg-accent active:bg-accent/80",
        ],
        outline: [
          "border-2 border-border bg-transparent",
          "text-foreground hover:bg-accent",
        ],
        danger: [
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90 active:bg-destructive/80",
          "focus-visible:ring-destructive",
        ],
        success: [
          "bg-green-500 text-white",
          "hover:bg-green-600 active:bg-green-700",
          "focus-visible:ring-green-500",
        ],
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

/**
 * Card variants for consistent panel styling
 */
export const cardVariants = cva(
  [
    "rounded-xl border bg-card",
    "border-border",
    "transition-shadow duration-200",
  ],
  {
    variants: {
      variant: {
        default: "shadow-sm",
        elevated: "shadow-md hover:shadow-lg",
        outlined: "shadow-none",
        interactive: [
          "shadow-sm cursor-pointer",
          "hover:shadow-md hover:border-muted-foreground/50",
          "active:shadow-sm",
        ],
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  },
);

/**
 * Badge variants for tags and status indicators
 */
export const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-full font-medium",
    "transition-colors duration-150",
  ],
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/20 text-primary",
        success: "bg-green-500/20 text-green-500",
        warning: "bg-yellow-500/20 text-yellow-500",
        danger: "bg-red-500/20 text-red-500",
        info: "bg-blue-500/20 text-blue-500",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

/**
 * Input variants for form fields
 */
export const inputVariants = cva(
  [
    "w-full rounded-lg border bg-background",
    "text-foreground placeholder:text-muted-foreground",
    "transition-colors duration-200",
    "focus:outline-none focus:ring-2 focus:ring-primary/20",
    "focus:border-primary",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary",
    "border-border",
  ],
  {
    variants: {
      variant: {
        default: "hover:border-muted-foreground/50",
        error:
          "border-destructive focus:ring-destructive/20 focus:border-destructive",
        success:
          "border-green-500 focus:ring-green-500/20 focus:border-green-500",
      },
      inputSize: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  },
);

// Export variant types for component props
export type ButtonVariants = VariantProps<typeof buttonVariants>;
export type CardVariants = VariantProps<typeof cardVariants>;
export type BadgeVariants = VariantProps<typeof badgeVariants>;
export type InputVariants = VariantProps<typeof inputVariants>;
