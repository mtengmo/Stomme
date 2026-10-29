import { expect, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

// First-run "Skapa eget pass": pick your own exercises before anything is saved.
test.use({ storageState: FRESH_STATE });

for (const width of [320, 360, 412]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`pick step fits, bar leaves the last row free, create and start (${width}, ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await quickStart(page, { goal: 'build', finish: false });
      await expect(
        page.getByRole('heading', { name: 'Välj dina övningar' }),
      ).toBeVisible();
      await expect(page.getByText('Steg 4 av 4')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Skapa pass' }),
      ).toBeDisabled();
      const toggles = page.getByRole('button', { name: /^Välj: / });
      await expect(toggles.first()).toBeVisible();
      await toggles.nth(0).click();
      await toggles.nth(1).click();
      await expect(page.getByRole('status')).toContainText('2 av 12 övningar');
      const fits = () =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(await fits()).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`pick-${width}-${scheme}.png`),
      });

      // At the end of the list the sticky bar must not cover the last row.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const last = page.getByRole('button', { name: /^(Välj|Vald): / }).last();
      const bar = page.getByRole('region', { name: 'Valda övningar' });
      const lastBox = await last.boundingBox();
      const barBox = await bar.boundingBox();
      expect(
        lastBox && barBox && lastBox.y + lastBox.height,
      ).toBeLessThanOrEqual(barBox?.y ?? 0);
      expect(await fits()).toBe(true);

      await page.getByRole('button', { name: 'Skapa pass' }).click();
      await expect(page.getByLabel('Namn på passet')).toBeVisible();
      await expect(page.getByLabel('Namn på passet')).toHaveValue(
        /^Eget pass /,
      );
      await page.getByRole('button', { name: /Börja passet/ }).click();
      await expect(page).toHaveURL(/#\/(session|kansla)\//);
    });
  }
}

for (const width of [320, 412]) {
  test(`/nytt-pass picks from Home without overflow (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, { goal: 'general' });
    await page.goto('/');
    await expect(page.getByText('Inga egna pass än.')).toBeVisible();
    await page.getByRole('link', { name: 'Skapa eget pass' }).click();
    await expect(
      page.getByRole('heading', { name: 'Skapa eget pass' }),
    ).toBeVisible();
    await expect(page.getByText(/^Utrustning: .*Träningsvana/)).toBeVisible();
    await page
      .getByRole('button', { name: /^Välj: / })
      .first()
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`new-${width}.png`),
    });
    await page.getByRole('button', { name: 'Skapa pass' }).click();
    await expect(page.getByLabel('Namn på passet')).toHaveValue(/^Eget pass /);
  });
}
