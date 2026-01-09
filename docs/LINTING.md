# Linting & Code Quality Guide

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Tools**: ESLint 9, Prettier, TypeScript 5

## Table of Contents

1. [Overview](#overview)
2. [ESLint Configuration](#eslint-configuration)
3. [Plugins & Rules](#plugins--rules)
4. [TypeScript Rules](#typescript-rules)
5. [React Rules](#react-rules)
6. [Security Rules](#security-rules)
7. [Code Quality Rules](#code-quality-rules)
8. [Running Linting](#running-linting)
9. [IDE Integration](#ide-integration)
10. [DO's and DON'Ts](#dos-and-donts)

---

## Overview

CoreX uses a comprehensive linting setup for code quality and consistency.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LINTING PIPELINE                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  Code Change
       │
       ▼
  ┌─────────────────┐
  │    ESLint       │  ← Code quality, patterns
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   TypeScript    │  ← Type checking
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   Prettier      │  ← Code formatting
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   Commit        │  ← Husky pre-commit hook
  └─────────────────┘
```

### Tools Used

| Tool           | Purpose       | Config File         |
| -------------- | ------------- | ------------------- |
| **ESLint**     | Code quality  | `eslint.config.mjs` |
| **TypeScript** | Type checking | `tsconfig.json`     |
| **Prettier**   | Formatting    | `.prettierrc`       |
| **Husky**      | Git hooks     | `.husky/`           |

---

## ESLint Configuration

### Configuration Structure (Flat Config)

```javascript
// eslint.config.mjs
import pluginJs from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";
import securityPlugin from "eslint-plugin-security";
import prettier from "eslint-plugin-prettier";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import pluginNext from "@next/eslint-plugin-next";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  // Target files
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },

  // Ignored paths
  {
    ignores: [
      ".github/",
      ".husky/",
      "node_modules/",
      ".next/",
      "src/components/ui", // Generated UI components
      "*.config.ts",
      "*.mjs",
      "scripts/",
      "*.d.ts",
    ],
  },

  // Global configuration
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      import: pluginImport,
      security: securityPlugin,
      prettier: prettier,
      unicorn: unicorn,
      react: pluginReact,
      sonarjs: sonarjs,
      "@next/next": pluginNext,
      "react-hooks": pluginReactHooks,
    },
  },

  // Extended configs
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  securityPlugin.configs.recommended,
  ...tseslint.configs.recommended,

  // Custom rules
  {
    rules: {
      /* ... */
    },
  },
];
```

---

## Plugins & Rules

### Active Plugins

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ESLINT PLUGINS                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  Plugin                    Purpose
  ────────────────────────────────────────────────────────────────────
  @eslint/js               Base JavaScript rules
  typescript-eslint        TypeScript-specific rules
  eslint-plugin-react      React best practices
  eslint-plugin-react-hooks React Hooks rules
  @next/eslint-plugin-next  Next.js specific rules
  eslint-plugin-security    Security vulnerability detection
  eslint-plugin-sonarjs     Code quality & bug detection
  eslint-plugin-unicorn     Modern JS patterns
  eslint-plugin-import      Import/export rules
  eslint-plugin-prettier    Prettier integration
```

### Rule Severity Levels

| Level           | Meaning  | When to Use              |
| --------------- | -------- | ------------------------ |
| `"off"` / `0`   | Disabled | Not applicable           |
| `"warn"` / `1`  | Warning  | Should fix, not blocking |
| `"error"` / `2` | Error    | Must fix, blocks commit  |

---

## TypeScript Rules

### Strict Type Safety

```javascript
// eslint.config.mjs
{
  rules: {
    // No explicit any - forces proper typing
    "@typescript-eslint/no-explicit-any": "error",

    // Unused variables (with underscore exception)
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ],

    // Type-aware rules (requires parserOptions.project)
    // These are commented out by default for performance
    // "@typescript-eslint/no-unsafe-assignment": "warn",
    // "@typescript-eslint/no-unsafe-member-access": "warn",
    // "@typescript-eslint/no-unsafe-call": "warn",
    // "@typescript-eslint/no-unsafe-return": "warn",
  }
}
```

### TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Common TypeScript Violations

```typescript
// ❌ Error: @typescript-eslint/no-explicit-any
function bad(data: any) { ... }

// ✅ Fix: Use proper types
function good(data: unknown) { ... }
function good(data: UserData) { ... }

// ❌ Error: @typescript-eslint/no-unused-vars
const unused = 'value';

// ✅ Fix: Remove or prefix with underscore
const _intentionallyUnused = 'value';
```

---

## React Rules

### Hooks Rules

```javascript
{
  rules: {
    // Enforce Rules of Hooks
    ...pluginReactHooks.configs.recommended.rules,

    // Custom: Prevent setState in useEffect causing loops
    "react-hooks/set-state-in-effect": "error",

    // Ensure pure render functions
    "react-hooks/purity": "error",
  }
}
```

### Component Rules

```javascript
{
  rules: {
    // No unnecessary fragments
    "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],

    // Components must be PascalCase
    "react/jsx-pascal-case": [
      "error",
      { allowAllCaps: false, ignore: [] }
    ],

    // No nested component definitions
    "react/no-unstable-nested-components": ["error", { allowAsProps: true }],

    // Memoize context values
    "react/jsx-no-constructed-context-values": "error",

    // No React import needed (automatic JSX runtime)
    "react/react-in-jsx-scope": "off",
  }
}
```

### Common React Violations

```tsx
// ❌ Error: react/no-unstable-nested-components
function Parent() {
  function Child() { return <div />; }  // Created every render!
  return <Child />;
}

// ✅ Fix: Define outside or memoize
const Child = () => <div />;
function Parent() {
  return <Child />;
}

// ❌ Error: react/jsx-no-constructed-context-values
<MyContext.Provider value={{ user, theme }}>  // New object every render

// ✅ Fix: Memoize the value
const value = useMemo(() => ({ user, theme }), [user, theme]);
<MyContext.Provider value={value}>

// ❌ Error: react/jsx-no-useless-fragment
<>{children}</>

// ✅ Fix: Return directly
{children}
```

---

## Security Rules

### eslint-plugin-security

```javascript
{
  rules: {
    // Enabled via: securityPlugin.configs.recommended
    // Examples of detected issues:
    // - security/detect-object-injection
    // - security/detect-non-literal-regexp
    // - security/detect-unsafe-regex
    // - security/detect-buffer-noassert
    // - security/detect-eval-with-expression
  }
}
```

### Common Security Violations

```typescript
// ❌ Warning: security/detect-object-injection
const value = obj[userInput]; // Potential prototype pollution

// ✅ Fix: Validate or use Map
if (Object.hasOwn(obj, userInput)) {
  const value = obj[userInput];
}

// ❌ Warning: security/detect-non-literal-regexp
new RegExp(userInput); // ReDoS vulnerability

// ✅ Fix: Escape or use literal
new RegExp(escapeRegExp(userInput));

// ❌ Error: security/detect-eval-with-expression
eval(code); // Code injection

// ✅ Fix: Use safer alternatives
JSON.parse(code); // If it's JSON
```

---

## Code Quality Rules

### SonarJS Rules

```javascript
{
  rules: {
    // Enabled via: sonarjs.configs.recommended.rules
    // Detects:
    // - Cognitive complexity
    // - Duplicate code
    // - Dead code
    // - Code smells
  }
}
```

### Unicorn Rules

```javascript
{
  rules: {
    // File naming convention
    "unicorn/filename-case": [
      "error",
      {
        cases: {
          kebabCase: true,    // utils.ts, api-client.ts
          pascalCase: true,   // Button.tsx, UserCard.tsx
        },
      },
    ],
  }
}
```

### Import Rules

```javascript
{
  rules: {
    // No mutable exports
    "import/no-mutable-exports": "error",

    // Duplicate imports handled by TypeScript
    "no-duplicate-imports": "off",
  }
}
```

### Style Rules

```javascript
{
  rules: {
    // Prettier handles formatting
    "prettier/prettier": "error",

    // Spacing rules (backup if Prettier misses)
    "space-before-function-paren": [
      "error",
      {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
      },
    ],
    "array-bracket-spacing": ["error", "never"],
    "object-curly-spacing": ["error", "always"],
    "func-call-spacing": ["error", "never"],
    "computed-property-spacing": ["error", "never"],

    // No unnecessary escapes
    "no-useless-escape": "error",
  }
}
```

---

## Running Linting

### NPM Scripts

```bash
# Run ESLint
pnpm lint

# Run ESLint with auto-fix
pnpm lint --fix

# Run TypeScript check
pnpm typecheck

# Run all checks
pnpm lint && pnpm typecheck
```

### Script Configuration

```json
// package.json
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Pre-Commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting on staged files
npx lint-staged
```

```json
// package.json or .lintstagedrc
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## IDE Integration

### VS Code Settings

```json
// .vscode/settings.json
{
  // ESLint
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],

  // Format on save
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // ESLint auto-fix on save
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // TypeScript
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

## DO's and DON'Ts

### ✅ DO

1. **DO run lint before committing**

   ```bash
   pnpm lint && pnpm typecheck
   ```

2. **DO use proper TypeScript types**

   ```typescript
   function process(data: UserData): Result { ... }
   ```

3. **DO prefix unused variables with underscore**

   ```typescript
   const [_, setCount] = useState(0);
   ```

4. **DO extract components outside render**

   ```typescript
   const Item = ({ data }) => <li>{data}</li>;
   ```

5. **DO memoize context values**

   ```typescript
   const value = useMemo(() => ({ ... }), [deps]);
   ```

6. **DO validate dynamic property access**

   ```typescript
   if (Object.hasOwn(obj, key)) { ... }
   ```

7. **DO use PascalCase for components**

   ```typescript
   function UserCard() { ... }
   ```

8. **DO follow file naming conventions**

   ```
   utils.ts, api-client.ts, UserCard.tsx
   ```

9. **DO configure IDE for auto-fix**

   ```json
   "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
   ```

10. **DO keep rules consistent across team**
    ```
    Commit eslint.config.mjs and .prettierrc
    ```

### ❌ DON'T

1. **DON'T use `any` type**

   ```typescript
   // ❌ function bad(data: any)
   // ✅ function good(data: unknown)
   ```

2. **DON'T ignore ESLint warnings**

   ```typescript
   // ❌ // eslint-disable-next-line
   ```

3. **DON'T define components inside components**

   ```typescript
   // ❌ function Parent() { function Child() {} }
   ```

4. **DON'T use eval or Function constructor**

   ```typescript
   // ❌ eval(userCode)
   ```

5. **DON'T commit without linting**

   ```bash
   # ❌ git commit -m "..." --no-verify
   ```

6. **DON'T disable rules project-wide**

   ```javascript
   // ❌ "@typescript-eslint/no-explicit-any": "off"
   ```

7. **DON'T ignore security warnings**

   ```typescript
   // ❌ obj[userInput] without validation
   ```

8. **DON'T mix naming conventions**

   ```
   // ❌ userCard.tsx, user_card.tsx
   ```

9. **DON'T skip type checking**

   ```bash
   # ❌ Skipping pnpm typecheck
   ```

10. **DON'T commit eslint-disable comments**
    ```typescript
    // ❌ /* eslint-disable */ at file top
    ```

---

## Quick Reference

### Common ESLint Disable Comments

```typescript
// Disable for next line only (use sparingly)
// eslint-disable-next-line security/detect-object-injection -- Safe: key validated

// Disable for entire file (avoid)
/* eslint-disable @typescript-eslint/no-explicit-any */

// Re-enable after block
/* eslint-enable */
```

### Error Resolution Cheatsheet

| Error                               | Fix                          |
| ----------------------------------- | ---------------------------- |
| `no-explicit-any`                   | Use `unknown` or proper type |
| `no-unused-vars`                    | Remove or prefix with `_`    |
| `no-unstable-nested-components`     | Move outside or memoize      |
| `jsx-no-constructed-context-values` | Use `useMemo`                |
| `detect-object-injection`           | Validate key or use Map      |

---

## Related Documentation

- [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Coding standards
- [CODE_STYLE.md](./CODE_STYLE.md) - Style conventions
- [SECURITY.md](./SECURITY.md) - Security rules explained
