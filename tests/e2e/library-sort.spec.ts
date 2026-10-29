import { expect, test } from '@playwright/test';

for (const width of [320, 360, 412]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`library sort survives reload and the guide (${width}, ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/#/ovningar?sok=utfall');
      const select = page.getByLabel('Sortera', { exact: true });
      await expect(select).toHaveValue('fit');
      expect((await select.boundingBox())?.height).toBeGreaterThanOrEqual(48);
      await select.selectOption('name');
      await expect(page).toHaveURL(/sort=name/);

      const names = () =>
        page
          .locator('[id^="meta-"]')
          .evaluateAll((nodes) =>
            nodes.map((node) =>
              node
                .closest('li')
                ?.querySelector('a')
                ?.getAttribute('aria-label'),
            ),
          );
      const sorted = (await names()) as string[];
      expect(sorted).toEqual(
        [...sorted].sort((a, b) => a.localeCompare(b, 'sv')),
      );

      await page.reload();
      await expect(select).toHaveValue('name');

      await page
        .locator('[id^="meta-"]')
        .first()
        .locator('xpath=ancestor::a')
        .click();
      await expect(page).toHaveURL(/#\/ovning\//);
      await page.goBack();
      await expect(page.getByLabel('Sortera', { exact: true })).toHaveValue(
        'name',
      );
      await expect(page).toHaveURL(/sort=name/);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}
