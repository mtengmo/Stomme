import { expect, test } from '@playwright/test';
import { quickStart } from './flow';

for (const width of [360, 1280]) {
  test(`new bodyweight exercises can be browsed and saved (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await quickStart(page, { goal: 'general' });
    await expect(
      page.getByRole('heading', { name: 'Pass A', exact: true }),
    ).toBeVisible();
    await page.goto('/#/ovningar');
    const search = page.getByLabel('Sök övning');
    for (const number of [
      'E54',
      'E55',
      'E56',
      'E57',
      'E58',
      'E59',
      'E60',
      'E61',
      'E62',
      'E63',
      'E64',
      'E65',
      'E66',
      'E67',
      'E68',
      'E69',
      'E70',
      'E71',
    ]) {
      await search.fill(number);
      const row = page.getByRole('listitem').filter({
        has: page.getByRole('button', { name: /^Välj: / }),
      });
      await expect(row).toHaveCount(1);
      await expect(row.locator('svg').first()).toBeVisible();
      if (['E54', 'E61', 'E64'].includes(number)) {
        await row.getByRole('button', { name: /^Välj: / }).click();
      }
    }
    const bar = page.getByRole('region', { name: 'Valda övningar' });
    await expect(bar.getByRole('status')).toContainText('3 valda');
    await bar.getByRole('button', { name: 'Skapa pass', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: /^Eget pass \d+ \S+$/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`bodyweight-${width}.png`),
    });
  });
}
