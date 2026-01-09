# CoreX

CoreX is a production-grade architectural core for building modern web systems with Next.js.

## Tech Stack

- Next.js 16 (App Router with TypeScript)
- Tailwind CSS 4
- Supabase (Database & Auth)
- Radix UI Components

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components
- `src/lib/` - Utility functions and Supabase client
- `src/lib/supabase/` - Supabase client (client.ts, server.ts, middleware.ts)
- `src/types/` - Centralized type system with plugin support
- `src/lib/plugins/` - Plugin architecture for extensibility
- `src/lib/di/` - Dependency injection container

## Development Guidelines

- Use TypeScript for all files
- Use Tailwind CSS 4 for styling
- Use Radix UI primitives for accessible components
- Follow Next.js App Router conventions
- Use the `cn()` utility from `@/lib/utils` for conditional class names
- Import types from `@/types` for consistency
