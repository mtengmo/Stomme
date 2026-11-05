import { devices, expect, type Page, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

// The four paper index tabs (Idag, Övningar, Historik, Mer), the Övningar hub,
// "Mitt program" and the per-day actions under the start button.
test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const nav = (page: Page) => page.getByRole('navigation', { name: 'Huvudmeny' });
const tab = (page: Page, name: string) =>
  nav(page).getByRole('link', { name, exact: true });

async function onProgrammeHome(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general' });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: /^Vecka 1/ })).toBeVisible();
}

test('four tabs go to their screens and mark the active one in more than colour', async ({
  page,
}) => {
  await onProgrammeHome(page);
  await expect(nav(page).getByRole('link')).toHaveText([
    'Idag',
    'Övningar',
    'Historik',
    'Mer',
  ]);
  const current = async () =>
    nav(page).locator('a[aria-current="page"]').allInnerTexts();
  expect(await current()).toEqual(['Idag']);
  // The active tab carries a drawn pencil stroke; the others do not.
  await expect(nav(page).locator('a svg[viewBox="0 0 64 8"]')).toHaveCount(1);

  await tab(page, 'Övningar').click();
  await expect(page).toHaveURL(/#\/ovningar$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Övningar' }),
  ).toBeVisible();
  expect(await current()).toEqual(['Övningar']);
  await expect(nav(page).locator('a svg[viewBox="0 0 64 8"]')).toHaveCount(1);

  await tab(page, 'Historik').click();
  await expect(page).toHaveURL(/#\/historik$/);
  expect(await current()).toEqual(['Historik']);

  await tab(page, 'Mer').click();
  await expect(page).toHaveURL(/#\/installningar$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inställningar' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /^Min utrustning/ }).click();
  expect(await current()).toEqual(['Mer']);

  await tab(page, 'Idag').click();
  expect(await current()).toEqual(['Idag']);
  // The own-workout builder stays under Övningar; Mitt program under Idag.
  await page.goto('/#/nytt-pass');
  expect(await current()).toEqual(['Övningar']);
  await page.goto('/#/mitt-program');
  expect(await current()).toEqual(['Idag']);
});

test('the Övningar hub has Egna pass, Färdiga pass and Alla övningar', async ({
  page,
}) => {
  await onProgrammeHome(page);
  await tab(page, 'Övningar').click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Egna pass' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Färdiga pass' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Alla övningar' }),
  ).toBeVisible();
  const order = await page.getByRole('heading', { level: 2 }).allInnerTexts();
  expect(order.indexOf('Egna pass')).toBeLessThan(
    order.indexOf('Färdiga pass'),
  );
  expect(order.indexOf('Färdiga pass')).toBeLessThan(
    order.indexOf('Alla övningar'),
  );
  await expect(page.getByText('Löpstyrka').first()).toBeVisible();
  // The library keeps its filters.
  await expect(page.getByRole('button', { name: 'Filtrera' })).toBeVisible();
  await page.getByRole('link', { name: 'Skapa eget pass' }).click();
  await expect(page).toHaveURL(/#\/nytt-pass$/);
});

test('Mitt program holds the programme actions and the confirmations', async ({
  page,
}) => {
  await onProgrammeHome(page);
  await expect(page.getByText('Ändra', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /^Vecka 1 av 4/ }).click();
  await expect(page).toHaveURL(/#\/mitt-program$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mitt program' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /^Min utrustning/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /^Byt inriktning/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: /^Gör om programmet/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Göra om programmet?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Behåll programmet' }).click();
  await page.getByRole('button', { name: /^Avsluta programmet/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Avsluta programmet?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Behåll programmet' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mitt program' }),
  ).toBeVisible();
  // Nothing was changed: the programme Home is still there.
  await tab(page, 'Idag').click();
  await expect(page.getByRole('heading', { name: /^Vecka 1/ })).toBeVisible();
});

test('per-day actions sit under the start button; a row Byt opens that exercise in the preview', async ({
  page,
}) => {
  await onProgrammeHome(page);
  const start = page.getByRole('link', { name: 'Starta passet', exact: true });
  const other = page.getByRole('link', { name: 'Träna något annat idag' });
  const swap = page.getByRole('link', { name: 'Byt övning', exact: true });
  const [s, o, w] = await Promise.all([
    start.boundingBox(),
    other.boundingBox(),
    swap.boundingBox(),
  ]);
  expect(s && o && w && o.y >= s.y + s.height && w.y >= o.y + o.height).toBe(
    true,
  );
  await other.click();
  await expect(page).toHaveURL(/#\/fokus/);
  await page.goBack();
  // Tap 1: the row's Byt; tap 2: Byt övning in the already opened editor.
  await page
    .getByRole('link', { name: /^Byt .+/ })
    .filter({ hasNotText: 'Byt övning' })
    .first()
    .click();
  await expect(page).toHaveURL(/#\/traning\/A\?program=1&byt=/);
  await expect(page.getByRole('button', { name: 'Byt övning' })).toBeVisible();
});

for (const { width, height, scale } of [
  { width: 320, height: 640, scale: 100 },
  { width: 320, height: 640, scale: 130 },
  { width: 390, height: 844, scale: 100 },
]) {
  test(`the nav fits without clipping and hides nothing at ${width}x${height} ${scale}%`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await onProgrammeHome(page);
    if (scale !== 100)
      await page.addStyleTag({ content: `html{font-size:${scale}%}` });
    for (const route of ['/', '/ovningar', '/historik', '/installningar']) {
      await page.goto(`/#${route}`);
      await expect(nav(page)).toBeVisible();
      const fit = await page.evaluate(() => {
        const bar = document.querySelector('nav[aria-label="Huvudmeny"]');
        const problems: string[] = [];
        if (!bar) return { problems: ['no nav'], overflow: 0 };
        const barBox = bar.getBoundingClientRect();
        for (const link of bar.querySelectorAll('a')) {
          const r = link.getBoundingClientRect();
          if (r.left < -0.5 || r.right > innerWidth + 0.5)
            problems.push(`${link.textContent} outside the screen`);
          if (r.height < 48 || r.width < 48)
            problems.push(`${link.textContent} target ${r.width}x${r.height}`);
          const label = link.querySelector('span');
          if (label) {
            const l = label.getBoundingClientRect();
            if (l.right > r.right + 0.5 || l.left < r.left - 0.5)
              problems.push(`${link.textContent} label spills out of its tab`);
            if (label.scrollWidth > label.clientWidth + 1)
              problems.push(`${link.textContent} label is clipped`);
            if (
              l.height >
              Number.parseFloat(getComputedStyle(label).fontSize) * 1.6
            )
              problems.push(`${link.textContent} label wraps mid-word`);
          }
        }
        if (barBox.bottom > innerHeight + 1) problems.push('nav off screen');
        return {
          problems,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      expect(fit.problems, route).toEqual([]);
      expect(fit.overflow, `${route}: horizontal overflow`).toBeLessThanOrEqual(
        0,
      );
    }
    // The last thing on Idag can be scrolled clear of the nav and the start bar.
    await page.goto('/#/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const clear = await page.evaluate(() => {
      const bar = document
        .querySelector('nav[aria-label="Huvudmeny"]')
        ?.getBoundingClientRect();
      const last = document.querySelector('main > div')?.lastElementChild;
      return {
        navTop: bar?.top ?? 0,
        lastBottom: last?.getBoundingClientRect().bottom ?? 0,
      };
    });
    expect(clear.lastBottom).toBeLessThanOrEqual(clear.navTop + 0.5);
    // The start button stays in reach above the nav.
    const start = await page
      .getByRole('link', { name: 'Starta passet', exact: true })
      .boundingBox();
    const bar = await nav(page).boundingBox();
    expect(start && bar && start.y + start.height <= bar.y + 0.5).toBe(true);
  });
}
