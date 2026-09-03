import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'threads',
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ['tests/unit/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
  },
});
