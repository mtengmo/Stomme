import { defineConfig } from '@playwright/test';

/** Local smoke run against `vite preview` of the production build (needs `npm run build`). */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  reporter: 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  // Lazy route chunks plus parallel workers can exceed the default 5 s on a loaded machine.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : '75%',
  use: {
    baseURL: 'http://localhost:4173',
    reducedMotion: 'reduce',
    // Onboarding already accepted; see tests/e2e/global-setup.ts.
    storageState: 'test-results/.auth/onboarded.json',
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
