import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwa-register-react.ts', import.meta.url),
      ),
    },
  },
  test: {
    // Bound jsdom concurrency so large developer machines do not exhaust test resources.
    maxWorkers: 4,
    // Coverage instrumentation makes lazy-route tests slower; the default 5 s flaked under it.
    testTimeout: 15_000,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/rules/**'],
      exclude: ['src/rules/**/*.test.ts'],
      thresholds: { 'src/rules/**': { branches: 100 } },
    },
  },
});
