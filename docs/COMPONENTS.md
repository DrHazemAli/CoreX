# UI Component System Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Stack**: Radix UI + Tailwind CSS 4 + Framer Motion

## Table of Contents

1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Styling System](#styling-system)
4. [Variant System (CVA)](#variant-system-cva)
5. [Core Components](#core-components)
6. [Animation System](#animation-system)
7. [Theme System](#theme-system)
8. [Provider Structure](#provider-structure)
9. [Accessibility](#accessibility)
10. [Performance Patterns](#performance-patterns)
11. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX implements a component system built on:

- **Radix UI** - Unstyled, accessible component primitives
- **Tailwind CSS 4** - Utility-first styling
- **CVA (Class Variance Authority)** - Type-safe variant management
- **Framer Motion** - Smooth, performant animations
- **next-themes** - Theme management with system preference support

### Design Principles

| Principle               | Implementation                                 |
| ----------------------- | ---------------------------------------------- |
| **Accessibility First** | Radix primitives handle ARIA, keyboard, focus  |
| **Composition**         | Small, composable components                   |
| **Type Safety**         | Props inferred from variants                   |
| **Performance**         | Lazy loading, memoization, CSS-in-JS avoidance |
| **Consistency**         | Shared design tokens via CSS variables         |

---

## Component Architecture

### Directory Structure

```
src/components/
├── auth/                    # Auth-related components
│   ├── index.ts            # Re-exports
│   └── PermissionGate.tsx  # Server component for auth gating
│
├── layout/                  # Layout components
│   ├── index.ts
│   ├── Header.tsx
│   └── Footer.tsx
│
├── providers/               # Context providers
│   ├── index.ts
│   └── ThemeProvider.tsx
│
└── ui/                      # UI primitives
    ├── index.ts            # Re-exports
    ├── variants.ts         # CVA variant definitions
    ├── Badge.tsx
    ├── Button.tsx
    ├── Card.tsx
    ├── CommandPalette.tsx
    ├── DataTable.tsx
    ├── DropdownMenu.tsx
    ├── ErrorBoundary.tsx
    ├── Input.tsx
    ├── Loading.tsx
    ├── Modal.tsx
    ├── PageTransition.tsx
    ├── Select.tsx
    ├── SettingsDropdown.tsx
    ├── ThemeToggle.tsx
    ├── Tooltip.tsx
    └── UserMenu.tsx
```

### Component File Structure

````tsx
/**
 * ============================================================================
 * COREX: ComponentName Component
 * Description: Brief description of what this component does
 * ============================================================================
 */

"use client"; // Only if needed (event handlers, hooks)

import * as React from "react";
import { cn } from "@/lib/utils";
import { componentVariants, type ComponentVariants } from "./variants";

// ============================================================================
// TYPES
// ============================================================================

export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>, ComponentVariants {
  /** Custom prop description */
  customProp?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ComponentName description
 *
 * @example
 * ```tsx
 * <ComponentName variant="primary" size="md">
 *   Content
 * </ComponentName>
 * ```
 */
export const ComponentName = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, customProp, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

ComponentName.displayName = "ComponentName";
````

---

## Styling System

### cn() Utility

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Usage Patterns

```tsx
// Basic usage
cn("px-4 py-2", "bg-blue-500")
// => "px-4 py-2 bg-blue-500"

// Conditional classes
cn("base-class", isActive && "active-class")
// => "base-class active-class" (if isActive)

// Object syntax
cn({
  "text-red-500": hasError,
  "text-green-500": !hasError,
})
// => "text-red-500" or "text-green-500"

// Conflict resolution
cn("p-4", "p-2")
// => "p-2" (last value wins - handled by tailwind-merge)

// Override defaults in components
<Button className="bg-purple-500">Custom</Button>
// Works because cn() resolves conflicts
```

### CSS Variables (Design Tokens)

```css
/* src/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

---

## Variant System (CVA)

### Defining Variants

```typescript
// src/components/ui/variants.ts
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  // Base styles (always applied)
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
          "hover:bg-destructive/90",
          "focus-visible:ring-destructive",
        ],
        success: [
          "bg-green-500 text-white",
          "hover:bg-green-600 active:bg-green-700",
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

// Extract type from CVA
export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

### Using Variants in Components

```tsx
// src/components/ui/Button.tsx
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariants } from "./variants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
```

### Variant Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CVA VARIANT FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  variants.ts                        Component.tsx
  ────────────                       ─────────────

  ┌─────────────────┐               ┌─────────────────┐
  │  Define cva()   │               │  Import variant │
  │  buttonVariants │ ────────────▶ │  + type         │
  └────────┬────────┘               └────────┬────────┘
           │                                 │
           │                                 ▼
           │                        ┌─────────────────┐
           │                        │  Extend props   │
  ┌────────┴────────┐               │  with variants  │
  │  Export type    │               │  ButtonVariants │
  │  ButtonVariants │ ─────────────▶└────────┬────────┘
  └─────────────────┘                        │
                                             ▼
                                    ┌─────────────────┐
                                    │  Use cn() to    │
                                    │  merge classes  │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Type-safe      │
                                    │  variant props! │
                                    └─────────────────┘
```

---

## Core Components

### Button

```tsx
import { Button } from "@/components/ui";

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// States
<Button isLoading loadingText="Saving...">Save</Button>
<Button disabled>Disabled</Button>

// Icons
<Button leftIcon={<Search />}>Search</Button>
<Button rightIcon={<ArrowRight />}>Continue</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui";

// Variants
<Card variant="default">Default shadow</Card>
<Card variant="elevated">Hover shadow</Card>
<Card variant="outlined">No shadow</Card>
<Card variant="interactive">Clickable</Card>

// Padding
<Card padding="none">No padding</Card>
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="lg">Large padding</Card>

// Composition
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Modal

```tsx
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from "@/components/ui";

<Modal>
  <ModalTrigger asChild>
    <Button>Open Modal</Button>
  </ModalTrigger>
  <ModalContent size="md" showClose>
    <ModalHeader>
      <ModalTitle>Modal Title</ModalTitle>
      <ModalDescription>Description text here</ModalDescription>
    </ModalHeader>

    <div>Modal body content</div>

    <ModalFooter>
      <ModalClose asChild>
        <Button variant="ghost">Cancel</Button>
      </ModalClose>
      <Button>Confirm</Button>
    </ModalFooter>
  </ModalContent>
</Modal>;
```

### Input

```tsx
import { Input } from "@/components/ui";

// Basic
<Input placeholder="Enter text..." />

// Types
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="Amount" />

// States
<Input disabled placeholder="Disabled" />
<Input error="This field is required" />
<Input helperText="We'll never share your email" />

// With icons
<Input
  leftIcon={<Mail />}
  rightIcon={<Check />}
  placeholder="Email verified"
/>
```

### Select

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";

<Select defaultValue="option1">
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>;
```

---

## Animation System

### Animation Variants

```typescript
// src/lib/animations.ts
import { type Variants } from "framer-motion";

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// Scale animations
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
};

// Stagger children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
```

### Usage in Components

```tsx
"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

// Single animation
export function AnimatedCard() {
  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      Card content
    </motion.div>
  );
}

// Staggered list
export function AnimatedList({ items }: { items: Item[] }) {
  return (
    <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
      {items.map((item) => (
        <motion.li key={item.id} variants={staggerItem}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}

// Page transitions
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### Animation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ANIMATION LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  Component Mount
        │
        ▼
  ┌─────────────────┐
  │  initial state  │  opacity: 0, y: 20
  │  (hidden)       │
  └────────┬────────┘
           │
           │ animate triggered
           ▼
  ┌─────────────────┐
  │  transition     │  duration: 0.5s
  │  running        │  ease: cubic-bezier
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  final state    │  opacity: 1, y: 0
  │  (visible)      │
  └─────────────────┘

  Component Unmount (with AnimatePresence)
        │
        ▼
  ┌─────────────────┐
  │  exit animation │  opacity: 0, y: -20
  │  runs first     │
  └────────┬────────┘
           │
           ▼
  Component removed from DOM
```

---

## Theme System

### ThemeProvider Setup

```tsx
// src/components/providers/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class" // Uses class-based theming
      defaultTheme="dark" // Default theme
      enableSystem // Respect system preference
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Using Theme in Components

```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}
```

### Theme Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THEME SYSTEM                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  next-themes                          Tailwind CSS
  ────────────                         ────────────

  ┌─────────────────┐                  ┌─────────────────┐
  │  ThemeProvider  │                  │  CSS Variables  │
  │  - Stores theme │                  │  in :root       │
  │  - localStorage │                  │                 │
  └────────┬────────┘                  │  :root {        │
           │                           │    --background │
           │ Sets class="dark"         │    --foreground │
           ▼                           │  }              │
  ┌─────────────────┐                  │                 │
  │  <html class>   │                  │  .dark {        │
  │  "dark" | ""    │ ───────────────▶ │    --background │
  └─────────────────┘                  │    --foreground │
                                       │  }              │
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Tailwind uses  │
                                       │  bg-background  │
                                       │  text-foreground│
                                       └─────────────────┘
```

---

## Provider Structure

### Application Providers

```tsx
// src/app/layout.tsx
import { ThemeProvider } from "@/components/providers";
import { QueryProvider } from "@/lib/query/provider";
import { AppProvider } from "@/contexts/AppContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <AppProvider>{children}</AppProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Provider Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROVIDER HIERARCHY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  <ThemeProvider>           ← Outermost (no deps)
    │
    └─ <QueryProvider>      ← React Query cache
         │
         └─ <AppProvider>   ← App-level state
              │
              └─ {children} ← Page content
```

---

## Accessibility

### Built-in from Radix UI

- **Focus management** - Automatic focus trapping in modals
- **Keyboard navigation** - Arrow keys, Enter, Escape handled
- **Screen reader** - ARIA attributes managed
- **Motion preferences** - Respects `prefers-reduced-motion`

### Accessibility Patterns

```tsx
// Always use semantic HTML
<button> // Not <div onClick>
<nav>
<main>
<article>

// Label interactive elements
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// Announce dynamic content
<div role="status" aria-live="polite">
  {isLoading && "Loading..."}
</div>

// Hide decorative elements
<Icon aria-hidden="true" />

// Associate labels with inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

---

## Performance Patterns

### Component Optimization

```tsx
// 1. Memoize expensive components
export const ExpensiveList = React.memo(function ExpensiveList({
  items,
}: {
  items: Item[];
}) {
  return items.map((item) => <Item key={item.id} item={item} />);
});

// 2. Use callback refs for measurements
export function AutoResizeTextarea() {
  const textareaRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    if (node) {
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight}px`;
    }
  }, []);

  return <textarea ref={textareaRef} />;
}

// 3. Lazy load heavy components
const DataTable = React.lazy(() => import("./DataTable"));

// 4. Use CSS for animations (not JS)
// Prefer: transition-all duration-200
// Over: useSpring, useAnimation for simple cases
```

### Bundle Optimization

```tsx
// 1. Import only what you need from lucide-react
import { Search, Menu, X } from "lucide-react"; // ✅
import * as Icons from "lucide-react"; // ❌

// 2. Dynamic imports for large components
const CommandPalette = dynamic(() => import("@/components/ui/CommandPalette"), {
  ssr: false,
});

// 3. Use "use client" only when needed
// Server components by default, client only for interactivity
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO use `cn()` for class merging**

   ```tsx
   className={cn(baseClasses, className)}
   ```

2. **DO define variants in `variants.ts`**

   ```typescript
   export const buttonVariants = cva(...)
   ```

3. **DO use `forwardRef` for DOM-wrapping components**

   ```tsx
   React.forwardRef<HTMLButtonElement, ButtonProps>;
   ```

4. **DO set `displayName` for debugging**

   ```tsx
   ComponentName.displayName = "ComponentName";
   ```

5. **DO spread remaining props**

   ```tsx
   <div {...props} />
   ```

6. **DO use Radix primitives for complex UI**

   ```tsx
   import * as Dialog from "@radix-ui/react-dialog";
   ```

7. **DO add aria-labels to icon buttons**

   ```tsx
   <button aria-label="Close">
   ```

8. **DO use CSS variables for theming**

   ```css
   bg-background text-foreground
   ```

9. **DO lazy load heavy components**

   ```tsx
   const Heavy = dynamic(() => import("./Heavy"));
   ```

10. **DO document with JSDoc and examples**
    ```tsx
    /** @example <Button variant="primary" /> */
    ```

### ❌ DON'T

1. **DON'T use inline styles**

   ```tsx
   // ❌ <div style={{ color: 'red' }} />
   // ✅ <div className="text-red-500" />
   ```

2. **DON'T create objects in render**

   ```tsx
   // ❌ <div style={{ margin: 10 }} /> (new object each render)
   ```

3. **DON'T use `any` for props**

   ```tsx
   // ❌ function Button(props: any)
   ```

4. **DON'T skip "use client" when needed**

   ```tsx
   // ❌ Using useState without "use client"
   ```

5. **DON'T import entire icon libraries**

   ```tsx
   // ❌ import * as Icons from "lucide-react"
   ```

6. **DON'T use div for interactive elements**

   ```tsx
   // ❌ <div onClick={handler}>
   // ✅ <button onClick={handler}>
   ```

7. **DON'T ignore accessibility**

   ```tsx
   // ❌ <img src="..." /> (missing alt)
   // ✅ <img src="..." alt="Description" />
   ```

8. **DON'T hardcode colors**

   ```tsx
   // ❌ text-gray-900
   // ✅ text-foreground
   ```

9. **DON'T duplicate variant logic**

   ```tsx
   // ❌ Define variants in each component
   // ✅ Centralize in variants.ts
   ```

10. **DON'T forget cleanup in effects**
    ```tsx
    // ❌ useEffect(() => { subscribe(); })
    // ✅ useEffect(() => { subscribe(); return unsubscribe; })
    ```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MEMORY.md](./MEMORY.md) - Memory-efficient components
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
