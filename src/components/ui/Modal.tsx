/**
 * ============================================================================
 * COREX: Modal Component
 * Description: Radix Dialog with Framer Motion animations
 * ============================================================================
 */

"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// MODAL ROOT
// ============================================================================

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;
const ModalPortal = DialogPrimitive.Portal;

// ============================================================================
// MODAL OVERLAY
// ============================================================================

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  />
));
ModalOverlay.displayName = "ModalOverlay";

// ============================================================================
// MODAL CONTENT
// ============================================================================

interface ModalContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Show close button */
  showClose?: boolean;
  /** Content size */
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, children, showClose = true, size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[calc(100vw-2rem)]",
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        <ModalOverlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </ModalOverlay>
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2",
            "focus:outline-none",
            sizeClasses[size],
            className,
          )}
          {...props}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative rounded-xl border border-[rgb(var(--border))]",
              "bg-[rgb(var(--card))] p-6 shadow-2xl",
              "max-h-[calc(100vh-4rem)] overflow-y-auto",
            )}
          >
            {children}
            {showClose && (
              <DialogPrimitive.Close
                className={cn(
                  "absolute right-4 top-4 rounded-full p-1.5",
                  "text-[rgb(var(--foreground-muted))]",
                  "transition-colors hover:bg-[rgb(var(--background-secondary))]",
                  "hover:text-[rgb(var(--foreground))]",
                  "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]",
                )}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </motion.div>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </ModalPortal>
  );
});
ModalContent.displayName = "ModalContent";

// ============================================================================
// MODAL HEADER
// ============================================================================

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 flex flex-col space-y-1.5", className)} {...props} />
);
ModalHeader.displayName = "ModalHeader";

// ============================================================================
// MODAL TITLE
// ============================================================================

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold text-[rgb(var(--foreground))]",
      className,
    )}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

// ============================================================================
// MODAL DESCRIPTION
// ============================================================================

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[rgb(var(--foreground-secondary))]", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

// ============================================================================
// MODAL FOOTER
// ============================================================================

const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
ModalFooter.displayName = "ModalFooter";

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalClose,
};
