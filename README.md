# CoreX

<p align="center">
  <strong>Production-grade architectural core for modern Next.js applications</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

**CoreX** is a production-grade starter template that provides a clean, opinionated foundation for building modern web systems with Next.js. It enforces structure, boundaries, and correctness from day one — without locking teams into rigid patterns.

### Tech Stack

| Category          | Technology                   |
| ----------------- | ---------------------------- |
| **Framework**     | Next.js 16 (App Router)      |
| **Language**      | TypeScript 5 (strict mode)   |
| **Styling**       | Tailwind CSS 4               |
| **Database**      | Supabase (PostgreSQL + Auth) |
| **UI Components** | Radix UI Primitives          |
| **Validation**    | Zod                          |
| **State**         | React Query (TanStack Query) |

---

## Features

- ✅ **Type-Safe End-to-End** - Zod schemas as single source of truth
- ✅ **Clean Architecture** - Strict layer separation (Core → DAL → Application → API)
- ✅ **Authentication Ready** - Supabase Auth with RBAC/PBAC
- ✅ **Feature Flags** - Enable features progressively
- ✅ **Job Queue** - Laravel-inspired background processing
- ✅ **Rate Limiting** - Built-in API protection
- ✅ **Security First** - CSP, sanitization, RLS
- ✅ **Performance Optimized** - Server Components by default
- ✅ **Comprehensive Linting** - ESLint + Prettier + Security plugins

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourorg/corex.git my-project
cd my-project

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
pnpm dev
```

### Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Feature Flags (all disabled by default)
NEXT_PUBLIC_ENABLE_AUTH=0
NEXT_PUBLIC_ENABLE_DATABASE=0
NEXT_PUBLIC_ENABLE_PERMISSIONS=0
NEXT_PUBLIC_ENABLE_JOBS=0

# Internal APIs
INTERNAL_API_SECRET=your-secret-key
```

---

## Documentation

### 📖 Core Documentation

| Document                                        | Description                              |
| ----------------------------------------------- | ---------------------------------------- |
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md)     | System design, layer rules, request flow |
| [**MEMORY.md**](docs/MEMORY.md)                 | Memory management, GC, leak prevention   |
| [**BEST_PRACTICES.md**](docs/BEST_PRACTICES.md) | Coding standards, patterns, testing      |

### 🔐 Security & Auth

| Document                            | Description                                |
| ----------------------------------- | ------------------------------------------ |
| [**SECURITY.md**](docs/SECURITY.md) | Security architecture, XSS/CSRF prevention |
| [**AUTH.md**](docs/AUTH.md)         | Authentication, RBAC, PermissionGate       |

### 🛠 Development

| Document                                | Description                                   |
| --------------------------------------- | --------------------------------------------- |
| [**ROUTING.md**](docs/ROUTING.md)       | API design, contracts, validation             |
| [**SERVICES.md**](docs/SERVICES.md)     | DI container, service interfaces              |
| [**COMPONENTS.md**](docs/COMPONENTS.md) | UI system, Radix, Tailwind, CVA               |
| [**TESTING.md**](docs/TESTING.md)       | Vitest, Testing Library, React Query DevTools |
| [**CODE_STYLE.md**](docs/CODE_STYLE.md) | Naming, formatting, patterns                  |
| [**LINTING.md**](docs/LINTING.md)       | ESLint rules, TypeScript config               |

### ⚡ Performance & Infrastructure

| Document                                  | Description                   |
| ----------------------------------------- | ----------------------------- |
| [**PERFORMANCE.md**](docs/PERFORMANCE.md) | Core Web Vitals, optimization |
| [**CACHING.md**](docs/CACHING.md)         | Multi-level caching, Redis    |
| [**JOB_QUEUE.md**](docs/JOB_QUEUE.md)     | Background job processing     |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API Routes                                  │
│              (HTTP handling, validation, rate limiting)             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Layer                              │
│               (Use cases, business orchestration)                   │
└─────────────────────────────────────────────────────────────────────┘
                       │              │
                       ▼              ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│         Core Layer         │  │           DAL              │
│   (Pure business logic)    │  │  (Database operations)     │
│   No external deps         │  │  Supabase queries          │
└────────────────────────────┘  └────────────────────────────┘
```

### Layer Rules

| Layer           | Can Import           | Cannot Import            |
| --------------- | -------------------- | ------------------------ |
| **Core**        | Nothing              | Everything               |
| **Contracts**   | Core                 | Application, DAL, Server |
| **DAL**         | Core, Contracts      | Application              |
| **Application** | Core, Contracts, DAL | Server, API              |
| **API Routes**  | Everything           | -                        |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (main)/            # Public pages
│   ├── (private)/         # Protected pages
│   └── api/               # API routes
│       ├── internal/      # Protected internal APIs
│       └── v1/            # Public versioned APIs
│
├── core/                  # Pure business logic
├── contracts/             # Zod schemas & type definitions
├── application/           # Use cases
├── dal/                   # Data Access Layer
├── server/                # Server utilities
│   ├── auth/             # Session management
│   ├── cache/            # Caching layer
│   ├── http/             # Response helpers
│   ├── jobs/             # Job queue system
│   ├── rateLimit/        # Rate limiting
│   └── security/         # Sanitization, headers
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── auth/             # Auth components
│   └── layout/           # Layout components
├── contexts/              # React contexts
├── lib/                   # Utilities & configuration
│   ├── di/               # Dependency injection
│   ├── plugins/          # Plugin system
│   ├── query/            # React Query setup
│   └── supabase/         # Supabase clients
└── types/                 # Type definitions
```

---

## Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm typecheck        # Run TypeScript check
pnpm format           # Format with Prettier

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate types
```

---

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Before Submitting

- [ ] Run `pnpm lint` and fix issues
- [ ] Run `pnpm typecheck` with no errors
- [ ] Run `pnpm test` and ensure tests pass
- [ ] Update documentation if needed

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community guidelines.

---

## Security

For security vulnerabilities, please see [SECURITY.md](SECURITY.md) for our security policy and reporting guidelines.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for the developer community
</p>
