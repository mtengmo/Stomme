import { expect, test } from '@playwright/test';
import { FRESH_STATE } from './state';

test.use({ viewport: { width: 360, height: 800 } });

test('@themes picking a theme in Settings applies at once and survives reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.goto('/#/installningar');
  await expect(page.getByRole('heading', { name: 'Utseende' })).toBeVisible();
  await page.getByText('Lagun', { exact: false }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hav');
  await expect(page.getByRole('radio', { name: /Lagun/ })).toBeChecked();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hav');
  await expect(page.getByRole('radio', { name: /Lagun/ })).toBeChecked();
});

test('@themes the picker rows are at least 56 px and 16 px text, keyboard operable', async ({
  page,
}) => {
  await page.goto('/');
  await page.goto('/#/installningar');
  const radios = page
    .getByRole('group', { name: 'Färgtema' })
    .getByRole('radio');
  await expect(radios.first()).toBeAttached();
  const count = await radios.count();
  expect(count).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    const row = radios.nth(i).locator('xpath=following-sibling::span[1]');
    const box = await row.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
    expect(box?.width ?? 0).toBeLessThanOrEqual(360);
  }
  // The light/dark rows are controls too: at least 56 px as well.
  const schemeRadios = page
    .getByRole('group', { name: 'Ljust eller mörkt' })
    .getByRole('radio');
  expect(await schemeRadios.count()).toBe(3);
  for (let i = 0; i < 3; i++) {
    const box = await schemeRadios
      .nth(i)
      .locator('xpath=following-sibling::span[1]')
      .boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
  }
  await radios.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hav');
  const font = await page
    .getByRole('group', { name: 'Färgtema' })
    .locator('legend')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(font).toBeGreaterThanOrEqual(16);
});

test.describe('@themes onboarding', () => {
  test.use({ storageState: FRESH_STATE });

  test('@themes onboarding has a collapsed colour chooser and the primary action is unchanged', async ({
    page,
  }) => {
    await page.goto('/');
    const details = page.locator('details', {
      hasText: 'Välj färger (kan ändras senare)',
    });
    await expect(details).not.toHaveAttribute('open', '');
    await details.getByText('Välj färger (kan ändras senare)').click();
    await page.getByText('Skymning', { exact: false }).first().click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'kvallssol',
    );
    await expect(page.getByRole('button', { name: /Jag förstår/ })).toHaveCount(
      1,
    );
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await expect(page.getByRole('button', { name: /Jag förstår/ })).toHaveCount(
      0,
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'kvallssol',
    );
  });
});

test('@themes "Följ telefonen" follows the emulated colour scheme, a fixed choice does not', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.goto('/#/installningar');
  await expect(
    page.getByRole('radio', { name: 'Följ telefonen' }),
  ).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
  await page.getByText('Ljust', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
  await page.getByText('Följ telefonen', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
});

test('@themes the focus ring is not clipped and uses the double ring in Hög kontrast light', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'stomme.appearance',
      JSON.stringify({ theme: 'hog-kontrast', scheme: 'light' }),
    ),
  );
  await page.goto('/');
  await page.goto('/#/installningar');
  const target = page.getByRole('radio', { name: 'Följ telefonen' });
  await target.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const style = await page
    .getByRole('link', { name: 'Granska alla övningar' })
    .evaluate((el) => {
      (el as HTMLElement).focus();
      const s = getComputedStyle(el);
      return {
        outline: s.outlineColor,
        shadow: s.boxShadow,
        width: s.outlineWidth,
      };
    });
  expect(style.outline).toBe('rgb(11, 11, 11)');
  expect(style.shadow).toContain('rgb(255, 213, 0)');
  expect(style.width).toBe('3px');
});
