/**
 * ============================================================================
 * COREX: UI Components Index
 * Description: Export all UI components
 * ============================================================================
 */

// Base components
export { Button, type ButtonProps } from "./Button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from "./Card";
export {
  Badge,
  LanguageBadge,
  type BadgeProps,
  type LanguageBadgeProps,
} from "./Badge";
export {
  Input,
  SearchInput,
  type InputProps,
  type SearchInputProps,
} from "./Input";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./Select";

// Feedback components
export {
  Spinner,
  Skeleton,
  LoadingOverlay,
  PageLoading,
  CardSkeleton,
  CardSkeletonList,
  TableSkeleton,
  type SpinnerProps,
  type SkeletonProps,
  type LoadingOverlayProps,
} from "./Loading";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip,
  type SimpleTooltipProps,
} from "./Tooltip";

// Interactive components
export { ThemeToggle } from "./ThemeToggle";
export { SettingsDropdown } from "./SettingsDropdown";
export { UserMenu } from "./UserMenu";
export { CommandPalette } from "./CommandPalette";
export { ErrorBoundary, useErrorBoundary } from "./ErrorBoundary";
export {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "./Modal";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./DropdownMenu";
export { DataTable } from "./DataTable";
export {
  PageTransition,
  FadeInSection,
  SlideInSection,
  ScaleInSection,
  StaggerContainer,
  StaggerItem,
  ViewportAnimation,
} from "./PageTransition";

// Variant utilities
export {
  buttonVariants,
  cardVariants,
  badgeVariants,
  inputVariants,
  type ButtonVariants,
  type CardVariants,
  type BadgeVariants,
  type InputVariants,
} from "./variants";
