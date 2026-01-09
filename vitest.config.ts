import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: "jsdom",

    // Global test APIs (describe, it, expect, etc.)
    globals: true,

    // Setup files (runs before each test file)
    setupFiles: ["./vitest.setup.ts"],

    // Include patterns
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],

    // Exclude patterns
    exclude: ["node_modules", ".next", "scripts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        ".next/",
        "scripts/",
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs}",
        "**/index.ts", // barrel exports
        "src/components/ui/**", // UI primitives
        "src/types/**", // Type definitions
      ],
      // Thresholds (uncomment to enforce)
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },

    // Type checking (optional - can slow down tests)
    // typecheck: {
    //   enabled: true,
    // },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
