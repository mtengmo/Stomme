import { devices, expect, test } from '@playwright/test';
import { FRESH_STATE } from './state';

test.use({
  ...devices['Pixel 7'],
  viewport: { width: 360, height: 800 },
  storageState: FRESH_STATE,
});

async function accept(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Huvudmeny' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Vad vill du träna?' }),
  ).toBeVisible();
}

test('after onboarding the first-use screen shows the three nav items', {
  tag: '@smoke',
}, async ({ page }) => {
  await accept(page);
  const nav = page.getByRole('navigation', { name: 'Huvudmeny' });
  for (const name of ['Träning', 'Historik', 'Inställningar'])
    await expect(nav.getByRole('link', { name })).toBeVisible();
});

test('Inställningar is one tap from a fresh start (after accepting)', async ({
  page,
}) => {
  await accept(page);
  await page.getByRole('link', { name: 'Inställningar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inställningar' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportera' })).toBeVisible();
});

test('nav tabs are keyboard reachable and the answers survive leaving', async ({
  page,
}) => {
  await accept(page);
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Hantlar' }).check();
  const tab = page.getByRole('link', { name: 'Historik' });
  await tab.focus();
  await expect(tab).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Inställningar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Inställningar' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Träning' }).click();
  await expect(page.getByRole('checkbox', { name: 'Hantlar' })).toBeChecked();
});

test('workout preview shows the nav above the start bar; the session hides it', async ({
  page,
}) => {
  await accept(page);
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page.getByRole('button', { name: 'Visa mitt pass' }).click();
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Huvudmeny' });
  await expect(nav).toBeVisible();
  const start = page.getByRole('button', { name: 'Börja passet' });
  await expect(start).toBeVisible();
  const [n, s] = await Promise.all([nav.boundingBox(), start.boundingBox()]);
  expect(s && n && s.y + s.height <= n.y).toBe(true);
  await start.click();
  await page.waitForURL(/#\/(session|kansla)\//);
  await expect(nav).toHaveCount(0);
});
