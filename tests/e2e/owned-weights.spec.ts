import { expect, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

test.use({ storageState: FRESH_STATE });
for (const width of [360, 1280]) {
  test(`owned loads follow equipment variants (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, {
      goal: 'general',
      equipment: ['Hantlar', 'Kettlebell'],
      finish: 'equipment',
    });
    // The weights panel opens by itself once dumbbells or kettlebells are ticked.
    await page
      .getByRole('button', { name: 'Lägg till vikt', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Lägg till vikt', exact: true })
      .click();
    await page
      .getByRole('combobox', { name: 'Redskap', exact: true })
      .last()
      .selectOption('kettlebell');
    await page
      .getByRole('combobox', { name: 'Antal', exact: true })
      .last()
      .selectOption('1');
    await page.getByLabel('Kg per redskap', { exact: true }).last().fill('16');
    await page.getByRole('button', { name: 'Nästa', exact: true }).click();
    await page.getByRole('button', { name: 'Nästa', exact: true }).click();
    await page
      .getByRole('button', { name: 'Visa mitt pass', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Pass A', exact: true }),
    ).toBeVisible();
    await page.goto('/#/ovningar');
    await page.getByLabel('Sök övning').fill('E12');
    await page.getByRole('button', { name: /^Välj: / }).click();
    await page.getByRole('button', { name: 'Skapa pass', exact: true }).click();
    await page.locator('ol > li > button[aria-expanded]').first().click();
    const variant = page.getByRole('combobox', {
      name: 'Utrustningsvariant',
      exact: true,
    });
    const weight = page.getByRole('spinbutton', { name: /^Total vikt \(kg\)/ });
    await variant.selectOption('dumbbell');
    await expect(weight).toHaveValue('5');
    await variant.selectOption('kettlebell');
    await expect(weight).toHaveValue('16');
    await expect(
      page.locator('span').filter({ hasText: /^1 × 16 kg$/ }),
    ).toBeVisible();
    await weight.fill('12');
    await expect(page.getByText(/12 kg finns inte bland dina/)).toBeVisible();
    await variant.selectOption('bodyweight');
    await expect(weight).toHaveValue('0');
    await expect(weight).toBeDisabled();
    await variant.selectOption('kettlebell');
    await expect(weight).toHaveValue('16');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`weights-${width}.png`),
    });
  });
}
