import { expect, test } from '@playwright/test';
import { exerciseReferences } from '../../src/content/exerciseReferences';
import { exerciseList } from '../../src/content/exercises';

const additions = exerciseList.filter(
  (exercise) => Number(exerciseReferences[exercise.id].slice(1)) >= 73,
);

for (const width of [320, 390]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`added exercise guides (${width} ${colorScheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const exercise of additions) {
        await page.goto(`/#/ovning/${exercise.id}`);
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: exercise.name,
            exact: true,
          }),
        ).toBeVisible();
        const stage = page.locator('.exercise-stage');
        const frames = stage.locator('svg');
        await expect.poll(() => frames.count()).toBeGreaterThanOrEqual(2);
        expect(await stage.innerHTML()).not.toMatch(/NaN|undefined/);
        const first = await frames
          .first()
          .locator('path')
          .evaluateAll((paths) =>
            paths
              .map((path) => path.getAttribute('d'))
              .sort()
              .join('|'),
          );
        const last = await frames
          .last()
          .locator('path')
          .evaluateAll((paths) =>
            paths
              .map((path) => path.getAttribute('d'))
              .sort()
              .join('|'),
          );
        expect(
          last,
          `${exercise.id}: reduced-motion frames show distinct stages`,
        ).not.toBe(first);
        if (exercise.perSide) {
          const markers = stage.locator('text').filter({ hasText: /^[HV]$/ });
          const before = await markers.first().textContent();
          await page.getByRole('button', { name: /Byt sida/ }).click();
          await expect(markers.first()).toHaveText(before === 'H' ? 'V' : 'H');
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          exercise.id,
        ).toBe(true);
        await stage.screenshot({
          path: test
            .info()
            .outputPath(
              `${exerciseReferences[exercise.id]}-${width}-${colorScheme}.png`,
            ),
        });
      }
    });
  }
}
