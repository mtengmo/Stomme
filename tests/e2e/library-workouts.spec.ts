import { expect, test } from '@playwright/test';

for (const width of [360, 1280]) {
  test(`browse previews and reuse a custom workout (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page
      .getByRole('button', { name: 'Bli starkare', exact: true })
      .click();
    await page
      .getByRole('checkbox', { name: 'Kettlebell', exact: true })
      .check();
    await page
      .getByRole('button', { name: 'Visa mitt pass', exact: true })
      .click();
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
    await expect(first.locator('svg')).toHaveCount(2); // figure and link arrow
    await first.getByRole('button', { name: /^Visa rörelsen:/ }).click();
    await expect(
      first.getByRole('button', { name: /^Pausa rörelsen:/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await second.getByRole('button', { name: /^Visa rörelsen:/ }).click();
    await expect(
      first.getByRole('button', { name: /^Visa rörelsen:/ }),
    ).toHaveAttribute('aria-pressed', 'false');
    await second.getByRole('button', { name: /^Välj till eget pass/ }).click();
    await first.getByRole('button', { name: /^Välj till eget pass/ }).click();
    await page.getByLabel('Sök efter namn eller nummer').fill('E39');
    await expect(
      page.getByRole('heading', { name: 'Valda övningar · 2 av 12' }),
    ).toBeVisible();
    await page
      .getByRole('link', {
        name: 'Enarms golvpress med kettlebell',
        exact: true,
      })
      .click();
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Valda övningar · 2 av 12' }),
    ).toBeVisible();
    await page.getByLabel('Namn på passet').fill('Mitt kettlebellpass');
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`library-${width}.png`),
      fullPage: false,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Spara eget pass', exact: true })
      .click();
    await page.reload();
    await page
      .getByRole('link', { name: 'Mitt kettlebellpass · 2 övningar' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Mitt kettlebellpass', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Set', { exact: true })).toHaveCount(2);
    await page.getByLabel('Set', { exact: true }).first().fill('1');
    await page.getByLabel('Meter per sida').fill('12');
    await page
      .getByRole('button', { name: 'Spara ändringar i eget pass' })
      .click();
    await expect(
      page.getByText('Ändringarna är sparade.', { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.getByLabel('Set', { exact: true }).first()).toHaveValue(
      '1',
    );
    await expect(page.getByLabel('Meter per sida')).toHaveValue('12');
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await page.getByRole('radio', { name: 'Redo att träna' }).check();
    await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
    await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
    await expect(page.getByText(/Mitt kettlebellpass/)).toBeVisible();
    await page.goto('/#/ovningar');
    await page
      .getByRole('button', { name: 'Ta bort Mitt kettlebellpass', exact: true })
      .click();
    await expect(
      page.getByRole('link', { name: 'Mitt kettlebellpass · 2 övningar' }),
    ).toHaveCount(0);
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
    page.getByRole('region', { name: 'Rörelsen' }).locator('svg'),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Mitt', exact: true }),
  ).toHaveCount(0);
});
