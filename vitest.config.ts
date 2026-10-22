import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Three projects, split by what a test file touches:
 * - unit: pure code (rules, content, charts, figures, pure lib, pure features/ui).
 *   Shares workers between files (isolate: false), so it must stay free of
 *   module-level state and global stubs. Gate: 5 consecutive
 *   `--sequence.shuffle` runs of `--project unit` must pass.
 * - db: files that use the getDb() Dexie singleton, fake-indexeddb or stubGlobal.
 * - dom: React Testing Library files (jsdom docblock), isolated forks.
 */
export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwa-register-react.ts', import.meta.url),
      ),
    },
  },
  test: {
    // Coverage instrumentation makes lazy-route tests slower; the default 5 s flaked under it.
    testTimeout: 15_000,
    // Bound worker count (jsdom especially) so large developer machines do not exhaust resources.
    maxWorkers: 6,
    coverage: {
      provider: 'v8',
      include: ['src/rules/**'],
      exclude: ['src/rules/**/*.test.ts'],
      thresholds: { 'src/rules/**': { branches: 100 } },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/rules/**/*.test.ts',
            'src/content/**/*.test.ts',
            'src/charts/**/*.test.ts',
            'src/figures/**/*.test.{ts,tsx}',
            'src/lib/dates.test.ts',
            'src/lib/format.test.ts',
            'src/features/**/*.test.ts',
            'src/ui/*.test.ts',
            'src/styles/**/*.test.ts',
            'src/test/*.test.ts',
          ],
          pool: 'threads',
          isolate: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          environment: 'node',
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/db/**/*.test.ts',
            'src/lib/storage.test.ts',
            'src/lib/share.test.ts',
          ],
          pool: 'threads',
          isolate: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'node',
          setupFiles: ['./src/test/setup.ts'],
          // appearance.test.ts needs jsdom, localStorage and a matchMedia stub.
          include: ['src/**/*.test.tsx', 'src/lib/appearance.test.ts'],
          exclude: ['src/figures/**'],
          pool: 'forks',
          isolate: true,
        },
      },
    ],
  },
});
