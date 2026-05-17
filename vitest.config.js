import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.vitest.js', 'tests/**/*.test.js'],
    exclude: [
      // Legacy node:assert style tests (top-level await + assert, no describe/it blocks)
      'tests/unit-kernel.test.js',
      'tests/amazon-adapter-determinism.test.js',
      'tests/catalog-pipeline.test.js',
      'tests/regression-v1.test.js',
      'tests/system.test.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['packages/*/src/**', 'domains/*/src/**', 'apps/api/src/**'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
    testTimeout: 10000,
  },
});
