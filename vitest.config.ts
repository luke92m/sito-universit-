import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // 'server-only' lancia un errore fuori dai React Server Components: nei test è un modulo vuoto.
      'server-only': fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Rende disponibili le variabili di .env.local ai test RLS (saltati se mancano).
    env: loadEnv(mode, process.cwd(), '')
  }
}));
