/**
 * ============================================================================
 * COREX: Welcome Page (Server Component)
 * Description: Performance-optimized landing page demonstrating best practices
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    PAGE PERFORMANCE PRINCIPLES                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ ✅ Server Component (default) - No 'use client' directive              │
 * │ ✅ Zero JavaScript shipped to client for static content                │
 * │ ✅ No useState/useEffect - eliminates hydration & re-renders           │
 * │ ✅ Static data defined outside component (no recreation on render)     │
 * │ ✅ Semantic HTML for accessibility and SEO                             │
 * │ ✅ CSS-only interactions where possible (hover states via Tailwind)    │
 * │ ✅ Proper heading hierarchy (h1 → h2 → h3)                             │
 * │ ✅ Metadata exported for SEO optimization                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHEN TO USE 'use client':
 * - Interactive forms with controlled inputs
 * - onClick handlers that update UI state
 * - useEffect for browser APIs (localStorage, etc.)
 * - Third-party client libraries (charts, maps)
 *
 * WHEN TO STAY SERVER COMPONENT:
 * - Static content pages (like this one)
 * - Data fetching pages (use async/await directly)
 * - Pages that don't need interactivity
 * - Layout components
 * ============================================================================
 */

import Link from "next/link";
import type { Metadata } from "next";

// ============================================================================
// METADATA (SEO)
// ============================================================================

/**
 * Page metadata for SEO
 * Exported as a constant for static generation
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/metadata
 */
export const metadata: Metadata = {
  title: "Welcome | Next.js Starter",
  description:
    "A production-ready Next.js starter with clean architecture, TypeScript, Tailwind CSS, and Supabase.",
  openGraph: {
    title: "Next.js Starter - Clean Architecture Template",
    description: "Production-ready Next.js template with best practices.",
  },
};

// ============================================================================
// STATIC DATA (Defined outside component - no re-creation on render)
// ============================================================================

/**
 * Feature list - static data defined outside component
 * This prevents array recreation on every render
 */
const features = [
  {
    emoji: "🏗️",
    title: "Clean Architecture",
    description: "Layered structure: Core → Application → DAL → Server",
  },
  {
    emoji: "🔒",
    title: "Type Safety",
    description: "Full TypeScript with Zod schemas for runtime validation",
  },
  {
    emoji: "⚡",
    title: "Performance First",
    description: "Server Components by default, minimal client JavaScript",
  },
  {
    emoji: "🎨",
    title: "Tailwind CSS 4",
    description: "Modern styling with dark mode and design tokens",
  },
  {
    emoji: "🗄️",
    title: "Supabase Ready",
    description: "Pre-configured auth, database, and storage clients",
  },
  {
    emoji: "🤖",
    title: "LLM-Friendly",
    description: "Well-documented code optimized for AI assistance",
  },
] as const;

/**
 * Architecture layers - static reference data
 */
const layers = [
  { name: "Core", path: "src/core/", desc: "Pure functions, no dependencies" },
  {
    name: "Application",
    path: "src/application/",
    desc: "Use cases, orchestration",
  },
  { name: "DAL", path: "src/dal/", desc: "Database access, repositories" },
  { name: "Server", path: "src/server/", desc: "HTTP, auth, rate limiting" },
] as const;

// ============================================================================
// PAGE COMPONENT (Server Component - No 'use client')
// ============================================================================

/**
 * Welcome Page
 *
 * This is a Server Component by default:
 * - Renders on the server
 * - Ships zero JavaScript for this component
 * - No hydration needed
 * - Excellent Core Web Vitals
 *
 * @returns Static HTML rendered on server
 */
export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ================================================================
          HERO SECTION
          - Semantic <section> with aria-label for accessibility
          - CSS-only hover states (no JS needed)
          ================================================================ */}
      <section aria-label="Welcome" className="relative py-20 md:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge - Pure CSS styling */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-sm font-medium mb-6">
            <span aria-hidden="true">🚀</span>
            <span>Next.js Starter Template</span>
          </div>

          {/* H1 - Only one per page for SEO */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Build Fast.
            <br />
            <span className="text-muted-foreground">Ship Faster.</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A production-ready Next.js template with clean architecture,
            TypeScript, Tailwind CSS, and Supabase. Optimized for performance
            and developer experience.
          </p>

          {/* CTA Buttons - Using native anchor for external link */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/api/v1/sample"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              Try Sample API
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border font-medium hover:bg-secondary transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES SECTION
          - Grid layout with CSS (no JS animations)
          - hover:scale uses CSS transforms (GPU accelerated)
          ================================================================ */}
      <section
        aria-labelledby="features-heading"
        className="py-20 border-t border-border"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="features-heading"
            className="text-2xl md:text-3xl font-bold text-center mb-12"
          >
            What&apos;s Included
          </h2>

          {/* Feature Grid - CSS Grid, no JS */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border hover:border-foreground/20 transition-colors"
              >
                <div className="text-2xl mb-3" aria-hidden="true">
                  {feature.emoji}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          ARCHITECTURE SECTION
          - Demonstrates the project structure
          - Uses <code> for paths (semantic HTML)
          ================================================================ */}
      <section
        aria-labelledby="architecture-heading"
        className="py-20 border-t border-border bg-secondary/30"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="architecture-heading"
            className="text-2xl md:text-3xl font-bold text-center mb-4"
          >
            Clean Architecture
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Organized in layers with strict dependency rules. Each layer has a
            single responsibility.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {layers.map((layer) => (
              <div
                key={layer.name}
                className="p-5 rounded-xl bg-background border border-border"
              >
                <code className="text-xs font-mono text-muted-foreground">
                  {layer.path}
                </code>
                <h3 className="text-lg font-semibold mt-2 mb-1">
                  {layer.name}
                </h3>
                <p className="text-sm text-muted-foreground">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          GETTING STARTED SECTION
          - Code block with proper <pre><code> semantics
          ================================================================ */}
      <section
        aria-labelledby="getting-started-heading"
        className="py-20 border-t border-border"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            id="getting-started-heading"
            className="text-2xl md:text-3xl font-bold mb-4"
          >
            Get Started
          </h2>
          <p className="text-muted-foreground mb-8">
            Clone the repository and start building in minutes.
          </p>

          {/* Code block - semantic HTML */}
          <pre className="p-4 bg-secondary rounded-lg overflow-x-auto text-left mb-8">
            <code className="text-sm font-mono">
              git clone https://github.com/your-repo/corex.git{"\n"}
              cd corex{"\n"}
              npm install{"\n"}
              npm run dev
            </code>
          </pre>

          <Link
            href="/api/v1/sample"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
          >
            Explore the API →
          </Link>
        </div>
      </section>
    </main>
  );
}
