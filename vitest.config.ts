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

    /**
     * Run the suite offline, always.
     *
     * Vite loads .env.local for tests too, so once real credentials existed
     * the tests started talking to the production database - writing rows,
     * and failing in ways that depend on the network rather than the code.
     * Blanking these makes `isSupabaseConfigured` false, which is the path
     * the tests are written against anyway.
     */
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
    globals: false,
    restoreMocks: true,
  },
});
