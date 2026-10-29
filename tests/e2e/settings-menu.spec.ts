import { expect, test } from '@playwright/test';

const WIDTHS = [320, 360, 412];
const SCHEMES = ['light', 'dark'] as const;

for (const width of WIDTHS) {
  for (const scheme of SCHEMES) {
    test.describe(`settings menu ${width}px ${scheme}`, () => {
      test.use({ viewport: { width, height: 800 }, colorScheme: scheme });

      test('menu fits, rows are tall enough, Back returns, theme persists', async ({
        page,
      }) => {
        await page.goto('/#/installningar');
        await expect(
          page.getByRole('heading', { level: 1, name: 'Inställningar' }),
        ).toBeVisible();
        const noOverflow = () =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          );
        await expect.poll(noOverflow).toBe(true);

        const rows = page.locator('main ul').first().getByRole('link');
        expect(await rows.count()).toBeGreaterThanOrEqual(7);
        for (const box of await rows.evaluateAll((els) =>
          els.map((e) => e.getBoundingClientRect().height),
        ))
          expect(box).toBeGreaterThanOrEqual(48);
        const del = page.getByRole('button', { name: 'Radera all data' });
        expect((await del.boundingBox())?.height).toBeGreaterThanOrEqual(48);

        // Drill down, Back returns to the menu with the heading focused.
        await page.getByRole('link', { name: /^Min utrustning/ }).click();
        await expect(
          page.getByRole('heading', { level: 1, name: 'Min utrustning' }),
        ).toBeFocused();
        await expect.poll(noOverflow).toBe(true);
        await page.goBack();
        await expect(
          page.getByRole('heading', { level: 1, name: 'Inställningar' }),
        ).toBeVisible();
        await page.getByRole('link', { name: /^Integritet/ }).click();
        await page
          .getByRole('link', { name: 'Tillbaka till inställningar' })
          .click();
        await expect(
          page.getByRole('heading', { level: 1, name: 'Inställningar' }),
        ).toBeVisible();

        // Theme change persists and shows in the menu.
        await page.getByRole('link', { name: /^Utseende/ }).click();
        await expect(
          page.getByRole('heading', { level: 1, name: 'Utseende' }),
        ).toBeVisible();
        await expect.poll(noOverflow).toBe(true);
        await page.getByRole('radio', { name: /Lagun/ }).check({ force: true });
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'hav');
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'hav');
        await page
          .getByRole('link', { name: 'Tillbaka till inställningar' })
          .click();
        await expect(
          page.getByRole('link', { name: /^Utseende/ }),
        ).toContainText('Hav');
      });
    });
  }
}
