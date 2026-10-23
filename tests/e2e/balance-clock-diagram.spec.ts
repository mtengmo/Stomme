import { expect, test } from '@playwright/test';
import { FRESH_STATE } from './state';

test.use({ storageState: FRESH_STATE });

for (const width of [360, 1280]) {
  test(`balance clock diagram: five dots, pause and reduced motion are still (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page.goto('/#/ovning/balance-clock');
    const diagram = page.getByTestId('balance-clock-diagram');
    await expect(diagram).toBeVisible();
    await expect(diagram.locator('[data-clock-dot]')).toHaveCount(5);
    await expect(diagram.locator('.clock-dot-cycle')).toHaveCount(5);
    await expect(diagram.locator('[data-order]')).toHaveCount(5);
    await page
      .getByRole('button', { name: 'Pausa rörelsen', exact: true })
      .click();
    await expect(diagram.locator('.clock-dot-cycle')).toHaveCount(0);
    await expect(diagram.locator('[data-order]')).toHaveCount(5);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(diagram.locator('[data-clock-dot]')).toHaveCount(5);
    await expect(diagram.locator('.clock-dot-cycle')).toHaveCount(0);
    await expect(diagram.locator('[data-order]')).toHaveCount(5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
