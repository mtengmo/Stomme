import { devices, expect, test } from '@playwright/test';
import { answerPain, openPreview } from './flow';
import { REP_COUNT_MANUAL_KEY } from './state';

test.use({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 } });

// The other specs run with "Räkna själv" on; this one uses the hands-free flow.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (key) => localStorage.removeItem(key),
    REP_COUNT_MANUAL_KEY,
  );
});

test('a rep exercise starts hands-free, pauses and can switch to manual', async ({
  page,
}) => {
  await openPreview(page, true);
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await answerPain(page, 0);

  const start = page.getByRole('button', { name: 'Starta – 5 s förberedelse' });
  await expect(start).toBeVisible();
  await expect(page.getByRole('button', { name: 'Klar set' })).toHaveCount(0);
  await expect(page.getByText(/Takt: ca \d+ s/)).toBeVisible();

  await start.click();
  await expect(page.getByText(/^Gör dig redo/)).toBeVisible();
  await page.getByRole('button', { name: 'Pausa', exact: true }).click();
  await expect(page.getByText(/^Pausad/).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Fortsätt', exact: true }),
  ).toBeVisible();
});

test('Räkna själv brings back Klar set and is remembered', async ({ page }) => {
  await openPreview(page, true);
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await answerPain(page, 0);
  await page.getByRole('switch', { name: 'Räkna själv: av' }).click();
  await expect(page.getByRole('button', { name: 'Klar set' })).toBeVisible();
  const prefs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stomme.repCount.prefs') ?? '{}'),
  );
  expect(Object.values(prefs.manual)).toEqual([true]);
});
