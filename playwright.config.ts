import { defineConfig } from '@playwright/test';

/** Local smoke run against `vite preview` of the production build (needs `npm run build`). */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    reducedMotion: 'reduce',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
