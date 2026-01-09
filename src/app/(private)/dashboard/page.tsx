/**
 * ============================================================================
 * COREX: Dashboard Home - Enterprise Server Component
 * ============================================================================
 *
 * MEMORY & PERFORMANCE ARCHITECTURE
 * =================================
 *
 * This file demonstrates enterprise-grade patterns for:
 * - Memory optimization
 * - Stack vs Heap allocation understanding
 * - Garbage collection optimization
 * - React Server Component best practices
 *
 * STACK vs HEAP EXECUTION MODEL
 * =============================
 *
 * When this Server Component executes:
 *
 * 1. STACK ALLOCATION (Fast, automatic cleanup):
 *    - Function calls (DashboardPage, createClient)
 *    - Primitive variables (displayName: string)
 *    - References to heap objects (user, stats)
 *    - Function parameters and local variables
 *    └── Stack frames are popped automatically when function returns
 *
 * 2. HEAP ALLOCATION (Managed by V8 GC):
 *    - Objects (user, stats array, QUICK_ACTIONS)
 *    - Strings longer than ~64 bytes
 *    - Closures and their captured variables
 *    - Supabase client instance
 *    └── Garbage collected when no references exist
 *
 * MEMORY OPTIMIZATION RULES
 * =========================
 *
 * ✅ DO:
 * ------
 * - Use `const` for immutable references (helps V8 optimize)
 * - Define static data OUTSIDE components (module scope = singleton)
 * - Use Server Components for data fetching (no client-side memory)
 * - Prefer primitives over objects when possible
 * - Use early returns to minimize object creation on error paths
 * - Destructure only what you need from large objects
 * - Use Suspense boundaries to stream and release memory incrementally
 *
 * ❌ DON'T:
 * ---------
 * - Create objects in render that could be constants
 * - Store large data in component state
 * - Use closures that capture large scopes unnecessarily
 * - Create new arrays/objects in map() callbacks for static data
 * - Hold references to DOM nodes or event handlers in Server Components
 * - Use `any` type (prevents V8 hidden class optimization)
 *
 * PREVENTING MEMORY LEAKS
 * =======================
 *
 * Server Components are inherently safer because:
 * 1. No event listeners to clean up
 * 2. No subscriptions to manage
 * 3. No refs to DOM elements
 * 4. Request-scoped execution = automatic cleanup
 *
 * However, still avoid:
 * - Global mutable state
 * - Unclosed database connections (use connection pooling)
 * - Caching without bounds (use LRU cache with maxSize)
 * - Circular references in data structures
 *
 * V8 OPTIMIZATION HINTS
 * =====================
 *
 * This code is structured to help V8's optimizer:
 * 1. Consistent object shapes (TypeScript interfaces)
 * 2. Monomorphic function calls (same argument types)
 * 3. Avoid try-catch in hot paths (deoptimizes)
 * 4. Use typed arrays for large numeric data
 *
 * ============================================================================
 */

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  FolderKanban,
  Users,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// ============================================================================
// METADATA (Static - allocated once at module load)
// ============================================================================

/**
 * MEMORY: Static export - lives in module scope (singleton pattern)
 * STACK: Reference created when module is imported
 * HEAP: Object allocated once, never garbage collected during app lifetime
 */
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your dashboard overview",
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * MEMORY: Type definitions have ZERO runtime cost
 * They exist only at compile time and are erased during transpilation.
 * TypeScript types help V8 optimize by ensuring consistent object shapes.
 *
 * PRINCIPLE: "Hidden Classes"
 * V8 creates hidden classes for objects with consistent shapes.
 * Using interfaces ensures all instances have the same property order,
 * which enables V8 to optimize property access.
 */

/** Stat card data shape - consistent structure for V8 optimization */
interface StatCard {
  readonly label: string;
  readonly value: string | number;
  readonly icon: LucideIcon;
  readonly description?: string;
  readonly href?: string;
}

/** Quick action data shape */
interface QuickAction {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

/** User object shape for type safety */
interface AuthUser {
  readonly email?: string;
  readonly user_metadata?: {
    readonly full_name?: string;
  };
}

// ============================================================================
// STATIC DATA (Module Scope - Singleton Pattern)
// ============================================================================

/**
 * MEMORY OPTIMIZATION: Static data defined at module scope
 *
 * WHY MODULE SCOPE?
 * -----------------
 * - Allocated ONCE when module is first imported
 * - Shared across ALL requests (not recreated per request)
 * - Never garbage collected (intentional - reused)
 * - Reduces heap churn significantly
 *
 * HEAP ALLOCATION:
 * - This array and its objects are allocated on the heap
 * - The reference (QUICK_ACTIONS) is a constant pointer
 * - V8 can inline this data for faster access
 *
 * ✅ DO: Define static UI configuration here
 * ❌ DON'T: Put user-specific or request-specific data here
 *
 * `as const` ensures:
 * - Object is deeply readonly (frozen at type level)
 * - Literal types are preserved
 * - Better tree-shaking by bundler
 */
const QUICK_ACTIONS = [
  {
    title: "Projects",
    description: "Manage your projects and tasks",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    title: "Analytics",
    description: "View insights and metrics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Team",
    description: "Manage team members and roles",
    href: "/dashboard/team",
    icon: Users,
  },
  {
    title: "Settings",
    description: "Configure your preferences",
    href: "/dashboard/settings",
    icon: Settings,
  },
] as const satisfies readonly QuickAction[];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

/**
 * Dashboard Page - Async Server Component
 *
 * EXECUTION FLOW & MEMORY:
 * ========================
 *
 * 1. REQUEST RECEIVED
 *    └── Stack frame created for DashboardPage()
 *
 * 2. SUPABASE CLIENT CREATION
 *    ├── Stack: createClient function call
 *    ├── Heap: Supabase client instance (connection pooled)
 *    └── Note: Client is request-scoped, auto-cleanup after response
 *
 * 3. AUTH CHECK
 *    ├── Stack: getUser() call, destructuring
 *    ├── Heap: user object (if authenticated)
 *    └── Early return on !user prevents unnecessary allocations
 *
 * 4. DATA FETCHING
 *    ├── Stack: Promise.all call, await
 *    ├── Heap: Result objects from queries
 *    └── Tip: Use Promise.all for parallel fetching
 *
 * 5. RENDER
 *    ├── Stack: JSX function calls
 *    ├── Heap: React element tree (serialized to HTML)
 *    └── Server Components serialize to wire format, not kept in memory
 *
 * 6. RESPONSE SENT
 *    └── All stack frames popped, heap objects eligible for GC
 *
 * MEMORY LIFECYCLE:
 * - Request start: ~0.5KB stack, ~10KB heap (typical)
 * - During data fetch: Peak memory usage
 * - After response: Everything eligible for GC
 */
export default async function DashboardPage(): Promise<React.JSX.Element> {
  // ==========================================================================
  // AUTHENTICATION (Early exit pattern)
  // ==========================================================================

  /**
   * MEMORY OPTIMIZATION: Early return pattern
   *
   * If user is not authenticated, we redirect BEFORE allocating
   * any data-fetching resources. This prevents unnecessary heap
   * allocations for unauthenticated requests.
   *
   * STACK: supabase reference, user destructured reference
   * HEAP: Supabase client (pooled), user object
   */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Early return - prevents further allocations for unauth'd users
  if (!user) {
    redirect("/login");
  }

  // ==========================================================================
  // DATA FETCHING (Would use Promise.all in production)
  // ==========================================================================

  /**
   * PRODUCTION PATTERN: Parallel Data Fetching
   *
   * Use Promise.all() for independent queries:
   *
   * ```ts
   * const [projects, analytics, notifications] = await Promise.all([
   *   projectsRepo.findByUserId(user.id),
   *   analyticsService.getDashboard(user.id),
   *   notificationsRepo.getUnread(user.id),
   * ]);
   * ```
   *
   * MEMORY BENEFIT:
   * - Total time = max(query times) not sum
   * - V8 can optimize parallel promise resolution
   * - Connection pool handles concurrent queries efficiently
   */

  // Example stats - in production, fetch from database
  // Note: This array is created per-request (not cached)
  const stats: readonly StatCard[] = [
    {
      label: "Total Projects",
      value: 12,
      icon: FolderKanban,
      description: "+2 this week",
      href: "/dashboard/projects",
    },
    {
      label: "Active Users",
      value: 48,
      icon: Users,
      description: "+5 this month",
      href: "/dashboard/team",
    },
    {
      label: "Analytics",
      value: "98%",
      icon: BarChart3,
      description: "Health score",
      href: "/dashboard/analytics",
    },
  ];

  // ==========================================================================
  // DERIVED DATA (Computed once, not in render)
  // ==========================================================================

  /**
   * MEMORY OPTIMIZATION: Compute derived data outside JSX
   *
   * WHY?
   * - Computed once, not on every render cycle
   * - Easier to debug (can log intermediate values)
   * - V8 can optimize string operations better when isolated
   *
   * STACK: displayName string reference
   * HEAP: The string value (interned if small)
   */
  const displayName = extractDisplayName(user);

  // ==========================================================================
  // RENDER (Server Component - serializes to HTML)
  // ==========================================================================

  /**
   * SERVER COMPONENT RENDERING:
   *
   * Unlike Client Components, Server Components:
   * 1. Don't maintain state between renders
   * 2. Don't have lifecycle methods
   * 3. Serialize directly to HTML/RSC payload
   * 4. Don't send component code to client
   *
   * MEMORY: JSX elements are temporary heap objects that get
   * serialized and then garbage collected.
   */
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <DashboardHeader displayName={displayName} />

      {/* Stats Grid - renders readonly array */}
      <section aria-label="Statistics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCardComponent key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* Quick Actions - renders module-scoped constant */}
      <section aria-label="Quick actions">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>
      </section>

      {/* Getting Started Guide */}
      <GettingStartedSection />
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS (Pure, no side effects)
// ============================================================================

/**
 * Extract display name from user object
 *
 * MEMORY: Pure function - no closures, no captured variables
 * V8 can inline this function for better performance.
 *
 * @param user - Authenticated user object
 * @returns Display name string
 */
function extractDisplayName(user: AuthUser): string {
  if (user.user_metadata?.full_name) {
    // Split creates new array on heap - acceptable for small strings
    return user.user_metadata.full_name.split(" ")[0];
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return "there";
}

// ============================================================================
// SUB-COMPONENTS (Colocated for clarity)
// ============================================================================

/**
 * Dashboard Header Component
 *
 * MEMORY: Props are passed by reference (no copy)
 * Small components like this are good candidates for inlining by V8.
 */
function DashboardHeader({
  displayName,
}: {
  readonly displayName: string;
}): React.JSX.Element {
  return (
    <header>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {displayName}!
        </h1>
      </div>
      <p className="text-muted-foreground">
        Here&apos;s an overview of your workspace.
      </p>
    </header>
  );
}

/**
 * Stat Card Component
 *
 * PATTERNS:
 * - Uses readonly prop type to signal immutability
 * - Conditional rendering with early content definition
 * - No inline object creation in JSX
 */
function StatCardComponent({
  stat,
}: {
  readonly stat: StatCard;
}): React.JSX.Element {
  // Pre-compute conditional class to avoid inline ternary in JSX
  const cardClassName = stat.href
    ? "hover:border-primary/50 transition-colors"
    : "";

  const content = (
    <Card variant="default" padding="md" className={cardClassName}>
      <CardContent className="p-0">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <stat.icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            {stat.description && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {stat.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Conditional wrapper - Link or fragment
  return stat.href ? <Link href={stat.href}>{content}</Link> : content;
}

/**
 * Quick Action Card Component
 */
function QuickActionCard({
  action,
}: {
  readonly action: QuickAction;
}): React.JSX.Element {
  return (
    <Link href={action.href}>
      <Card
        variant="default"
        padding="md"
        className="h-full hover:border-primary/50 transition-colors group"
      >
        <CardContent className="p-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <action.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">{action.title}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {action.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Getting Started Section
 *
 * MEMORY: Static content - could be extracted to module scope
 * if this component is rendered frequently. For dashboard,
 * per-request allocation is acceptable.
 */
function GettingStartedSection(): React.JSX.Element {
  return (
    <section aria-label="Getting started">
      <Card variant="default" padding="lg">
        <CardHeader className="pb-4">
          <CardTitle>Getting Started with CoreX</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              This dashboard is a starting point for your application. Here are
              some next steps:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Add your own pages in{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                  src/app/(dashboard)/dashboard/
                </code>
              </li>
              <li>
                Create reusable widgets in{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                  src/components/dashboard/
                </code>
              </li>
              <li>
                Define API schemas in{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                  src/schemas/api/v1/
                </code>
              </li>
              <li>
                Implement use cases in{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                  src/application/usecases/
                </code>
              </li>
            </ul>

            {/* Architecture reminder */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">
                📐 Architecture Tips
              </h4>
              <ul className="space-y-1 text-xs">
                <li>
                  • <strong>Types:</strong> Define in <code>src/types/</code>{" "}
                  for domain models
                </li>
                <li>
                  • <strong>Schemas:</strong> Define in{" "}
                  <code>src/schemas/api/</code> for API contracts
                </li>
                <li>
                  • <strong>Never use `any`:</strong> Always declare explicit
                  types
                </li>
                <li>
                  • <strong>Memory:</strong> Use Server Components for data
                  fetching
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
