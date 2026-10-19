import { devices, expect, test } from '@playwright/test';
import { answerPain } from './flow';

test.use({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 } });

async function toSettings(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('link', { name: 'Inställningar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inställningar' }),
  ).toBeVisible();
}

test('export produces a downloaded backup file', async ({ page }) => {
  await toSettings(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportera' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^stomme-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  await expect(page.getByRole('status')).toContainText('laddades ner');
});

test('import round trip: keep, then replace with a safety backup', async ({
  page,
}) => {
  await toSettings(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportera' }).click(),
  ]);
  const path = await download.path();

  const input = page.getByLabel('Välj säkerhetskopia att importera');
  await input.setInputFiles(path);
  await expect(
    page.getByRole('heading', { name: 'Ersätta din data?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Behåll min data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inställningar' }),
  ).toBeVisible();

  await input.setInputFiles(path);
  const [safety] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Ersätt med filens data' }).click(),
  ]);
  expect(safety.suggestedFilename()).toMatch(/^stomme-backup-/);
  await expect(page.getByRole('status')).toContainText('Importerat');

  await input.setInputFiles({
    name: 'x.json',
    mimeType: 'application/json',
    buffer: Buffer.from('inte json'),
  });
  await expect(page.getByRole('alert')).toContainText('kunde inte läsas');
});

test('delete all data needs two steps and returns to onboarding', async ({
  page,
}) => {
  await toSettings(page);
  await page.getByRole('button', { name: 'Radera all data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Radera allt?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Radera all data nu' }).click();
  await expect(
    page.getByRole('heading', { name: 'Välkommen till Stomme' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Välkommen till Stomme' }),
  ).toBeVisible();
});

test('no update banner appears during a session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('link', { name: 'Starta pass' }).click();
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await answerPain(page, 0);
  await expect(page.locator('[data-step]')).toBeVisible();
  await expect(page.getByText('Ny version finns')).toHaveCount(0);
});
