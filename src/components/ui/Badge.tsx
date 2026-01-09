/**
 * ============================================================================
 * COREX: Badge Component
 * Description: Small label for tags, status, and categories
 * ============================================================================
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeVariants } from "./variants";
import { X } from "lucide-react";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, BadgeVariants {
  /** Whether the badge is removable */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Icon to show before text */
  icon?: React.ReactNode;
}

/**
 * Badge component for tags and status indicators
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="primary" removable onRemove={() => {}}>TypeScript</Badge>
 * <Badge icon={<Star className="h-3 w-3" />}>Featured</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      removable = false,
      onRemove,
      icon,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {/* Optional icon */}
        {icon && <span className="shrink-0">{icon}</span>}

        {/* Badge text */}
        <span>{children}</span>

        {/* Remove button */}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className={cn(
              "ml-0.5 -mr-0.5 rounded-full p-0.5",
              "hover:bg-black/10 dark:hover:bg-white/10",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-1 focus:ring-current",
            )}
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  },
);

Badge.displayName = "Badge";

/**
 * Language badge with common programming language colors
 */
export interface LanguageBadgeProps extends Omit<BadgeProps, "icon"> {
  language: string;
}

const languageColors: Record<string, string> = {
  TypeScript: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  JavaScript:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  Python: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Rust: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Go: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  Java: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  "C++":
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  C: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Ruby: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  PHP: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  Swift:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Kotlin:
    "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

export const LanguageBadge: React.FC<LanguageBadgeProps> = ({
  language,
  className,
  ...props
}) => {
  const colorClass =
    languageColors[language] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <Badge className={cn(colorClass, className)} {...props}>
      {/* Language color dot */}
      <span
        className="inline-block h-2 w-2 rounded-full mr-1"
        style={{ backgroundColor: getLanguageDotColor(language) }}
      />
      {language}
    </Badge>
  );
};

/**
 * Get the GitHub-style language dot color
 */
function getLanguageDotColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Vue: "#41b883",
    React: "#61dafb",
    CSS: "#563d7c",
    HTML: "#e34c26",
    Shell: "#89e051",
  };
  return colors[language] || "#8b949e";
}

export default Badge;
