/**
 * ============================================================================
 * COREX: Main App Layout
 * Description: Layout for main application pages with header and footer
 * ============================================================================
 */

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
