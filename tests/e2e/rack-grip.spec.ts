import { expect, test } from '@playwright/test';

for (const mode of [
  { width: 360, colorScheme: 'light' as const },
  { width: 1280, colorScheme: 'dark' as const },
]) {
  test(`rack carry shows the supported bell and a matching close-up (${mode.width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mode.width, height: 900 });
    await page.emulateMedia({ colorScheme: mode.colorScheme });
    await page.goto('/#/granska?ovning=E40');
    const movement = page.getByRole('region', { name: 'Rörelsen' });
    await expect(movement.locator('[data-grip="rack"]')).toHaveCount(1);
    await expect(movement.locator('[data-rack-hand]')).toHaveCount(1);
    const right = page.getByRole('figure', {
      name: 'Kettlebellgrepp vid axeln, höger sida',
    });
    await expect(right).toHaveCount(1);
    await expect(right.locator('svg')).toHaveAttribute(
      'viewBox',
      '94 73 43 42',
    );
    await movement
      .getByRole('button', { name: /Höger sida · Byt sida/ })
      .click();
    const left = page.getByRole('figure', {
      name: 'Kettlebellgrepp vid axeln, vänster sida',
    });
    await expect(left.locator('svg')).toHaveAttribute('viewBox', '55 73 43 42');
    await left.scrollIntoViewIfNeeded();
    await expect(left.getByText('Handen runt handtaget.')).toBeVisible();
    const size = await left.locator('svg').boundingBox();
    expect(size?.height).toBeLessThanOrEqual(160);
    expect(size?.height).toBeGreaterThan(100);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath('rack-closeup-left.png'),
    });
  });
}
