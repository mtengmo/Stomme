import { devices, expect, test } from '@playwright/test';
import { exerciseMuscles } from '../../src/content/muscles';
import {
  activeExerciseList,
  retiredExerciseIds,
} from '../../src/content/retiredExercises';
import type { ExerciseId } from '../../src/domain/types';
import { openLibraryFilters } from './library';

const calfCount = Object.entries(exerciseMuscles).filter(
  ([id, tags]) =>
    !retiredExerciseIds.has(id as ExerciseId) &&
    (tags.primary.includes('calves') || tags.secondary.includes('calves')),
).length;

test.use({ ...devices['Pixel 7'], viewport: { width: 360, height: 800 } });

test('muscle filters survive exercise navigation and browser Back', async ({
  page,
}) => {
  await page.goto('/#/ovningar');
  await openLibraryFilters(page);
  await page.getByRole('button', { name: 'Ben & säte', exact: true }).click();
  await expect(page).toHaveURL(/#\/ovningar\?omrade=legs$/);
  await page.getByRole('button', { name: 'Armar', exact: true }).click();
  await expect(page).toHaveURL(/#\/ovningar\?omrade=legs%2Carms$/);
  await page.getByRole('button', { name: 'Armar', exact: true }).click();
  await expect(page).toHaveURL(/#\/ovningar\?omrade=legs$/);
  await page.getByText('Mer specifikt', { exact: false }).click();
  await page.getByRole('button', { name: 'Vader', exact: true }).click();
  await expect(page).toHaveURL(/#\/ovningar\?omrade=legs&muskel=calves$/);
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
  await expect(page).toHaveURL(/#\/ovningar\?omrade=legs&muskel=calves$/);
  await expect(
    page.getByRole('button', { name: 'Vader', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/ovningar?muskel=constructor');
  await expect(page).toHaveURL(/#\/ovningar$/);
  await expect(page.getByRole('status')).toHaveText(
    `${activeExerciseList.length} övningar`,
  );
  await expect(page.getByRole('link', { name: 'Fortsätt passet' })).toHaveCount(
    0,
  );
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
