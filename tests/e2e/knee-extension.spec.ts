import { expect, test } from '@playwright/test';

for (const mode of [
  { width: 360, colorScheme: 'light' as const },
  { width: 1280, colorScheme: 'dark' as const },
]) {
  test(`E30 extends from a stable seated position and holds before lowering (${mode.width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mode.width, height: 900 });
    await page.emulateMedia({
      colorScheme: mode.colorScheme,
      reducedMotion: 'no-preference',
    });
    await page.clock.install();
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page.goto('/#/granska?ovning=E30');
    await expect(
      page.getByRole('heading', {
        name: 'E30 · Sittande knästräckning',
        exact: true,
      }),
    ).toBeVisible();
    const leg = page
      .locator('.exercise-stage [data-body-side="near"] path')
      .nth(1);
    await page.clock.runFor(3000);
    const extended = await leg.getAttribute('d');
    await page.clock.runFor(1500);
    await expect(leg).toHaveAttribute('d', extended ?? '');
    await page
      .getByRole('button', { name: 'Pausa rörelsen', exact: true })
      .click();
    await page.clock.runFor(6000);
    await expect(leg).toHaveAttribute('d', extended ?? '');
    await page.screenshot({
      path: test.info().outputPath('E30-right-extended.png'),
    });
    await page.getByRole('button', { name: /Höger sida · Byt sida/ }).click();
    await expect(page.locator('.exercise-stage svg > g')).toHaveAttribute(
      'transform',
      'translate(192 0) scale(-1 1)',
    );
    await page.screenshot({
      path: test.info().outputPath('E30-left-extended.png'),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
