import { expect, test } from '@playwright/test';
import { getTheme } from '../../src/styles/themes/registry';

const rutat = getTheme('rutat');

for (const mode of [
  { name: 'mobile light', width: 360, colorScheme: 'light' as const },
  { name: 'desktop dark', width: 1280, colorScheme: 'dark' as const },
]) {
  test(`body and equipment colours stay distinct (${mode.name})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mode.width, height: 900 });
    await page.emulateMedia({
      colorScheme: mode.colorScheme,
      reducedMotion: 'no-preference',
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    for (const sample of [
      { id: 'dumbbell-rdl', equipment: 'dumbbell' },
      { id: 'kettlebell-rack-carry', equipment: 'kettlebell' },
      { id: 'band-leg-press', equipment: 'band' },
    ]) {
      await page.goto(`/#/ovning/${sample.id}`);
      const movement = page.getByRole('region', { name: 'Rörelsen' });
      const equipment = movement.locator(
        `[data-equipment="${sample.equipment}"]`,
      );
      await expect(equipment).toHaveCount(1);
      const colours = await equipment.evaluate((element) => {
        const target = element.matches('path')
          ? element
          : element.querySelector('path');
        const root = getComputedStyle(document.documentElement);
        const body = document.querySelector('[data-body-side="near"]');
        return {
          equipment: target ? getComputedStyle(target).stroke : '',
          body: body ? getComputedStyle(body).stroke : '',
          token: root.getPropertyValue('--equipment').trim(),
        };
      });
      expect(colours.equipment).not.toBe(colours.body);
      expect(colours.token).toBe(rutat?.tokens[mode.colorScheme].equipment);
      if (sample.id === 'dumbbell-rdl') {
        const near = await movement
          .locator('[data-body-side="near"]')
          .evaluate((element) => getComputedStyle(element).stroke);
        const far = await movement
          .locator('[data-body-side="far"]')
          .evaluate((element) => getComputedStyle(element).stroke);
        expect(far).toBe(near);
        await expect(
          movement.getByText('Blått: båda sidor arbetar.', { exact: false }),
        ).toBeVisible();
      }
      if (sample.equipment === 'band')
        await expect(equipment).toHaveAttribute('stroke-dasharray', '5 3');
      await page.screenshot({
        path: test.info().outputPath(`${sample.equipment}.png`),
      });
    }
  });
}
