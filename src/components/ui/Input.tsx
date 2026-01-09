/**
 * ============================================================================
 * COREX: Input Component
 * Description: Form input with variants and states
 * ============================================================================
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { inputVariants, type InputVariants } from "./variants";

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    InputVariants {
  /** Icon to show at the start of the input */
  leftIcon?: React.ReactNode;
  /** Icon or element to show at the end of the input */
  rightElement?: React.ReactNode;
  /** Error message to display */
  error?: string;
  /** Helper text to display */
  helperText?: string;
  /** Label for the input */
  label?: string;
}

/**
 * Input component with optional icons and validation states
 *
 * @example
 * ```tsx
 * <Input
 *   label="Search"
 *   placeholder="Search repositories..."
 *   leftIcon={<Search className="h-4 w-4" />}
 * />
 * <Input error="This field is required" variant="error" />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      leftIcon,
      rightElement,
      error,
      helperText,
      label,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const computedVariant = error ? "error" : variant;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium mb-1.5",
              "text-gray-700 dark:text-gray-300",
            )}
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2",
                "text-gray-400 pointer-events-none",
              )}
            >
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant: computedVariant, inputSize }),
              leftIcon && "pl-10",
              rightElement && "pr-10",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {/* Right element */}
          {rightElement && (
            <div
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-gray-400",
              )}
            >
              {rightElement}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

/**
 * Search input with pre-configured styling
 */
export interface SearchInputProps extends Omit<InputProps, "leftIcon"> {
  /** Callback when search is submitted */
  onSearch?: (value: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onKeyDown, className, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
      }
      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
    );
  },
);

SearchInput.displayName = "SearchInput";

export default Input;
