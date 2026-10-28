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
    const search = page.getByLabel('Sök efter namn eller nummer');
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
        has: page.getByRole('button', { name: /^Välj till eget pass/ }),
      });
      await expect(row).toHaveCount(1);
      await expect(row.locator('svg').first()).toBeVisible();
      if (['E54', 'E61', 'E64'].includes(number)) {
        await row.getByRole('button', { name: /^Välj till eget pass/ }).click();
      }
    }
    await expect(
      page.getByRole('heading', { name: 'Valda övningar · 3 av 12' }),
    ).toBeVisible();
    await page.getByLabel('Namn på passet').fill('Kroppsvikt');
    await page
      .getByRole('button', { name: 'Spara eget pass', exact: true })
      .click();
    const saved = page.getByRole('link', { name: 'Kroppsvikt · 3 övningar' });
    await expect(saved).toBeVisible();
    await page.reload();
    await saved.click();
    await expect(
      page.getByRole('heading', { name: 'Kroppsvikt', exact: true }),
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
