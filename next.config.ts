import type { NextConfig } from "next";

/**
 * Security headers for all responses
 * CSP is handled dynamically in middleware for nonce support
 */
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "0", // Disabled in favor of CSP
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
];

// Add HSTS in production
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  // Enable React Compiler
  reactCompiler: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Disable source maps in production to reduce memory usage
  productionBrowserSourceMaps: false,

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Strict mode for catching bugs early
  reactStrictMode: true,

  // For older/specific configurations, you might use experimental options:
  // experimental: {
  //   serverSourceMaps: false,
  // },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "opengraph.githubassets.com",
      },
    ],
  },

  // Exclude large files from output tracing to reduce memory
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/linux-x64",
      "node_modules/sharp",
    ],
  },

  // Experimental features
  experimental: {
    // Disable server source maps to reduce memory during build
    //serverSourceMaps: false,

    // The taint option enables support for experimental React APIs for tainting objects and values
    taint: true,

    // Enable server actions
    serverActions: {
      bodySizeLimit: "1mb",
    },

    // Optimize memory usage during builds
    webpackMemoryOptimizations: true,
  },

  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {
    // Resolve aliases
    resolveAlias: {
      "@": "./src",
    },
  },

  // Webpack configuration (fallback for non-Turbopack builds)
  webpack: (config, { dev }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        // More aggressive tree shaking
        usedExports: true,
        // Minimize memory during build
        minimize: true,
      };
    }

    // Prevent memory leaks from circular dependencies
    config.resolve = {
      ...config.resolve,
      // Faster resolution
      symlinks: false,
    };

    return config;
  },
};

export default nextConfig;
