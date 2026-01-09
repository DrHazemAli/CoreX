/**
 * ============================================================================
 * COREX: Root Layout
 * Description: Application root layout with all providers and global components
 * ============================================================================
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";
import { CommandPalette, ErrorBoundary } from "@/components/ui";

// ============================================================================
// Fonts
// ============================================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ============================================================================
// Metadata
// ============================================================================

export const metadata: Metadata = {
  title: {
    default: "CoreX - Enterprise-grade foundation for scalable web apps.",
    template: "%s | CoreX",
  },
  description:
    "Enterprise-grade foundation for scalable web apps, built with Next.js, React, and TypeScript.",
  keywords: [
    "enterprise",
    "foundation",
    "scalable",
    "web apps",
    "corex",
    "starter",
    "alternatives",
    "compare",
  ],
  authors: [{ name: "Hazem Ali", url: "https://github.com/drhazemali" }],
  creator: "Hazem Ali",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CoreX",
    title: "CoreX - Enterprise-grade foundation for scalable web apps.",
    description: "Enterprise-grade foundation for scalable web apps.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CoreX - Enterprise-grade foundation for scalable web apps.",
    description: "Enterprise-grade foundation for scalable web apps.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ============================================================================
// Root Layout Component
// ============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider>
          <AppProvider>
            <QueryProvider>
              {/* ErrorBoundary catches runtime errors and displays fallback UI
                  instead of crashing the entire application.
                  Note: Error logging is handled internally by ErrorBoundary.
                  For production monitoring (Sentry, etc.), configure it inside
                  the ErrorBoundary component's componentDidCatch method. */}
              <ErrorBoundary message="Something went wrong">
                {children}
              </ErrorBoundary>
              {/* Global Components */}
              <CommandPalette />
            </QueryProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
