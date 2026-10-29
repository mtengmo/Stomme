import { devices, expect, test } from '@playwright/test';
import { exerciseList } from '../../src/content/exercises';
import { exerciseMuscles } from '../../src/content/muscles';
import { answerPain, openPreview } from './flow';

const calfCount = Object.values(exerciseMuscles).filter(
  (tags) =>
    tags.primary.includes('calves') || tags.secondary.includes('calves'),
).length;

test.use({ ...devices['Pixel 7'], viewport: { width: 360, height: 800 } });

test('muscle filters survive exercise navigation and browser Back', async ({
  page,
}) => {
  await page.goto('/#/ovningar');
  await page.getByRole('button', { name: 'Vader', exact: true }).click();
  await expect(page).toHaveURL(/#\/ovningar\?muskel=calves$/);
  await expect(page.getByRole('status')).toHaveText(
    `${calfCount} övningar för vader`,
  );
  await page
    .getByRole('link', { name: 'Enbens tåhävning', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Enbens tåhävning', exact: true }),
  ).toBeVisible();
  await page.getByText('Visa muskelkarta', { exact: true }).click();
  await expect(page.getByRole('img', { name: 'Kropp bakifrån' })).toBeVisible();
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  await expect(page).toHaveURL(/#\/ovningar\?muskel=calves$/);
  await expect(
    page.getByRole('button', { name: 'Vader', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/ovningar?muskel=constructor');
  await expect(page).toHaveURL(/#\/ovningar$/);
  await expect(page.getByRole('status')).toHaveText(
    `${exerciseList.length} övningar`,
  );
  await expect(page.getByRole('link', { name: 'Fortsätt passet' })).toHaveCount(
    0,
  );
});

test('a selected exercise survives inspection, pain replanning and session reload', async ({
  page,
}) => {
  await openPreview(page, true);
  await page
    .getByRole('button', { name: 'Byt övning', exact: true })
    .first()
    .click();
  await page.getByLabel('Övning i moment 1').selectOption('split-squat');
  await page
    .getByRole('link', {
      name: 'Station\u00e4rt utfall (split squat)',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'Station\u00e4rt utfall (split squat)',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();
  await answerPain(page, 0);
  await expect(
    page.getByRole('heading', {
      name: 'Station\u00e4rt utfall (split squat)',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'Station\u00e4rt utfall (split squat)',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/#/pass/A');
  await expect(
    page.getByRole('button', { name: 'Fortsätt passet', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Station\u00e4rt utfall (split squat)',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Sitta ner och resa sig från stol (goblet)',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Byt övning', exact: true }),
  ).toHaveCount(0);
});

test('muscle highlights have a text alternative and respect reduced motion', async ({
  page,
}) => {
  await page.goto('/#/ovning/dead-bug');
  await expect(
    page.getByRole('heading', { name: 'Tränar främst' }),
  ).toBeVisible();
  await expect(page.getByText('Start', { exact: true })).toBeVisible();
  await expect(page.getByText('Slut', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Pausa rörelsen' }),
  ).toHaveCount(0);
  await page.getByText('Visa muskelkarta', { exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Kropp framifrån' }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const movingFigure = page
    .locator('svg')
    .filter({ has: page.locator('title', { hasText: 'dead-bug' }) });
  await page.waitForTimeout(1200);
  await page
    .getByRole('button', { name: 'Pausa rörelsen', exact: true })
    .click();
  const frozen = await movingFigure.innerHTML();
  await page.waitForTimeout(250);
  expect(await movingFigure.innerHTML()).toBe(frozen);
  await expect(
    page.getByRole('button', { name: 'Spela rörelsen', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Spela rörelsen', exact: true })
    .click();
  await expect.poll(() => movingFigure.innerHTML()).not.toBe(frozen);
});

test('optional sixth exercise wraps inside the narrow week card', async ({
  page,
}) => {
  await openPreview(page, true);
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();
  await answerPain(page, 5);
  await page.getByRole('switch', { name: /väggsittning/i }).click();
  await page
    .getByRole('button', { name: 'Fortsätt ändå', exact: true })
    .click();
  await page.getByRole('button', { name: 'Klar set', exact: true }).waitFor();
  await page.goto('/#/');
  const tally = page.getByRole('img', { name: /^Pass A:/ });
  await expect(page.getByText('Pågår', { exact: true })).toBeVisible();
  await expect(tally.locator(':scope > span')).toHaveCount(6);
  const fits = await tally.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return [...el.children].every((child) => {
      const bounds = child.getBoundingClientRect();
      return bounds.left >= box.left - 1 && bounds.right <= box.right + 1;
    });
  });
  expect(fits).toBe(true);
});
