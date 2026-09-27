import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // The pure game logic runs in node; the render smoke tests need a DOM.
    // `environmentMatchGlobs` keeps the fast suites fast.
    environment: 'node',
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    globals: false,
    restoreMocks: true,
  },
});
