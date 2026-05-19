import js from "@eslint/js";

const TARGET_FILES = [
  "apps/api/src/**/*.js",
  "packages/*/src/**/*.js",
  "domains/*/!(node_modules)/**/*.js",
  "tests/**/*.js",
];

export default [
  // Global ignores — must be first and standalone
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "docs/**",
      "apps/admin-ui/**",
      "apps/search-ui/**",
      "scripts/**",
      "tmp-*.mjs",
      "tmp-*.js",
      ".claude/**",
      "**/*.cjs",
    ],
  },

  // Global language options — no files restriction so globals apply everywhere
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        crypto: "readonly",
        TextEncoder: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
      },
    },
  },

  // Recommended rules scoped to our target files only
  {
    ...js.configs.recommended,
    files: TARGET_FILES,
  },

  // Custom rules for API + packages + tests
  {
    files: TARGET_FILES,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            "Math.random() is forbidden in decision flow. Use crypto.randomUUID() for event IDs or SHA-256 for content-addressed entity IDs.",
        },
      ],
      "max-lines": ["warn", 300],
      "no-console": "warn",
    },
  },

  // Vitest globals for test files
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
  },
];
