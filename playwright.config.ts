import { defineConfig } from '@playwright/test';

/** Local smoke run against `vite preview` of the production build (needs `npm run build`). */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  reporter: 'list',
  fullyParallel: true,
  workers: process.env.CI ? 2 : '75%',
  use: {
    baseURL: 'http://localhost:4173',
    reducedMotion: 'reduce',
    // Blocked by default so no test downloads the precache; pwa.spec.ts and the offline
    // tests opt in with test.use({ serviceWorkers: 'allow' }).
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
