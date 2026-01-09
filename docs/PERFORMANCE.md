# Performance Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Framework**: Next.js 16 (App Router)

## Table of Contents

1. [Overview](#overview)
2. [Core Web Vitals](#core-web-vitals)
3. [Server Components](#server-components)
4. [Data Fetching](#data-fetching)
5. [Caching Strategies](#caching-strategies)
6. [Bundle Optimization](#bundle-optimization)
7. [Image Optimization](#image-optimization)
8. [Code Splitting](#code-splitting)
9. [Database Performance](#database-performance)
10. [Monitoring](#monitoring)
11. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

Performance is a feature, not an afterthought.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE PYRAMID                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                      ┌───────────┐
                      │  Monitor  │  ← Measure continuously
                     ─┴───────────┴─
                    ┌───────────────┐
                    │    Cache     │  ← Multi-level caching
                   ─┴───────────────┴─
                  ┌─────────────────────┐
                  │   Lazy Loading     │  ← Load on demand
                 ─┴─────────────────────┴─
                ┌─────────────────────────┐
                │   Minimize Bundle      │  ← Ship less JavaScript
               ─┴─────────────────────────┴─
              ┌─────────────────────────────┐
              │   Server Components         │  ← Zero JS by default
             ─┴─────────────────────────────┴─
            ┌───────────────────────────────────┐
            │   Efficient Data Fetching         │  ← Right data, right time
           ─┴───────────────────────────────────┴─
```

### Performance Principles

| Principle              | Implementation                   |
| ---------------------- | -------------------------------- |
| **Server First**       | Default to Server Components     |
| **Minimal JS**         | Only ship JavaScript when needed |
| **Cache Aggressively** | Multi-level caching strategy     |
| **Measure Always**     | Monitor Core Web Vitals          |
| **Optimize Images**    | Use Next.js Image component      |

---

## Core Web Vitals

### Target Metrics

| Metric   | Target  | Description               |
| -------- | ------- | ------------------------- |
| **LCP**  | < 2.5s  | Largest Contentful Paint  |
| **INP**  | < 200ms | Interaction to Next Paint |
| **CLS**  | < 0.1   | Cumulative Layout Shift   |
| **FCP**  | < 1.8s  | First Contentful Paint    |
| **TTFB** | < 800ms | Time to First Byte        |

### Measurement Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CORE WEB VITALS FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  Request
     │
     ▼
  ┌─────────────────┐
  │     TTFB        │  Server response time
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │     FCP         │  First content visible
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │     LCP         │  Largest content visible
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │     INP         │  Response to interactions
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │     CLS         │  Visual stability
  └─────────────────┘
```

### Improving Each Metric

```typescript
// LCP - Optimize largest content element
// ✅ Preload critical images
<link rel="preload" href="/hero.jpg" as="image" />

// INP - Keep interactions fast
// ✅ Use useTransition for non-urgent updates
const [isPending, startTransition] = useTransition();
startTransition(() => setFilter(newFilter));

// CLS - Prevent layout shifts
// ✅ Set explicit dimensions
<Image width={800} height={600} alt="..." />

// FCP - Render content quickly
// ✅ Use Server Components for initial content

// TTFB - Fast server response
// ✅ Edge caching, efficient queries
```

---

## Server Components

### Server vs Client Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPONENT DECISION TREE                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Does it need useState/useEffect?
         │
    ┌────┴────┐
    │ Yes     │ No
    ▼         ▼
  CLIENT    Does it have event handlers?
              │
         ┌────┴────┐
         │ Yes     │ No
         ▼         ▼
       CLIENT    Does it use browser APIs?
                   │
              ┌────┴────┐
              │ Yes     │ No
              ▼         ▼
            CLIENT    SERVER ✅ (Default)
```

### Server Component Best Practices

```tsx
// ✅ Default: Server Component (no 'use client')
async function ProductList() {
  // Direct database access - no API call needed
  const products = await db.query("SELECT * FROM products");

  return (
    <ul>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}

// ✅ Pass data to Client Components
<InteractiveFilter initialProducts={products} />;
```

### Client Component Best Practices

```tsx
"use client";

// ✅ Minimal Client Component - only interactive parts
function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => addToCart(productId))}
      disabled={isPending}
    >
      Add to Cart
    </button>
  );
}
```

---

## Data Fetching

### Parallel Data Fetching

```typescript
// ✅ Fetch in parallel
async function Dashboard() {
  // These run concurrently
  const [user, stats, notifications] = await Promise.all([
    getUser(),
    getStats(),
    getNotifications(),
  ]);

  return <DashboardContent user={user} stats={stats} notifications={notifications} />;
}

// ❌ Sequential fetching (slower)
async function DashboardSlow() {
  const user = await getUser();           // 200ms
  const stats = await getStats();         // 200ms
  const notifications = await getNotifications(); // 200ms
  // Total: 600ms
}
```

### Select Only What You Need

```typescript
// ✅ Select specific columns
const { data } = await supabase
  .from("users")
  .select("id, name, email") // Only needed fields
  .limit(20);

// ❌ Select everything
const { data } = await supabase.from("users").select("*"); // Fetches all columns including large ones
```

### Pagination

```typescript
// ✅ Always paginate large datasets
async function getUsers(page: number, limit: number = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count } = await supabase
    .from("users")
    .select("*", { count: "exact" })
    .range(from, to)
    .order("created_at", { ascending: false });

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil((count ?? 0) / limit),
    },
  };
}
```

---

## Caching Strategies

### Multi-Level Cache

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CACHING LAYERS                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │  L1: React      │  Browser memory
  │  Query Cache    │  staleTime: 5min
  └────────┬────────┘
           │ Miss
           ▼
  ┌─────────────────┐
  │  L2: HTTP       │  Browser/CDN
  │  Cache          │  Cache-Control headers
  └────────┬────────┘
           │ Miss
           ▼
  ┌─────────────────┐
  │  L3: Redis      │  Server-side
  │  (Upstash)      │  TTL: 5-60min
  └────────┬────────┘
           │ Miss
           ▼
  ┌─────────────────┐
  │  L4: Database   │  Source of truth
  │  (Supabase)     │
  └─────────────────┘
```

### React Query Configuration

```typescript
// src/lib/query/provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### HTTP Cache Headers

```typescript
// Route handler with caching
export async function GET(request: NextRequest) {
  const data = await getPublicData();

  return NextResponse.json(data, {
    headers: {
      // Cache for 60s, serve stale while revalidating
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
```

### Next.js Data Cache

```typescript
// Revalidate after 60 seconds
async function getData() {
  const res = await fetch("https://api.example.com/data", {
    next: { revalidate: 60 },
  });
  return res.json();
}

// Static generation with ISR
export const revalidate = 60; // Revalidate page every 60 seconds
```

---

## Bundle Optimization

### Analyze Bundle

```bash
# Install analyzer
pnpm add -D @next/bundle-analyzer

# next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true pnpm build
```

### Tree Shaking

```typescript
// ✅ Import only what you need
import { Button } from "@/components/ui";
import { debounce } from "lodash-es"; // ES modules tree-shake

// ❌ Import entire libraries
import * as UI from "@/components/ui";
import _ from "lodash"; // Imports everything
```

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

// ✅ Load heavy components on demand
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Skip server rendering if not needed
});

// ✅ Load on interaction
const Modal = dynamic(() => import('./Modal'));

function Component() {
  const [showModal, setShowModal] = useState(false);

  return (
    <button onClick={() => setShowModal(true)}>
      Open Modal
    </button>
    {showModal && <Modal />}
  );
}
```

---

## Image Optimization

### Next.js Image Component

```tsx
import Image from 'next/image';

// ✅ Optimized image with proper sizing
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority  // Preload above-the-fold images
  placeholder="blur"
  blurDataURL={blurUrl}
/>

// ✅ Responsive images
<Image
  src="/photo.jpg"
  alt="Photo"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  className="object-cover"
/>
```

### Image Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IMAGE OPTIMIZATION                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ✅ DO
  ──────
  • Use Next.js Image component
  • Set explicit width/height to prevent CLS
  • Use priority for above-the-fold images
  • Use blur placeholder for LCP images
  • Use appropriate sizes attribute

  ❌ DON'T
  ─────────
  • Use <img> tags directly
  • Skip width/height attributes
  • Serve unoptimized images
  • Load all images eagerly
```

---

## Code Splitting

### Route-Based Splitting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CODE SPLITTING                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  app/
  ├── page.tsx          ──► Bundle: main
  ├── about/page.tsx    ──► Bundle: about  (lazy loaded)
  ├── blog/page.tsx     ──► Bundle: blog   (lazy loaded)
  └── dashboard/        ──► Bundle: dashboard (lazy loaded)
      ├── page.tsx
      └── settings/
          └── page.tsx  ──► Bundle: dashboard-settings

  Each route = separate bundle, loaded on navigation
```

### Component-Level Splitting

```typescript
// ✅ Split heavy components
const Editor = dynamic(() => import('./Editor'), {
  loading: () => <EditorSkeleton />,
});

const DataViz = dynamic(() => import('./DataVisualization'), {
  ssr: false,  // Client-only
});

// ✅ Conditional loading
function Dashboard() {
  const [tab, setTab] = useState('overview');

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsContent value="overview">
        <Overview />
      </TabsContent>
      <TabsContent value="analytics">
        {/* Only loads when tab is selected */}
        <Suspense fallback={<Loading />}>
          <Analytics />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
```

---

## Database Performance

### Query Optimization

```typescript
// ✅ Use indexes
// In Supabase: CREATE INDEX idx_users_email ON users(email);

// ✅ Limit results
const { data } = await supabase.from("posts").select("id, title").limit(20);

// ✅ Avoid N+1 queries - use joins
const { data } = await supabase.from("posts").select(`
    id,
    title,
    author:users(id, name)
  `);

// ❌ N+1 query pattern
const posts = await getPosts();
for (const post of posts) {
  post.author = await getUser(post.authorId); // One query per post!
}
```

### Connection Pooling

```typescript
// Supabase handles connection pooling automatically
// For custom databases:
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Efficient Pagination

```typescript
// ✅ Cursor-based pagination (better for large datasets)
async function getNextPage(cursor?: string) {
  let query = supabase
    .from("posts")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data } = await query;

  return {
    data,
    nextCursor: data?.[data.length - 1]?.created_at,
  };
}
```

---

## Monitoring

### Performance Monitoring Setup

```typescript
// src/lib/performance.ts
export function reportWebVitals(metric: Metric) {
  // Send to analytics
  if (process.env.NODE_ENV === "production") {
    fetch("/api/analytics/vitals", {
      method: "POST",
      body: JSON.stringify(metric),
    });
  }

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log(metric.name, metric.value);
  }
}

// In layout.tsx or _app.tsx
import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals(reportWebVitals);
  return null;
}
```

### Key Metrics to Track

| Metric          | Target  | Alert Threshold |
| --------------- | ------- | --------------- |
| LCP             | < 2.5s  | > 4s            |
| INP             | < 200ms | > 500ms         |
| CLS             | < 0.1   | > 0.25          |
| TTFB            | < 800ms | > 1.8s          |
| Error Rate      | < 1%    | > 5%            |
| API Latency P95 | < 500ms | > 1s            |

---

## DO's and DON'Ts

### ✅ DO

1. **DO use Server Components by default**

   ```tsx
   // No 'use client' = Server Component
   async function Page() { ... }
   ```

2. **DO fetch data in parallel**

   ```typescript
   const [a, b, c] = await Promise.all([...]);
   ```

3. **DO set explicit image dimensions**

   ```tsx
   <Image width={800} height={600} ... />
   ```

4. **DO use dynamic imports for heavy components**

   ```typescript
   const Heavy = dynamic(() => import("./Heavy"));
   ```

5. **DO paginate large datasets**

   ```typescript
   .range(from, to).limit(20)
   ```

6. **DO cache aggressively**

   ```typescript
   'Cache-Control': 'public, max-age=60'
   ```

7. **DO use React Query for client data**

   ```typescript
   staleTime: 5 * 60 * 1000;
   ```

8. **DO select only needed columns**

   ```typescript
   .select('id, name, email')
   ```

9. **DO use useTransition for non-urgent updates**

   ```typescript
   startTransition(() => setFilter(value));
   ```

10. **DO monitor Core Web Vitals**
    ```typescript
    useReportWebVitals(reportWebVitals);
    ```

### ❌ DON'T

1. **DON'T add 'use client' unnecessarily**

   ```tsx
   // ❌ 'use client' for static content
   ```

2. **DON'T fetch sequentially**

   ```typescript
   // ❌ const a = await x; const b = await y;
   ```

3. **DON'T use `<img>` tags**

   ```tsx
   // ❌ <img src="/photo.jpg" />
   ```

4. **DON'T import entire libraries**

   ```typescript
   // ❌ import _ from 'lodash';
   ```

5. **DON'T fetch all data at once**

   ```typescript
   // ❌ SELECT * FROM posts (no limit)
   ```

6. **DON'T disable caching without reason**

   ```typescript
   // ❌ 'Cache-Control': 'no-store'
   ```

7. **DON'T create N+1 queries**

   ```typescript
   // ❌ for (item of items) await fetch(item.id);
   ```

8. **DON'T block the main thread**

   ```typescript
   // ❌ Heavy computation in render
   ```

9. **DON'T skip loading states**

   ```tsx
   // ❌ No Suspense boundaries
   ```

10. **DON'T ignore performance metrics**
    ```typescript
    // ❌ No monitoring in production
    ```

---

## Quick Reference

### Bundle Size Limits

| Type          | Target    | Max         |
| ------------- | --------- | ----------- |
| First Load JS | < 100KB   | 200KB       |
| Page JS       | < 50KB    | 100KB       |
| Component     | < 20KB    | 50KB        |
| Image         | Optimized | Original/10 |

### Cache Duration Guide

| Data Type      | Cache Duration          |
| -------------- | ----------------------- |
| Static assets  | 1 year (immutable)      |
| Public API     | 1-5 minutes             |
| User data      | 0 (no cache) or private |
| Search results | 30-60 seconds           |

---

## Related Documentation

- [CACHING.md](./CACHING.md) - Detailed caching strategies
- [MEMORY.md](./MEMORY.md) - Memory optimization
- [COMPONENTS.md](./COMPONENTS.md) - Component patterns
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - General best practices
