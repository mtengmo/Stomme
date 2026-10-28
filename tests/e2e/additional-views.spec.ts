import { expect, test } from '@playwright/test';
import { addExercise, quickStart, removeAllExercises } from './flow';
import { FRESH_STATE } from './state';

const candidates = [
  ['split-squat', 'oblique'],
  ['reverse-lunge', 'front'],
  ['forward-lunge', 'front'],
  ['half-squat', 'front'],
  ['single-leg-chair-squat', 'front'],
  ['farmer-carry', 'front'],
  ['bench-side-plank-leg-lift', 'oblique'],
] as const;

for (const width of [320, 360, 412]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`additional exercise views (${width} ${colorScheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const [id, view] of candidates) {
        await page.goto(`/#/ovning/${id}`);
        const label = view === 'oblique' ? 'Sned vinkel' : 'Framifrån';
        await page.getByRole('button', { name: label, exact: true }).click();
        await expect(
          page.getByRole('button', { name: label, exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
        const figures = page.locator(
          `.exercise-stage svg[data-view="${view}"]`,
        );
        await expect(figures).toHaveCount(2);
        if (id !== 'farmer-carry' && id !== 'half-squat') {
          const marker = figures
            .first()
            .locator('text')
            .filter({ hasText: /^[HV]$/ });
          await expect(marker).toHaveCount(1);
          const initial = await marker.textContent();
          await page.getByRole('button', { name: /Byt sida/ }).click();
          await expect(marker).toHaveText(initial === 'H' ? 'V' : 'H');
        }
        const firstShape = await figures.first().innerHTML();
        if (id === 'farmer-carry')
          expect(await figures.last().innerHTML()).not.toBe(firstShape);
        await page.waitForTimeout(120);
        expect(await figures.first().innerHTML()).toBe(firstShape);
        await page
          .locator('.exercise-stage')
          .screenshot({ path: test.info().outputPath(`${id}.png`) });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page
          .getByRole('button', { name: 'Från sidan', exact: true })
          .click();
        await expect(figures).toHaveCount(0);
      }
    });
  }
}

test('additional views also animate and pause explicitly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#/ovning/reverse-lunge');
  await page.getByRole('button', { name: 'Framifrån', exact: true }).click();
  const figure = page.locator('.exercise-stage svg[data-view="front"]');
  await expect(figure).toHaveCount(1);
  const before = await figure.innerHTML();
  await expect.poll(() => figure.innerHTML()).not.toBe(before);
  await page
    .getByRole('button', { name: 'Pausa rörelsen', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Spela rörelsen', exact: true }),
  ).toBeVisible();
  const paused = await figure.innerHTML();
  await page.waitForTimeout(120);
  expect(await figure.innerHTML()).toBe(paused);
});

test('an oblique view is available during the workout', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: FRESH_STATE,
    reducedMotion: 'reduce',
    viewport: { width: 360, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, { goal: 'general', level: 'some' });
    await page
      .getByRole('button', { name: 'Anpassa passet', exact: true })
      .click();
    await removeAllExercises(page);
    await addExercise(page, 'split-squat');
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Visa från sned vinkel', exact: true })
      .click();
    await expect(
      page.locator('.session-movement svg[data-view="oblique"]'),
    ).toHaveCount(1);
    await page
      .getByRole('button', { name: 'Visa från sidan', exact: true })
      .click();
    await expect(
      page.locator('.session-movement svg[data-view="oblique"]'),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
