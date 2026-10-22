import { expect, test } from '@playwright/test';
import { getTheme } from '../../src/styles/themes/registry';

const rutat = getTheme('rutat');

test.describe('appearance boot (production CSP)', () => {
  test('first paint already has the stored theme and scheme, before the app bundle runs', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'stomme.appearance',
        JSON.stringify({ theme: 'rutat', scheme: 'dark' }),
      );
    });
    // Without the app bundle only theme-boot.js and the stylesheet can set the look.
    await page.route('**/assets/*.js', (route) => route.abort());
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'rutat');
    await expect(html).toHaveAttribute('data-scheme', 'dark');
    const state = await page.evaluate(() => ({
      background: getComputedStyle(document.documentElement).backgroundColor,
      paper: getComputedStyle(document.documentElement)
        .getPropertyValue('--paper')
        .trim(),
    }));
    expect(state.paper).toBe(rutat?.tokens.dark.paper);
    expect(state.background).toBe('rgb(26, 31, 33)');
  });

  test('unknown theme ids fall back to Rutat and the scheme follows the phone', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'stomme.appearance',
        JSON.stringify({ theme: 'does-not-exist', scheme: 'system' }),
      );
    });
    await page.route('**/assets/*.js', (route) => route.abort());
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'rutat');
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
  });

  test('the CSP is active, no inline script exists and theme-color follows --paper', async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text()))
        violations.push(message.text());
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('#root > *').first()).toBeVisible();
    await expect(
      page.locator('meta[http-equiv="Content-Security-Policy"]'),
    ).toHaveCount(1);
    expect(await page.locator('script:not([src])').count()).toBe(0);
    await expect(page.locator('script[src$="theme-boot.js"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      rutat?.tokens.dark.paper ?? '',
    );
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      rutat?.tokens.light.paper ?? '',
    );
    expect(violations).toEqual([]);
  });

  test('"Radera all data" clears the stored appearance', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page.evaluate(() =>
      localStorage.setItem(
        'stomme.appearance',
        JSON.stringify({ theme: 'rutat', scheme: 'dark' }),
      ),
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
    await page.goto('/#/installningar');
    await page.getByRole('button', { name: 'Radera all data' }).click();
    await page.getByRole('button', { name: 'Radera all data nu' }).click();
    await expect(
      page.getByRole('heading', { name: 'Välkommen till Stomme' }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
    expect(
      await page.evaluate(() => localStorage.getItem('stomme.appearance')),
    ).toBeNull();
  });
});
