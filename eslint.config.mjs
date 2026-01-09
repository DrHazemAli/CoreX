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

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { ignores: [".github/", ".husky/", "node_modules/", ".next/", "src/components/ui", "*.config.ts", "*.mjs", "inspiration/", "scripts/", "*.d.ts"] },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
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
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  securityPlugin.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Next.js rules
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      
      // React Hooks rules
      ...pluginReactHooks.configs.recommended.rules,

      // Prettier integration rules
      "prettier/prettier": "error",

     
      "@typescript-eslint/no-explicit-any": "error",

      // SonarJS rules
      ...sonarjs.configs.recommended.rules,
      

      // File Naming - Allow kebab-case and PascalCase for React components
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],

      // Import/Export Rules
      "import/no-mutable-exports": "error",
      "no-duplicate-imports": "off", // TypeScript handles this better

      // Whitespace and Punctuation (Style Rules)
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
      "no-useless-escape": "error",

      // TypeScript-Specific Rules (strict type safety)
      "@typescript-eslint/no-explicit-any": "error",
      // Type-aware rules disabled - require parserOptions.project which slows lint
      // Enable these if you set up type-aware linting with tseslint.configs.recommendedTypeChecked
      // "@typescript-eslint/no-unsafe-assignment": "warn",
      // "@typescript-eslint/no-unsafe-member-access": "warn",
      // "@typescript-eslint/no-unsafe-call": "warn",
      // "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // React unnecessary import rules
      "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],

      // React JSX Pascal Case Rule
      "react/jsx-pascal-case": [
        "error",
        {
          allowAllCaps: false,
          ignore: [],
        },
      ],

      // React: Prevent nesting component definitions inside another component
      "react/no-unstable-nested-components": ["error", { allowAsProps: true }],

      // React: Prevent re-renders by ensuring context values are memoized
      "react/jsx-no-constructed-context-values": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/purity": "error",

      // React: Disallow array index as key in JSX
      "react/no-array-index-key": "off",
      
      // React: No need to import React in Next.js (automatic JSX runtime)
      "react/react-in-jsx-scope": "off",
      
      // Allow underscores for branded types and internal symbols
      "no-underscore-dangle": "off",
    },
  },
];
