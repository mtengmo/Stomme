import { devices, expect, type Page, test } from '@playwright/test';
import { FRESH_STATE } from './state';

// "Gör om programmet": choose the level, shuffle, see the new passes before saving.
test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const SHOTS = process.env.REDO_SHOTS ? '.impeccable/review/program-redo' : null;

async function toProgramme(page: Page, emphasis = 'Ben & bål för löpning') {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page.getByRole('radio', { name: '3 dagar' }).check();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await page.getByRole('radio', { name: emphasis }).check();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  if (emphasis === 'Ben & bål för löpning')
    await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await page.getByRole('radio', { name: /Ny eller på väg tillbaka/ }).check();
  await page.getByRole('button', { name: 'Visa mitt program' }).click();
  await expect(page).toHaveURL(/#\/program(?:\?|$)/);
  await expect(page.getByText('Nivå: Ny eller på väg tillbaka')).toBeVisible();
}

const passNames = (page: Page) =>
  page
    .locator('section[aria-labelledby^="redo-pass-"]')
    .evaluateAll((sections) =>
      sections.map((s) =>
        [...s.querySelectorAll('li')].map((li) =>
          li.querySelector('.break-words')?.textContent?.trim(),
        ),
      ),
    );

test('redo: pick a level, preview the passes, keep or save', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await toProgramme(page);
  await page.goto('/#/mitt-program');
  await page.getByRole('button', { name: /^Gör om programmet/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Göra om programmet?' }),
  ).toBeVisible();
  const level = page.getByRole('group', { name: 'Nivå' });
  await expect(level.getByRole('radio')).toHaveCount(3);
  await expect(
    level.getByRole('radio', { name: 'Ny eller på väg tillbaka' }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Blanda om övningarna' }),
  ).toBeChecked();
  await expect(
    page.getByRole('heading', { name: 'Så här blir passen' }),
  ).toBeVisible();
  expect((await passNames(page)).length).toBe(3);

  // Keep: nothing changes.
  await page.getByRole('button', { name: 'Behåll programmet' }).click();
  await expect(page.getByText('Nivå: Ny eller på väg tillbaka')).toBeVisible();

  // Redo at another level: the preview is what gets saved.
  await page.getByRole('button', { name: /^Gör om programmet/ }).click();
  await level.getByRole('radio', { name: 'Viss vana' }).check();
  const previewed = await passNames(page);
  expect(previewed.length).toBe(3);
  await page.getByRole('button', { name: 'Gör om programmet nu' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('heading', { name: /^Vecka 1/ })).toBeVisible();
  // The first pass on Idag is the one that was previewed.
  const home = (await page.locator('main').innerText()).toLowerCase();
  for (const name of previewed[0] ?? [])
    expect(home, name).toContain((name ?? '').toLowerCase());
  await page.goto('/#/mitt-program');
  await expect(page.getByText('Nivå: Viss vana')).toBeVisible();
});

test('the change flow offers the plan step and keeps the ready pass on redo', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await toProgramme(page, 'Hela kroppen');
  await page.goto('/#/mitt-program');
  await page.getByRole('link', { name: /^Ändra planeringen/ }).click();
  await expect(page).toHaveURL(/kom-igang\?steg=days/);
  const next = page.getByRole('button', { name: 'Nästa', exact: true });
  await next.click();
  await page.getByRole('radio', { name: 'Ben & bål för löpning' }).check();
  await next.click();
  await expect(
    page.getByRole('heading', { name: 'Hur vill du lägga upp passen?' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Löparens tio' }).check();
  await next.click();
  await page.getByRole('button', { name: 'Gör om programmet' }).click();
  await expect(page).toHaveURL(/#\/program\?ny=1/);
  await expect(
    page.getByRole('region', { name: /^Nästa pass: Pass 1, Löparens tio/ }),
  ).toBeVisible();
  // "Gör om programmet" later keeps the ready pass.
  await page.goto('/#/mitt-program');
  await page.getByRole('button', { name: /^Gör om programmet/ }).click();
  await expect(
    page.getByRole('heading', { name: /^Pass 1 · Löparens tio/ }),
  ).toBeVisible();
});

const SIZES = [
  { name: '390x844', viewport: { width: 390, height: 844 }, scale: 100 },
  { name: '320x640-130', viewport: { width: 320, height: 640 }, scale: 130 },
  { name: '320x640-200', viewport: { width: 320, height: 640 }, scale: 200 },
] as const;
for (const size of SIZES)
  for (const colorScheme of ['light', 'dark'] as const)
    test(`redo screen fits ${size.name} ${colorScheme}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(size.viewport);
      await page.emulateMedia({ colorScheme });
      // A constant seed: "Blanda igen" cannot change the preview, so the note shows.
      await page.addInitScript(() => {
        const real = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = ((array: Uint32Array) =>
          array instanceof Uint32Array && array.length === 1
            ? Object.assign(array, [7])
            : real(array as never)) as typeof crypto.getRandomValues;
      });
      await toProgramme(page);
      await page.goto('/#/mitt-program');
      if (size.scale !== 100)
        await page.addStyleTag({ content: `html{font-size:${size.scale}%}` });
      await page.getByRole('button', { name: /^Gör om programmet/ }).click();
      await expect(
        page.getByRole('heading', { name: 'Så här blir passen' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Blanda igen' }).click();
      await expect(
        page.getByText(
          'Inga fler likvärdiga övningar för din nivå och utrustning.',
        ),
      ).toBeVisible();
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      expect(over, 'horizontal overflow').toBeLessThanOrEqual(0);
      const wide = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > innerWidth + 1;
          })
          .map((el) => el.tagName),
      );
      expect(wide).toEqual([]);
      // Every control is at least 48 px tall.
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('button, label')]
          .filter((el) => el.getBoundingClientRect().height < 47.5)
          .map((el) => (el.textContent ?? '').slice(0, 24)),
      );
      expect(small).toEqual([]);
      if (SHOTS)
        await page.screenshot({
          path: `${SHOTS}/redo-${size.name}-${colorScheme}.png`,
          fullPage: true,
        });
    });
