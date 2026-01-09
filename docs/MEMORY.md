# Memory Management Guide (CRITICAL)

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Criticality**: High - Affects application stability and performance

## Table of Contents

1. [Overview](#overview)
2. [JavaScript Memory Model](#javascript-memory-model)
3. [Memory Lifecycle](#memory-lifecycle)
4. [Common Memory Leak Patterns](#common-memory-leak-patterns)
5. [Next.js Specific Concerns](#nextjs-specific-concerns)
6. [React Memory Patterns](#react-memory-patterns)
7. [Server-Side Memory Management](#server-side-memory-management)
8. [Database Connection Pooling](#database-connection-pooling)
9. [Caching Memory Strategies](#caching-memory-strategies)
10. [Memory Profiling Tools](#memory-profiling-tools)
11. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

Memory management is **critical** in JavaScript applications because:

1. **No manual memory control** - Garbage collector handles deallocation
2. **Reference counting limitations** - Circular references can leak
3. **Long-running server processes** - Memory accumulates over time
4. **Single-threaded event loop** - Memory pressure blocks all operations

### Memory-Related Failures

| Issue                | Symptom                      | Impact                  |
| -------------------- | ---------------------------- | ----------------------- |
| Memory Leak          | Gradual heap growth          | OOM crash, pod restarts |
| Retain Cycle         | Objects never GC'd           | Heap exhaustion         |
| Large Closures       | Excessive memory per request | High memory baseline    |
| Unbounded Caches     | Linear memory growth         | Memory exhaustion       |
| Event Listener Leaks | DOM/Node detachment fails    | Memory never freed      |

---

## JavaScript Memory Model

### Stack vs Heap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JAVASCRIPT MEMORY MODEL                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐
  │            STACK                │    │              HEAP               │
  │        (Fast, Limited)          │    │        (Large, Slower)          │
  ├─────────────────────────────────┤    ├─────────────────────────────────┤
  │                                 │    │                                 │
  │  • Primitive values             │    │  • Objects                      │
  │    - number                     │    │  • Arrays                       │
  │    - string (small)             │    │  • Functions                    │
  │    - boolean                    │    │  • Closures                     │
  │    - null                       │    │  • Class instances              │
  │    - undefined                  │    │  • String (large)               │
  │    - symbol                     │    │  • RegExp                       │
  │    - bigint                     │    │                                 │
  │                                 │    │                                 │
  │  • Function call frames         │    │  Reference stored on stack:     │
  │  • Primitive local variables    │    │    ┌─────┐      ┌──────────┐   │
  │                                 │    │    │ ref │ ───▶ │ {object} │   │
  │  Size: ~1MB per thread          │    │    └─────┘      └──────────┘   │
  │                                 │    │                                 │
  │  Auto cleanup on function exit  │    │  GC cleanup when unreachable   │
  │                                 │    │                                 │
  └─────────────────────────────────┘    └─────────────────────────────────┘
```

### Reference Counting and Mark-and-Sweep

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GARBAGE COLLECTION PHASES                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Phase 1: MARK                           Phase 2: SWEEP
  ─────────────────                       ──────────────

  Start from roots:                       Remove unmarked objects:
  ┌─────────────┐                         ┌─────────────┐
  │   Global    │                         │   HEAP      │
  │   Object    │                         │             │
  └──────┬──────┘                         │  [Obj A] ✓  │ → Keep
         │                                │  [Obj B] ✗  │ → FREE
         ▼                                │  [Obj C] ✓  │ → Keep
  ┌──────────────┐                        │  [Obj D] ✗  │ → FREE
  │   window/    │                        │  [Obj E] ✓  │ → Keep
  │   global     │                        │             │
  └──────┬───────┘                        └─────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  [Obj A]   [Obj C]────▶[Obj E]

  Marked: A, C, E
  Unmarked: B, D (will be freed)
```

---

## Memory Lifecycle

### Object Lifecycle in CoreX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OBJECT LIFECYCLE IN COREX                            │
└─────────────────────────────────────────────────────────────────────────────┘

  REQUEST SCOPE                        APPLICATION SCOPE
  ─────────────                        ─────────────────

  Request Start                        Server Start
       │                                    │
       ▼                                    ▼
  ┌─────────────┐                    ┌─────────────┐
  │   Create    │                    │   Create    │
  │  Request    │                    │  Singleton  │
  │  Context    │                    │  Services   │
  └──────┬──────┘                    └──────┬──────┘
         │                                  │
         ▼                                  │
  ┌─────────────┐                          │ Lives for
  │   Create    │                          │ entire
  │   Scoped    │                          │ process
  │   Services  │                          │
  └──────┬──────┘                          │
         │                                  │
         ▼                                  │
  ┌─────────────┐                          │
  │   Execute   │                          │
  │   Handler   │◀─────────────────────────┤
  └──────┬──────┘   Uses singletons        │
         │                                  │
         ▼                                  │
  ┌─────────────┐                          │
  │   Send      │                          │
  │  Response   │                          │
  └──────┬──────┘                          │
         │                                  │
         ▼                                  │
  ┌─────────────┐                          │
  │   Dispose   │                          │
  │   Scoped    │                          │
  │  Resources  │                          │
  └──────┬──────┘                          │
         │                                  │
         ▼                                  │
    Request End                        Server Shutdown
         │                                  │
         ▼                                  ▼
      GC runs                          Process exits
```

---

## Common Memory Leak Patterns

### 1. Closure Retain Cycles

```typescript
// ❌ MEMORY LEAK: Closure captures entire outer scope
function createLeak() {
  const hugeData = new Array(1_000_000).fill("x");

  return function handler() {
    // Only needs one property but captures ALL of hugeData
    console.log(hugeData.length);
  };
}

// The returned handler keeps hugeData alive forever!
const leakyHandler = createLeak(); // hugeData never freed
```

```typescript
// ✅ CORRECT: Capture only what you need
function createEfficient() {
  const hugeData = new Array(1_000_000).fill("x");
  const length = hugeData.length; // Extract needed value

  return function handler() {
    console.log(length); // Only captures primitive
  };
  // hugeData can now be garbage collected!
}
```

### 2. Event Listener Leaks

```typescript
// ❌ MEMORY LEAK: Listener never removed
class LeakyComponent {
  private data: string[] = [];

  mount() {
    window.addEventListener("resize", () => {
      this.handleResize(); // Closure captures `this`
    });
  }

  // Component unmounts but listener remains!
  // `this` (and this.data) can never be GC'd
}
```

```typescript
// ✅ CORRECT: Store reference and cleanup
class CleanComponent {
  private data: string[] = [];
  private resizeHandler: (() => void) | null = null;

  mount() {
    this.resizeHandler = () => this.handleResize();
    window.addEventListener("resize", this.resizeHandler);
  }

  unmount() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}
```

### 3. Unbounded Cache Growth

```typescript
// ❌ MEMORY LEAK: Cache grows forever
const cache = new Map<string, object>();

function getData(key: string): object {
  if (!cache.has(key)) {
    cache.set(key, fetchData(key)); // Never evicted!
  }
  return cache.get(key)!;
}
```

```typescript
// ✅ CORRECT: Use LRU cache with max size
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}

const cache = new LRUCache<string, object>(1000); // Max 1000 items
```

### 4. Timer/Interval Leaks

```typescript
// ❌ MEMORY LEAK: Interval never cleared
function startPolling(callback: () => void) {
  setInterval(() => {
    callback(); // Runs forever!
  }, 5000);
}
```

```typescript
// ✅ CORRECT: Return cleanup function
function startPolling(callback: () => void): () => void {
  const intervalId = setInterval(callback, 5000);

  return function cleanup() {
    clearInterval(intervalId);
  };
}

// Usage
const stopPolling = startPolling(fetchData);
// Later...
stopPolling();
```

### 5. Promise Chain Memory

```typescript
// ❌ MEMORY PRESSURE: Large chain keeps all data in memory
async function processItems(items: Item[]) {
  const results = [];
  for (const item of items) {
    const result = await heavyProcess(item); // Sequential
    results.push(result);
  }
  return results; // All results in memory
}
```

```typescript
// ✅ CORRECT: Stream processing, bounded concurrency
async function* processItemsStream(items: Item[]): AsyncGenerator<Result> {
  for (const item of items) {
    const result = await heavyProcess(item);
    yield result; // Emits and can be GC'd
  }
}

// Or with bounded parallelism
async function processItemsBatched(items: Item[], batchSize = 10) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(heavyProcess));
    // Process results before next batch
    await saveResults(results);
  }
}
```

### 6. Global/Module State Accumulation

```typescript
// ❌ MEMORY LEAK: Module-level array grows per request
// src/services/analytics.ts
const eventBuffer: AnalyticsEvent[] = []; // Module scope!

export function trackEvent(event: AnalyticsEvent) {
  eventBuffer.push(event); // Grows forever in serverless
}
```

```typescript
// ✅ CORRECT: Use request-scoped or bounded storage
// src/services/analytics.ts
const MAX_BUFFER_SIZE = 100;
const eventBuffer: AnalyticsEvent[] = [];

export function trackEvent(event: AnalyticsEvent) {
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushEvents(); // Send to analytics service
  }
  eventBuffer.push(event);
}

// Or use WeakMap for request-scoped data
const requestEvents = new WeakMap<Request, AnalyticsEvent[]>();
```

---

## Next.js Specific Concerns

### Server Component Memory

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVER COMPONENT MEMORY FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Request                                              Response
     │                                                    ▲
     ▼                                                    │
  ┌─────────────┐                                        │
  │   Route     │                                        │
  │   Match     │                                        │
  └──────┬──────┘                                        │
         │                                               │
         ▼                                               │
  ┌─────────────────────────────────────────────────────┼───────────────────┐
  │                    SERVER COMPONENT RENDER          │                   │
  │                                                     │                   │
  │  ┌─────────────┐    ┌─────────────┐    ┌──────────┴─────────┐          │
  │  │   Fetch     │───▶│   Render    │───▶│   Serialize to     │          │
  │  │   Data      │    │   JSX       │    │   RSC Payload      │          │
  │  └─────────────┘    └─────────────┘    └────────────────────┘          │
  │                                                                         │
  │  ⚠️ CRITICAL: Data fetched here is serialized into the RSC payload     │
  │     Large datasets = large response + memory during render              │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘

  MEMORY LIFECYCLE:
  1. Request arrives
  2. Data fetched (memory allocated)
  3. Component renders (more memory for VDOM)
  4. Serialize to RSC payload (peak memory)
  5. Send response (memory held until complete)
  6. GC runs (memory freed)
```

### API Route Memory

```typescript
// ❌ MEMORY ISSUE: Loading all data into memory
export async function GET() {
  const allUsers = await db.from("users").select("*"); // 100k users!
  return Response.json(allUsers);
}
```

```typescript
// ✅ CORRECT: Pagination
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  const { data, count } = await db
    .from("users")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  return Response.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil((count || 0) / limit),
    },
  });
}
```

### Module Caching in Next.js

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MODULE CACHING BEHAVIOR                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Development Mode                         Production Mode
  ─────────────────                        ───────────────

  Request 1:                               Request 1:
  └─ Module loaded ✓                       └─ Module loaded ✓
  └─ Module state: fresh                   └─ Module state: fresh

  Request 2:                               Request 2:
  └─ Module MAY reload (HMR)               └─ Module CACHED
  └─ Module state: fresh                   └─ Module state: PERSISTED!

  Request N:                               Request N:
  └─ Unpredictable                         └─ Module CACHED
                                           └─ Module state: ACCUMULATED!

  ⚠️ WARNING: Module-level state persists across requests in production!
```

```typescript
// ❌ DANGER: Module state accumulates in production
let requestCount = 0; // BAD!
const userCache = new Map(); // BAD!

export async function GET() {
  requestCount++; // Grows forever in production
  // ...
}
```

```typescript
// ✅ CORRECT: Use request-scoped state
export async function GET(request: Request) {
  const requestId = crypto.randomUUID(); // Request-scoped
  // ...
}

// Or use external state management (Redis, database)
```

---

## React Memory Patterns

### useEffect Cleanup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REACT EFFECT LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Component Mount              Re-render                  Unmount
        │                          │                          │
        ▼                          ▼                          ▼
  ┌───────────┐            ┌───────────────┐           ┌───────────┐
  │  Effect   │            │ Cleanup prev  │           │  Cleanup  │
  │  Runs     │            │ effect first  │           │  Effect   │
  └───────────┘            └───────┬───────┘           └───────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ Run new       │
                           │ effect        │
                           └───────────────┘

  ⚠️ CRITICAL: Missing cleanup = memory leaks!
```

```typescript
// ❌ MEMORY LEAK: No cleanup
function BadComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("wss://api.example.com");
    ws.onmessage = (e) => setData(JSON.parse(e.data));
    // WebSocket never closed!
  }, []);

  return <div>{data}</div>;
}
```

```typescript
// ✅ CORRECT: Proper cleanup
function GoodComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("wss://api.example.com");
    ws.onmessage = (e) => setData(JSON.parse(e.data));

    return () => {
      ws.close(); // Cleanup!
    };
  }, []);

  return <div>{data}</div>;
}
```

### Memoization

```typescript
// ❌ MEMORY WASTE: Recreating on every render
function ExpensiveList({ items }: { items: Item[] }) {
  const sorted = items.sort((a, b) => a.name.localeCompare(b.name)); // New array each render

  return sorted.map((item) => <Item key={item.id} item={item} />);
}
```

```typescript
// ✅ CORRECT: Memoize expensive computations
function ExpensiveList({ items }: { items: Item[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return sorted.map((item) => <Item key={item.id} item={item} />);
}
```

### Avoiding Stale Closures

```typescript
// ❌ STALE CLOSURE: Captures old `count`
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1); // Always uses initial count (0)!
    }, 1000);
    return () => clearInterval(timer);
  }, []); // Empty deps = captures initial values

  return <div>{count}</div>; // Always shows 1
}
```

```typescript
// ✅ CORRECT: Use functional update
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => prev + 1); // Uses current value
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <div>{count}</div>;
}
```

---

## Server-Side Memory Management

### Request Context Pattern

```typescript
// src/server/context.ts
import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}
```

### Memory-Efficient Streaming

```typescript
// ❌ MEMORY HOG: Buffer entire response
export async function GET() {
  const data = await fetchLargeDataset(); // 50MB in memory
  return Response.json(data);
}
```

```typescript
// ✅ CORRECT: Stream the response
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      const cursor = db.from("items").stream();

      controller.enqueue('{"data":[');
      let first = true;

      for await (const item of cursor) {
        if (!first) controller.enqueue(",");
        controller.enqueue(JSON.stringify(item));
        first = false;
      }

      controller.enqueue("]}");
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/json" },
  });
}
```

---

## Database Connection Pooling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONNECTION POOL LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Without Pooling:                        With Pooling:
  ─────────────────                       ──────────────

  Request 1 ──▶ Connect ──▶ Query ──▶ Disconnect
  Request 2 ──▶ Connect ──▶ Query ──▶ Disconnect    Request 1 ──▶ Acquire ──▶ Query ──▶ Release
  Request 3 ──▶ Connect ──▶ Query ──▶ Disconnect    Request 2 ──▶ Acquire ──▶ Query ──▶ Release
  ...                                                Request 3 ──▶ Acquire ──▶ Query ──▶ Release

  ⚠️ Each connect/disconnect:                        ┌────────────────────┐
     - DNS lookup                                    │   CONNECTION POOL  │
     - TCP handshake                                 │  ┌──────────────┐  │
     - TLS negotiation                               │  │ Connection 1 │  │
     - Auth exchange                                 │  │ Connection 2 │  │
     ≈ 50-200ms overhead                             │  │ Connection 3 │  │
                                                     │  │     ...      │  │
                                                     │  └──────────────┘  │
                                                     │  Pre-established   │
                                                     │  Reusable          │
                                                     └────────────────────┘
```

### Supabase Connection Management

```typescript
// src/lib/supabase/server.ts
import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ✅ CORRECT: Factory function creates fresh client per request
export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // ...
        },
      },
    },
  );
}
```

---

## Caching Memory Strategies

### Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-LEVEL CACHE STRATEGY                               │
└─────────────────────────────────────────────────────────────────────────────┘

                          Request
                             │
                             ▼
                    ┌─────────────────┐
                    │    L1 CACHE     │  In-Memory (LRU)
                    │  (Process-Local)│  Fast: ~0.1ms
                    │   TTL: 30s      │  Size: Limited by RAM
                    └────────┬────────┘
                             │ Miss
                             ▼
                    ┌─────────────────┐
                    │    L2 CACHE     │  Redis/Upstash
                    │   (Distributed) │  Fast: ~5ms
                    │   TTL: 5min     │  Size: Configured
                    └────────┬────────┘
                             │ Miss
                             ▼
                    ┌─────────────────┐
                    │   DATA SOURCE   │  Database
                    │   (PostgreSQL)  │  Slow: ~50ms
                    │                 │  Size: Unlimited
                    └─────────────────┘
```

### CoreX Cache Implementation

```typescript
// src/server/cache/index.ts
// Memory-bounded cache with TTL
class MemoryCache implements CacheProvider {
  private cache = new Map<string, { value: unknown; expires: number }>();
  private maxSize: number;

  constructor(options: { maxSize?: number } = {}) {
    this.maxSize = options.maxSize || 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }
}
```

---

## Memory Profiling Tools

### Node.js Heap Snapshot

```typescript
// Development debugging
import v8 from "node:v8";
import fs from "node:fs";

function takeHeapSnapshot() {
  const filename = `heap-${Date.now()}.heapsnapshot`;
  const snapshotStream = v8.writeHeapSnapshot();
  console.log(`Heap snapshot written to: ${snapshotStream}`);
}

// In development API route
export async function GET() {
  if (process.env.NODE_ENV === "development") {
    const heapUsed = process.memoryUsage().heapUsed;
    return Response.json({
      heapUsed: Math.round(heapUsed / 1024 / 1024) + "MB",
      heapTotal:
        Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
    });
  }
  return new Response("Not available", { status: 404 });
}
```

### Memory Monitoring

```typescript
// src/lib/monitoring/memory.ts
interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export function getMemoryMetrics(): MemoryMetrics {
  const { heapUsed, heapTotal, external, rss } = process.memoryUsage();
  return {
    heapUsed: Math.round(heapUsed / 1024 / 1024),
    heapTotal: Math.round(heapTotal / 1024 / 1024),
    external: Math.round(external / 1024 / 1024),
    rss: Math.round(rss / 1024 / 1024),
  };
}

// Log memory usage periodically in development
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    const metrics = getMemoryMetrics();
    if (metrics.heapUsed > 500) {
      console.warn("⚠️ High memory usage:", metrics);
    }
  }, 60000);
}
```

### Chrome DevTools Profiling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MEMORY PROFILING WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Start Node with inspector:
     node --inspect ./node_modules/.bin/next dev

  2. Open chrome://inspect in Chrome

  3. Click "inspect" under Remote Target

  4. Go to Memory tab:
     ┌─────────────────────────────────────────────┐
     │  Memory                                     │
     │  ┌─────────────────┐ ┌──────────────────┐   │
     │  │  Heap snapshot  │ │  Allocation      │   │
     │  │  (Point in time)│ │  instrumentation │   │
     │  └─────────────────┘ └──────────────────┘   │
     │  ┌─────────────────┐                        │
     │  │  Allocation     │                        │
     │  │  sampling       │                        │
     │  └─────────────────┘                        │
     └─────────────────────────────────────────────┘

  5. Take snapshot, perform action, take another

  6. Compare snapshots to find leaks
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO clean up effects**

   ```typescript
   useEffect(() => {
     const subscription = subscribe();
     return () => subscription.unsubscribe();
   }, []);
   ```

2. **DO use bounded caches**

   ```typescript
   const cache = new LRUCache({ max: 1000 });
   ```

3. **DO use streaming for large data**

   ```typescript
   const stream = new ReadableStream({ ... });
   ```

4. **DO paginate database queries**

   ```typescript
   .range(offset, offset + limit)
   ```

5. **DO extract values from closures**

   ```typescript
   const length = data.length; // Not the whole array
   ```

6. **DO use WeakMap for object associations**

   ```typescript
   const metadata = new WeakMap<object, Metadata>();
   ```

7. **DO monitor memory in production**

   ```typescript
   recordMetric("heap_used", process.memoryUsage().heapUsed);
   ```

8. **DO use request-scoped state**

   ```typescript
   asyncLocalStorage.run(context, handler);
   ```

9. **DO dispose resources explicitly**

   ```typescript
   try {
     await process();
   } finally {
     connection.release();
   }
   ```

10. **DO profile before optimizing**
    ```typescript
    node --inspect ./node_modules/.bin/next dev
    ```

### ❌ DON'T

1. **DON'T store state in module scope**

   ```typescript
   // BAD
   const cache = new Map(); // Grows forever!
   ```

2. **DON'T capture large objects in closures**

   ```typescript
   // BAD
   const handler = () => useWholeDataArray;
   ```

3. **DON'T forget to remove event listeners**

   ```typescript
   // BAD
   element.addEventListener("click", handler);
   // Never removed!
   ```

4. **DON'T use unbounded arrays/maps**

   ```typescript
   // BAD
   const history = [];
   history.push(entry); // No limit!
   ```

5. **DON'T load entire tables**

   ```typescript
   // BAD
   const all = await db.from("users").select("*");
   ```

6. **DON'T ignore cleanup returns**

   ```typescript
   // BAD
   useEffect(() => {
     startPolling();
     // Missing return () => stopPolling();
   }, []);
   ```

7. **DON'T create objects in render**

   ```typescript
   // BAD
   <Component style={{ color: 'red' }} />
   // Creates new object every render!
   ```

8. **DON'T use setInterval without cleanup**

   ```typescript
   // BAD
   setInterval(fn, 1000); // Never cleared!
   ```

9. **DON'T store credentials in memory**

   ```typescript
   // BAD
   const tokens = new Map<string, Token>(); // Security risk!
   ```

10. **DON'T assume GC runs immediately**
    ```typescript
    // BAD: Memory not freed instantly
    hugeArray = null; // GC runs when it wants
    ```

---

## Quick Reference: Memory Checklist

### Before Deploying

- [ ] All useEffect hooks have cleanup returns
- [ ] No module-level mutable state
- [ ] Caches have max size limits
- [ ] Large data queries are paginated
- [ ] Event listeners are removed on unmount
- [ ] Intervals/timers are cleared
- [ ] No circular references in data structures
- [ ] Closures don't capture unnecessary scope
- [ ] Streams used for large responses
- [ ] Memory metrics are monitored

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [CACHING.md](./CACHING.md) - Caching strategies in detail
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
- [JOB_QUEUE.md](./JOB_QUEUE.md) - Job processing memory patterns
