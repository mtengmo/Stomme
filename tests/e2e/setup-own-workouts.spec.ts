import { expect, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

test.use({ storageState: FRESH_STATE });

for (const [width, scheme] of [
  [360, 'light'],
  [320, 'dark'],
] as const) {
  test(`setup Egna pass: create via link, prefs unchanged (${width}, ${scheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, { goal: 'running' });
    const openSetup = async () => {
      await page.goto('/#/');
      await page.getByText('Ändra', { exact: true }).click();
      await page.getByRole('button', { name: 'Byt inriktning' }).click();
    };
    await openSetup();
    await page.getByRole('radio', { name: 'Egna pass' }).check();
    await expect(page.getByText('Inga egna pass än.')).toBeVisible();
    await expect(page.getByText('Vilken utrustning har du?')).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`setup-own-${width}-${scheme}.png`),
    });
    await page.getByRole('link', { name: 'Skapa nytt pass' }).click();
    await expect(
      page.getByRole('heading', { name: 'Skapa eget pass' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /^Välj: / })
      .first()
      .click();
    await page.getByRole('button', { name: 'Skapa pass' }).click();
    await expect(page.getByLabel('Namn på passet')).toBeVisible();
    await openSetup();
    await expect(
      page.getByRole('radio', { name: 'Styrka för löpning' }),
    ).toBeChecked();
  });
}
