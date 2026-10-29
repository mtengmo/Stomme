import { devices, expect, test } from '@playwright/test';
import { addWeight, quickStart } from './flow';
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
  await expect(
    page.getByRole('link', { name: /^Säkerhetskopia/ }),
  ).toBeVisible();
});

test('nav tabs are keyboard reachable and the answers survive leaving', async ({
  page,
}) => {
  await accept(page);
  await quickStart(page, {
    goal: 'general',
    onEquipment: (p) => addWeight(p, { type: 'dumbbell', count: 2, kg: 5 }),
    finish: 'equipment',
  });
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
  await expect(page.getByText('Hantel 5 kg · par')).toBeVisible();
});

test('workout preview shows the nav above the start bar; the session hides it', async ({
  page,
}) => {
  await accept(page);
  await quickStart(page, { goal: 'general' });
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

test('preview edits and the Besvär choice survive leaving via the nav; starting clears them', async ({
  page,
}) => {
  await accept(page);
  await quickStart(page, { goal: 'general' });
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await page
    .getByRole('button', { name: /Ändra$/ })
    .first()
    .click();
  await page.getByLabel('Set', { exact: true }).first().fill('4');
  await page
    .getByText('Besvär eller något att anpassa idag?', { exact: true })
    .click();
  const ask = page.getByRole('checkbox', {
    name: /Fråga hur kroppen känns före passet/,
  });
  await ask.check();
  const trainingTab = page.getByRole('link', { name: 'Träning', exact: true });
  await expect(trainingTab).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Historik' }).click();
  await expect(page.getByRole('heading', { name: 'Historik' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();
  await expect(page.getByLabel('Set', { exact: true }).first()).toHaveValue(
    '4',
  );
  await page
    .getByText('Besvär eller något att anpassa idag?', { exact: true })
    .click();
  await expect(ask).toBeChecked();
  await page.getByRole('button', { name: 'Börja passet' }).click();
  await page.waitForURL(/#\/kansla\//);
  const stored = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((k) =>
      k.startsWith('stomme.training-draft'),
    ),
  );
  expect(stored).toEqual([]);
});

test('picks and filters in the pick step survive leaving and coming back', async ({
  page,
}) => {
  await accept(page);
  await quickStart(page, { goal: 'build', finish: false });
  await page
    .getByRole('button', { name: /^Välj: / })
    .first()
    .click();
  await expect(page.getByRole('status')).toContainText('1 av 12 övningar');
  await page.getByRole('link', { name: 'Inställningar' }).click();
  await page.getByRole('link', { name: 'Träning' }).click();
  await expect(
    page.getByRole('heading', { name: 'Välj dina övningar' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('1 av 12 övningar');
});
