import { expect, test } from '@playwright/test';
import { addWeight, quickStart } from './flow';
import { FRESH_STATE } from './state';

// Covers onboarding or training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

for (const width of [360, 1280]) {
  test(`browse previews and reuse a custom workout (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, {
      goal: 'general',
      equipment: ['Kettlebell'],
      onEquipment: (p) => addWeight(p, { type: 'kettlebell', count: 1, kg: 8 }),
    });
    await expect(
      page.getByRole('heading', { name: 'Pass A', exact: true }),
    ).toBeVisible();
    await page.goto('/#/ovningar');
    const first = page.getByRole('listitem').filter({
      has: page.getByRole('link', {
        name: 'Enarms golvpress med kettlebell',
        exact: true,
      }),
    });
    const second = page.getByRole('listitem').filter({
      has: page.getByRole('link', {
        name: 'Gång med kettlebell vid axeln',
        exact: true,
      }),
    });
    await expect(first.locator('svg')).toHaveCount(4); // figure, link arrow, select toggle and favourite heart
    await first.getByRole('button', { name: /^Visa rörelsen:/ }).click();
    await expect(
      first.getByRole('button', { name: /^Pausa rörelsen:/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await second.getByRole('button', { name: /^Visa rörelsen:/ }).click();
    await expect(
      first.getByRole('button', { name: /^Visa rörelsen:/ }),
    ).toHaveAttribute('aria-pressed', 'false');
    await second.getByRole('button', { name: /^Välj: / }).click();
    await first.getByRole('button', { name: /^Välj: / }).click();
    await page.getByLabel('Sök övning').fill('E39');
    const bar = page.getByRole('region', { name: 'Valda övningar' });
    await expect(bar.getByRole('status')).toContainText('2 valda');
    await page
      .getByRole('link', {
        name: 'Enarms golvpress med kettlebell',
        exact: true,
      })
      .click();
    await page.goBack();
    await expect(bar.getByRole('status')).toContainText('2 valda');
    await page.screenshot({
      path: test.info().outputPath(`library-${width}.png`),
      fullPage: false,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await bar.getByRole('button', { name: 'Skapa pass', exact: true }).click();
    await expect(page).toHaveURL(/#\/traning\/A\?workout=/);
    await expect(
      page.getByRole('heading', { name: /^Eget pass \d+ \S+$/ }),
    ).toBeVisible();
    await page.reload();
    const rows = page.locator('ol > li > button[aria-expanded]');
    await expect(rows).toHaveCount(2);
    await expect(page.getByLabel('Set', { exact: true })).toHaveCount(0);
    await rows.first().click();
    await expect(page.getByLabel('Set', { exact: true })).toHaveCount(1);
    await page.getByLabel('Set', { exact: true }).fill('1');
    await page.getByLabel('Meter per sida').fill('12');
    await page
      .getByRole('button', { name: 'Spara ändringar i eget pass' })
      .click();
    await expect(
      page.getByText('Ändringarna är sparade.', { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await rows.first().click();
    await expect(page.getByLabel('Set', { exact: true })).toHaveValue('1');
    await expect(page.getByLabel('Meter per sida')).toHaveValue('12');
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(page).toHaveURL(/#\/session\//);
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await page.goto('/#/ovningar');
    await page.getByRole('button', { name: /^Ta bort: Eget pass/ }).click();
    await page.getByRole('button', { name: 'Ta bort passet' }).click();
    await expect(page.getByRole('link', { name: /^Eget pass/ })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Mina pass' })).toHaveCount(
      0,
    );
  });
}

test('reduced motion keeps browsing and review still', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.goto('/#/ovningar?sok=E39');
  await page.getByRole('button', { name: /^Visa rörelsen:/ }).click();
  const before = await page.locator('li svg').first().innerHTML();
  await page.waitForTimeout(150);
  expect(await page.locator('li svg').first().innerHTML()).toBe(before);
  await page.goto('/#/granska?ovning=E39');
  await expect(
    page
      .getByRole('region', { name: 'Rörelsen' })
      .locator('.exercise-stage svg'),
  ).toHaveCount(2);
  await expect(page.getByText('Start', { exact: true })).toBeVisible();
  await expect(page.getByText('Slut', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Mitt', exact: true }),
  ).toHaveCount(0);
});
