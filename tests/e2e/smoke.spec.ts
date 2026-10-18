import { devices, expect, test } from '@playwright/test';
import { playPassA } from './flow';

test.use({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 } });

test('Pass A can be completed with only the primary action on each screen', async ({
  page,
}) => {
  const { sets } = await playPassA(page);
  // goblet 2, then four per-side exercises with 2 sets x 2 sides each
  expect(sets).toBe(18);

  // Back on the week view the pass is ticked off and the session is closed.
  await expect(page.getByText('Klar', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fortsätt passet' })).toHaveCount(
    0,
  );
});

test('the app works offline after one load', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('link', { name: 'Starta pass' }).waitFor();
  // wait for the service worker to take control, then cut the network
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('link', { name: 'Starta pass' }).click();
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await page.getByRole('button', { name: 'Klar set' }).click();
  await expect(page.getByRole('status')).toContainText('Set 1 loggat');
});
