import { defineConfig } from "vitest/config";
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      // Include all test files in services
      '../services/**/__tests__/**/*.test.ts',
      // Include all test files in libs
      '../libs/**/__tests__/**/*.test.ts',
      // Include any test files in the current tests directory
      './**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        '../services/**/*.ts',
        '../libs/**/*.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/.{idea,git,cache,output,temp}/**'
      ]
    },
    // Show test progress
    reporters: ['default'],
    // Set timeout for tests
    testTimeout: 10000,
    // Set up aliases for imports
    alias: {
      '@': resolve(__dirname, '../')
    }
  },
});
