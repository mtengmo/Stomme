import { devices, expect, test } from '@playwright/test';
import { answerPain, openPreview } from './flow';

test.use({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 } });

async function startPass(page: import('@playwright/test').Page) {
  await openPreview(page);
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await expect(page.getByRole('heading', { name: /Hur känns/ })).toBeVisible();
}

test('pain before -> session -> pain after with ok', async ({ page }) => {
  await startPass(page);
  await answerPain(page, 1);
  await expect(page.getByRole('button', { name: 'Klar set' })).toBeVisible();
  // skip every exercise: the end of the plan leads to the after reading
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Hoppa över övningen' }).click();
  }
  await expect(
    page.getByRole('heading', { name: /efter passet/ }),
  ).toBeVisible();
  await answerPain(page, 2);
  await page.getByRole('link', { name: 'Till veckan' }).click();
  await expect(page.getByRole('link', { name: 'Starta pass' })).toBeVisible();
});

test('a red flag stops the pass and shows the banner afterwards', async ({
  page,
}) => {
  await startPass(page);
  await answerPain(page, 1, ['Skarp smärta']);
  await expect(
    page.getByRole('heading', { name: 'Avbryt passet.' }),
  ).toBeVisible();
  await expect(page.getByText('Fråga fysioterapeuten.')).toBeVisible();
  await page.getByRole('button', { name: 'Till veckan' }).click();
  await expect(
    page.getByText(
      'Senast stoppade du på grund av knäet. Fråga fysioterapeuten innan nästa pass.',
    ),
  ).toBeVisible();
});

test('a score above 3 warns and can continue anyway', async ({ page }) => {
  await startPass(page);
  await answerPain(page, 6);
  await expect(
    page.getByRole('heading', { name: 'Smärtan är över 3.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fortsätt ändå' }).click();
  await expect(page.getByRole('button', { name: 'Klar set' })).toBeVisible();
});
