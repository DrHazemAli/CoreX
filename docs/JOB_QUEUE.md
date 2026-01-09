# Job Queue System

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Inspired by**: Laravel Queue System

This document describes the Laravel-inspired job queue system in CoreX.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Defining Jobs](#defining-jobs)
5. [Dispatching Jobs](#dispatching-jobs)
6. [Queue Drivers](#queue-drivers)
7. [Workers](#workers)
8. [Middleware](#middleware)
9. [API Endpoints](#api-endpoints)
10. [Configuration](#configuration)
11. [Distributed Processing](#distributed-processing)
12. [Memory Considerations](#memory-considerations)
13. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

The job queue system provides Laravel-like background job processing for Next.js applications.

### Key Features

- ✅ **Optional** - Enable via feature flag (`NEXT_PUBLIC_ENABLE_JOBS=1`)
- ✅ **Multiple Drivers** - Memory (dev), Database (prod), Sync (testing)
- ✅ **Distributed Workers** - Run workers on multiple servers
- ✅ **Job Middleware** - Timeout, retry, rate limiting, etc.
- ✅ **Priority Queues** - Process important jobs first
- ✅ **Delayed Jobs** - Schedule jobs for later
- ✅ **Automatic Retries** - Exponential backoff on failure
- ✅ **Deduplication** - Prevent duplicate job execution

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Job Queue System                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  dispatch() ──► QueueDriver ──► Worker ──► JobHandler               │
│                    │                           │                    │
│              ┌─────┴─────┐               ┌─────┴─────┐              │
│              │  Memory   │               │ Middleware │              │
│              │  Database │               │  Pipeline  │              │
│              └───────────┘               └───────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Enable Jobs

```bash
# .env
NEXT_PUBLIC_ENABLE_JOBS=1
JOB_QUEUE_DRIVER=memory  # or 'database' for production
```

### 2. Define a Job

```typescript
// src/server/jobs/definitions/email.ts
import { defineJob, jobSuccess, jobFailed } from "@/server/jobs";

export const sendEmailJob = defineJob({
  name: "email:send",
  queue: "emails",
  maxAttempts: 3,

  async handle(payload, context) {
    const { to, subject, body } = payload;

    context.log("info", `Sending email to ${to}`);

    try {
      await emailProvider.send({ to, subject, body });
      return jobSuccess();
    } catch (error) {
      return jobFailed(error.message);
    }
  },
});
```

### 3. Dispatch a Job

```typescript
import { dispatch } from "@/server/jobs";

// Dispatch immediately
await dispatch("email:send", {
  to: "user@example.com",
  subject: "Welcome!",
  body: "Hello...",
});

// Dispatch with delay (60 seconds)
await dispatch("email:send", payload, { delay: 60 });

// Dispatch to specific queue
await dispatch("email:send", payload, { queue: "high-priority" });
```

### 4. Process Jobs

```bash
# Via cron job (call the worker endpoint)
curl -X POST "https://your-app.com/api/internal/jobs/worker" \
  -H "x-internal-secret: your-secret" \
  -d '{"maxJobs": 100}'
```

---

## Defining Jobs

### Basic Job

```typescript
import { defineJob, jobSuccess } from "@/server/jobs";

export const myJob = defineJob({
  name: "namespace:action",

  async handle(payload, context) {
    // Do work...
    return jobSuccess();
  },
});
```

### Full Configuration

```typescript
import { defineJob, jobSuccess, jobFailed } from "@/server/jobs";
import { withTimeout, rateLimited } from "@/server/jobs";

export const fullJob = defineJob({
  // Required
  name: "sync:repository",
  handle: async (payload, context) => {
    // Job logic here
    return jobSuccess({ synced: true });
  },

  // Optional
  queue: "sync", // Default queue
  maxAttempts: 5, // Retry attempts
  timeout: 120_000, // 2 minute timeout
  priority: "high", // low, default, high, critical

  // Backoff strategy for retries
  backoff: {
    type: "exponential", // linear, exponential, fixed
    delay: 5000, // Base delay (ms)
    maxDelay: 300_000, // Max delay (ms)
  },

  // Middleware
  middleware: [
    withTimeout(120_000),
    rateLimited({ maxAttempts: 10, windowSeconds: 60 }),
  ],

  // Called after all retries exhausted
  onFailed: async (payload, error, context) => {
    await notifyAdmin(`Job failed: ${context.jobId}`);
  },
});
```

### Job Context

```typescript
interface JobContext {
  jobId: string; // Unique job ID
  attempt: number; // Current attempt (1-indexed)
  maxAttempts: number; // Maximum attempts
  metadata: JobMetadata; // Custom metadata
  log: (level, message) => void; // Contextual logging
  signal?: AbortSignal; // For cancellation
}
```

### Job Result

```typescript
// Success
return jobSuccess();
return jobSuccess({ count: 42 });

// Failure (will retry if attempts remaining)
return jobFailed("Something went wrong");
return jobFailed("Error", { context: "data" });
```

---

## Dispatching Jobs

### Basic Dispatch

```typescript
import { dispatch } from "@/server/jobs";

const jobId = await dispatch("email:send", { to: "user@example.com" });
```

### Dispatch Options

```typescript
await dispatch("job:name", payload, {
  // Queue routing
  queue: "emails",

  // Priority (low, default, high, critical)
  priority: "high",

  // Delay in seconds
  delay: 60,

  // Or specific time
  availableAt: new Date("2024-01-01T12:00:00Z"),

  // Override max attempts
  maxAttempts: 5,

  // Custom metadata
  metadata: {
    correlationId: "abc-123",
    userId: "user-456",
    tags: ["important", "billing"],
  },

  // Prevent duplicates (if key exists, skip dispatch)
  uniqueKey: "sync-repo-123",
});
```

### Dispatch Variants

```typescript
import {
  dispatch,
  dispatchSync,
  dispatchAfterResponse,
  dispatchBatch,
  chain,
} from '@/server/jobs';

// Normal: Add to queue
await dispatch('job:name', payload);

// Sync: Process immediately (no queue)
const result = await dispatchSync('job:name', payload);

// After Response: Process after HTTP response sent
dispatchAfterResponse('job:name', payload);

// Batch: Dispatch multiple jobs
const ids = await dispatchBatch([
  { name: 'job:a', payload: { ... } },
  { name: 'job:b', payload: { ... } },
]);

// Chain: Sequential execution
const firstId = await chain([
  { name: 'job:first', payload: { ... } },
  { name: 'job:second', payload: { ... } },
  { name: 'job:third', payload: { ... } },
]);
```

---

## Queue Drivers

### Memory Driver (Default)

```bash
JOB_QUEUE_DRIVER=memory
```

- ✅ No setup required
- ✅ Fast for development
- ❌ Jobs lost on restart
- ❌ Single process only

### Database Driver (Production)

```bash
JOB_QUEUE_DRIVER=database
NEXT_PUBLIC_ENABLE_DATABASE=1
```

- ✅ Persistent jobs
- ✅ Distributed workers
- ✅ Survives restarts
- ⚠️ Requires migration

Run the migration:

```bash
supabase db push
```

### Sync Driver (Testing)

```bash
JOB_QUEUE_DRIVER=sync
```

- Jobs processed inline
- No actual queuing
- Good for tests

---

## Workers

### HTTP Worker (Serverless)

Call via cron job or scheduler:

```bash
POST /api/internal/jobs/worker
Headers: x-internal-secret: <secret>
Body: {
  "queues": ["high", "default", "low"],
  "maxJobs": 100,
  "maxRuntime": 55000
}
```

### Programmatic Worker

```typescript
import { processJobBatch } from "@/server/jobs";

// In API route or server action
const result = await processJobBatch({
  queues: ["default"],
  maxJobs: 100,
  maxRuntime: 55000, // 55 seconds (leave time for response)
});

console.log(result);
// { processed: 42, completed: 40, failed: 2, duration: 12345 }
```

### Continuous Worker (Long-running)

```typescript
import { JobWorker } from "@/server/jobs";

const worker = new JobWorker({
  queues: ["high", "default", "low"],
  concurrency: 3,
  pollInterval: 1000,
});

// Start processing
await worker.start();

// Graceful shutdown
process.on("SIGTERM", () => worker.stop());
```

---

## Middleware

### Built-in Middleware

```typescript
import {
  withTimeout,
  withRetry,
  withoutOverlapping,
  rateLimited,
  throttleExceptions,
  skip,
  withLogging,
} from "@/server/jobs";
```

### Timeout

```typescript
middleware: [
  withTimeout(30_000), // 30 second timeout
];
```

### Retry with Custom Logic

```typescript
middleware: [
  withRetry({
    retries: 2, // Immediate retries
    delay: 1000, // Base delay
    retryOn: [/timeout/i], // Only retry on timeouts
    skipOn: [/not.?found/i], // Don't retry 404s
  }),
];
```

### Prevent Overlapping

```typescript
middleware: [
  withoutOverlapping(), // Uses payload as key

  // Or custom key
  withoutOverlapping((ctx) => `sync:${ctx.job.payload.resourceId}`),
];
```

### Rate Limiting

```typescript
middleware: [
  rateLimited({
    maxAttempts: 100,
    windowSeconds: 60, // 100 per minute
  }),
];
```

### Throttle Exceptions

```typescript
middleware: [
  throttleExceptions({
    maxFailures: 5,
    pauseSeconds: 300, // Pause 5 minutes after 5 failures
  }),
];
```

### Conditional Skip

```typescript
middleware: [
  skip(async (ctx) => {
    // Skip if user deleted
    const user = await getUser(ctx.job.payload.userId);
    return !user;
  }),
];
```

### Global Middleware

```typescript
import { jobRegistry, withLogging } from "@/server/jobs";

// Apply to all jobs
jobRegistry.use(withLogging());
```

### Custom Middleware

```typescript
import type { JobMiddleware } from "@/server/jobs";

const myMiddleware: JobMiddleware = async (ctx, next) => {
  console.log(`Starting: ${ctx.job.name}`);

  const startTime = Date.now();
  const result = await next();
  const duration = Date.now() - startTime;

  console.log(`Finished: ${ctx.job.name} in ${duration}ms`);

  return result;
};
```

---

## API Endpoints

### Worker Endpoint

```
POST /api/internal/jobs/worker
```

Process jobs from queue.

**Request:**

```json
{
  "queues": ["high", "default"],
  "maxJobs": 100,
  "maxRuntime": 55000
}
```

**Response:**

```json
{
  "success": true,
  "message": "Processed 42 jobs",
  "data": {
    "processed": 42,
    "completed": 40,
    "failed": 2,
    "duration": 12345
  }
}
```

### Dispatch Endpoint

```
POST /api/internal/jobs/dispatch
```

Dispatch a job via HTTP.

**Request:**

```json
{
  "name": "email:send",
  "payload": { "to": "user@example.com" },
  "options": { "queue": "emails", "delay": 60 }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Job dispatched",
  "data": {
    "jobId": "uuid-here",
    "queue": "emails",
    "availableAt": "2024-01-01T12:01:00Z"
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Feature Flag
NEXT_PUBLIC_ENABLE_JOBS=1

# Driver: memory, database, sync
JOB_QUEUE_DRIVER=database

# Default queue name
JOB_DEFAULT_QUEUE=default

# Retry attempts
JOB_MAX_ATTEMPTS=3

# Job timeout (ms)
JOB_TIMEOUT=60000

# Worker concurrency
JOB_WORKER_CONCURRENCY=1

# Polling interval (ms)
JOB_WORKER_POLL_INTERVAL=1000

# Shutdown timeout (ms)
JOB_WORKER_SHUTDOWN_TIMEOUT=30000
```

### Programmatic Config

```typescript
import { getJobConfig } from "@/server/jobs";

const config = getJobConfig();
// {
//   enabled: true,
//   driver: 'database',
//   defaultQueue: 'default',
//   maxAttempts: 3,
//   timeout: 60000,
//   worker: { concurrency: 1, pollInterval: 1000, ... }
// }
```

---

## Distributed Processing

### Setup

1. Use `database` driver
2. Deploy workers on multiple servers
3. Each worker calls the same database

### How It Works

- Jobs are stored in PostgreSQL
- `pop_job` function uses `FOR UPDATE SKIP LOCKED`
- This ensures atomic job reservation
- No job is processed twice

### Queue Priorities

```typescript
// Define queues in priority order
const worker = new JobWorker({
  queues: ["critical", "high", "default", "low"],
});
```

Workers check queues in order, processing higher-priority jobs first.

### Scaling

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Worker 1   │     │  Worker 2   │     │  Worker 3   │
│  (Server A) │     │  (Server B) │     │  (Server C) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │  PostgreSQL │
                    │   (Jobs)    │
                    └─────────────┘
```

### Vercel Cron Example

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/internal/jobs/worker",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## Best Practices

### 1. Keep Jobs Small

Jobs should be focused and fast:

```typescript
// ✅ Good - Single responsibility
defineJob({ name: 'email:send', ... });
defineJob({ name: 'email:track', ... });

// ❌ Bad - Too much in one job
defineJob({ name: 'email:send-and-track-and-update', ... });
```

### 2. Make Jobs Idempotent

Jobs may be retried, so they should be safe to run multiple times:

```typescript
// ✅ Good - Idempotent
async handle(payload) {
  await db.upsert('processed_items', {
    id: payload.itemId,
    processedAt: new Date(),
  });
}

// ❌ Bad - Not idempotent
async handle(payload) {
  await db.insert('processed_items', { ... }); // Will fail on retry
}
```

### 3. Use Unique Keys

Prevent duplicate jobs:

```typescript
await dispatch(
  "sync:repo",
  { repoId: 123 },
  {
    uniqueKey: `sync:repo:${repoId}`,
  },
);
```

### 4. Handle Failures Gracefully

```typescript
defineJob({
  name: "important:task",
  maxAttempts: 5,

  onFailed: async (payload, error, ctx) => {
    // Notify team
    await slack.send(`Job ${ctx.jobId} failed: ${error.message}`);

    // Store for manual review
    await db.insert("failed_jobs", {
      jobId: ctx.jobId,
      payload,
      error: error.message,
    });
  },
});
```

### 5. Monitor Your Queues

```typescript
// Get queue sizes
const defaultSize = await queueSize("default");
const emailsSize = await queueSize("emails");

// Alert if backlog growing
if (defaultSize > 1000) {
  await alert("Queue backlog high!");
}
```

---

## Memory Considerations

### Job Payload Size

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       JOB MEMORY MANAGEMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ⚠️ CRITICAL: Keep payloads small!

  ┌───────────────────────────────────────┐
  │  BAD: Large payload                   │
  │  {                                    │
  │    data: [...10000 items...]         │  ← MB in memory!
  │  }                                    │
  └───────────────────────────────────────┘

  ┌───────────────────────────────────────┐
  │  GOOD: Reference by ID                │
  │  {                                    │
  │    batchId: "uuid-123",              │  ← KB only
  │    processChunk: { start: 0, end: 100}│
  │  }                                    │
  └───────────────────────────────────────┘
```

### Memory-Safe Patterns

```typescript
// ❌ Bad: Passing all data in payload
await dispatch('process:users', {
  users: allUsers, // Could be megabytes!
});

// ✅ Good: Pass reference, fetch in handler
await dispatch('process:users', {
  batchId: batchId,
  offset: 0,
  limit: 100,
});

// In handler
async handle(payload) {
  const users = await fetchUsersBatch(payload.offset, payload.limit);
  // Process small batch
}
```

### Worker Memory Management

```typescript
const worker = new JobWorker({
  concurrency: 3, // Limit concurrent jobs
  pollInterval: 1000,

  // Memory-aware processing
  beforeEach: async () => {
    // Force GC between jobs if available
    if (global.gc) global.gc();
  },
});
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO keep jobs small and focused**

   ```typescript
   defineJob({ name: 'email:send', ... });
   defineJob({ name: 'email:track', ... });
   ```

2. **DO make jobs idempotent**

   ```typescript
   await db.upsert('items', { id: payload.id, ... });
   ```

3. **DO use unique keys to prevent duplicates**

   ```typescript
   await dispatch("sync", payload, { uniqueKey: `sync:${id}` });
   ```

4. **DO set appropriate timeouts**

   ```typescript
   middleware: [withTimeout(30_000)];
   ```

5. **DO handle failures gracefully**

   ```typescript
   onFailed: async (payload, error, ctx) => {
     await notifyAdmin(ctx.jobId, error);
   };
   ```

6. **DO use the database driver in production**

   ```bash
   JOB_QUEUE_DRIVER=database
   ```

7. **DO pass references, not large objects**

   ```typescript
   { batchId: '123', offset: 0 } // Not { items: [...] }
   ```

8. **DO use queue priorities effectively**

   ```typescript
   queues: ["critical", "high", "default", "low"];
   ```

9. **DO log job progress**

   ```typescript
   context.log("info", `Processing item ${i} of ${total}`);
   ```

10. **DO monitor queue sizes**
    ```typescript
    if ((await queueSize("default")) > 1000) alert();
    ```

### ❌ DON'T

1. **DON'T pass large payloads**

   ```typescript
   // ❌ { users: allUsers }
   // ✅ { userIds: ids } or { batchId: id }
   ```

2. **DON'T use memory driver in production**

   ```typescript
   // ❌ JOB_QUEUE_DRIVER=memory (for prod)
   ```

3. **DON'T make non-idempotent jobs**

   ```typescript
   // ❌ db.insert() without checking existence
   ```

4. **DON'T ignore failures**

   ```typescript
   // ❌ No onFailed handler for critical jobs
   ```

5. **DON'T run blocking operations without timeout**

   ```typescript
   // ❌ External API call without withTimeout
   ```

6. **DON'T forget to enable the feature flag**

   ```typescript
   // ❌ NEXT_PUBLIC_ENABLE_JOBS not set
   ```

7. **DON'T process jobs with high concurrency without testing**

   ```typescript
   // ❌ concurrency: 100 (may overwhelm resources)
   ```

8. **DON'T skip graceful shutdown**

   ```typescript
   // ❌ process.exit() without worker.stop()
   ```

9. **DON'T store sensitive data in payloads**

   ```typescript
   // ❌ { password: '...' } - visible in logs/DB
   ```

10. **DON'T chain too many jobs in one request**
    ```typescript
    // ❌ await chain([...100 jobs]) in one HTTP request
    ```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MEMORY.md](./MEMORY.md) - Memory management (critical for jobs)
- [SERVICES.md](./SERVICES.md) - Service interfaces
- [CACHING.md](./CACHING.md) - Caching strategies
