import { chromium, expect, type FullConfig } from '@playwright/test';
import { ONBOARDED_STATE } from './state';

/**
 * Accepts the onboarding disclaimer once and saves the browser storage
 * (including IndexedDB) so most specs start on the home screen. Regenerated on
 * every run, never committed (test-results/ is gitignored). Specs that test
 * onboarding or training setup opt out with `test.use({ storageState: FRESH_STATE })`.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await expect(page.getByRole('button', { name: /Jag förstår/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: 'Bli starkare', exact: true }),
    ).toBeVisible();
    await context.storageState({ path: ONBOARDED_STATE, indexedDB: true });
  } finally {
    await browser.close();
  }
}
