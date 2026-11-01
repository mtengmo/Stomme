import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`figure comparison page fits at ${width}px ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/#/dev/figurer-jamforelse');
      await expect(
        page.getByRole('heading', { name: 'Figurjämförelse' }),
      ).toBeVisible();
      await expect(page.getByText('Tidigare').first()).toBeVisible();
      await expect(page.getByText('Nyckelrutor + IK').first()).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.getByLabel('Tid i rörelsen').fill('0.5');
      await page.getByRole('button', { name: 'Vänster' }).click();
      await page.screenshot({
        path: `test-results/figure-comparison-${width}-${colorScheme}.png`,
        fullPage: true,
      });
    });
  }
}
