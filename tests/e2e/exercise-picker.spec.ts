import { expect, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

test.use({ storageState: FRESH_STATE });
for (const width of [320, 360, 412])
  for (const scheme of ['light', 'dark'] as const) {
    test(`searchable exercise replacement (${width}, ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await quickStart(page, { goal: 'general', level: 'some' });
      await page
        .getByRole('button', { name: 'Anpassa passet', exact: true })
        .click();
      const before = await page.locator('ol > li').count();
      await page.locator('#exercise-row-knee-push-up').click();
      await page
        .getByRole('button', { name: 'Byt övning', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Byt övning', level: 1 }),
      ).toBeVisible();
      const search = page.getByLabel('Sök övning', { exact: true });
      await search.fill('E54');
      await expect(page.locator('main').getByRole('listitem')).toHaveCount(1);
      await page.getByRole('button', { name: 'Favorit', exact: true }).click();
      await page
        .locator('summary')
        .filter({ hasText: /^Fler filter/ })
        .click();
      await page.getByLabel('Bara mina favoriter').check();
      await expect(page.locator('main').getByRole('listitem')).toHaveCount(1);
      await page
        .getByRole('link', {
          name: 'Visa instruktion: Armhävning',
          exact: true,
        })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Armhävning', exact: true }),
      ).toBeVisible();
      await page.goBack();
      await expect(search).toHaveValue('E54');
      await expect(page.locator('main').getByRole('listitem')).toHaveCount(1);
      await page.screenshot({
        path: test.info().outputPath(`picker-${width}-${scheme}.png`),
      });
      await page
        .getByRole('button', { name: 'Byt till övningen', exact: true })
        .click();
      await expect(page.locator('ol > li')).toHaveCount(before);
      await expect(page.locator('#exercise-row-push-up')).toBeFocused();
      await page
        .getByRole('button', { name: 'Lägg till övning', exact: true })
        .click();
      await search.fill('E54');
      await expect(
        page.getByRole('button', { name: 'Redan i passet', exact: true }),
      ).toBeDisabled();
      await search.fill('Väggarmhävning');
      await expect(page.locator('main').getByRole('listitem')).toHaveCount(1);
      await page
        .getByRole('button', { name: 'Lägg till övningen', exact: true })
        .click();
      await expect(page.locator('ol > li')).toHaveCount(before + 1);
      await page
        .getByRole('button', { name: 'Lägg till övning', exact: true })
        .click();
      await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
      await expect(page.locator('#open-exercise-picker')).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
