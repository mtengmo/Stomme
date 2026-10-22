import { expect, type Page, test } from '@playwright/test';
import { SCHEMES, themes } from '../../src/styles/themes/registry';
import { answerPain } from './flow';

const rgb = (hex: string) => {
  const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
  return `rgb(${n(1)}, ${n(3)}, ${n(5)})`;
};

const expand = (hex: string) =>
  hex.length === 4
    ? `#${[1, 2, 3].map((i) => (hex[i] as string).repeat(2)).join('')}`
    : hex;

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function seedDone(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('stomme');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = db.transaction(['sessions'], 'readwrite');
    tx.objectStore('sessions').put({
      id: 's-done',
      date: '2026-10-20',
      startedAt: '2026-10-20T09:00:00.000Z',
      finishedAt: '2026-10-20T09:40:00.000Z',
      programWeek: 1,
      plan: [],
      feedback: {},
      templateId: 'B',
      status: 'completed',
    });
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
}

test.describe('@themes every registered theme and scheme', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  for (const theme of themes) {
    for (const scheme of SCHEMES) {
      const tokens = theme.tokens[scheme];
      test(`@themes ${theme.id} ${scheme}: week, set and stop`, async ({
        page,
      }) => {
        await page.addInitScript(
          ([id, mode]) =>
            localStorage.setItem(
              'stomme.appearance',
              JSON.stringify({ theme: id, scheme: mode }),
            ),
          [theme.id, scheme],
        );
        await page.goto('/');
        const html = page.locator('html');
        await expect(html).toHaveAttribute('data-theme', theme.id);
        await expect(html).toHaveAttribute('data-scheme', scheme);
        // The minifier may shorten #ffffff to #fff, so compare expanded values.
        const read = await page.evaluate(() => ({
          meta:
            document
              .querySelector('meta[name="theme-color"]')
              ?.getAttribute('content') ?? '',
          paper: getComputedStyle(document.documentElement)
            .getPropertyValue('--paper')
            .trim(),
        }));
        expect(expand(read.meta)).toBe(tokens.paper);
        expect(expand(read.paper)).toBe(tokens.paper);

        // Week: primary button and the done chip compute to their tokens.
        await seedDone(page);
        await page.reload();
        const start = page.getByRole('link', { name: 'Starta pass' });
        await expect(start).toBeVisible();
        await expect(start).toHaveCSS('background-color', rgb(tokens.action));
        await expect(start).toHaveCSS('color', rgb(tokens['action-ink']));
        const chip = page.getByText('Klar', { exact: true }).first();
        await expect(chip).toBeVisible();
        await expect(chip).toHaveCSS('color', rgb(tokens.done));
        await noOverflow(page);

        // Stop screen: 6 px --care frame, icon and the word Stopp.
        await page.goto('/#/pass/A');
        await page.getByRole('button', { name: 'Starta pass' }).click();
        await answerPain(page, 1, ['Skarp smärta']);
        await expect(
          page.getByRole('heading', { name: 'Avbryt passet.' }),
        ).toBeVisible();
        await expect(page.getByText('Stopp', { exact: true })).toBeVisible();
        const frame = page
          .locator('h1')
          .locator('xpath=ancestor::div[contains(@class,"border-care")][1]');
        await expect(frame).toHaveCSS('border-top-width', '6px');
        await expect(frame).toHaveCSS('border-top-color', rgb(tokens.care));
        await noOverflow(page);

        // Set screen.
        await page.goto('/#/pass/A');
        await page.getByRole('button', { name: 'Starta pass' }).click();
        await answerPain(page, 0);
        const done = page.getByRole('button', { name: 'Klar set' });
        await expect(done).toBeVisible();
        await expect(done).toHaveCSS('background-color', rgb(tokens.action));
        await noOverflow(page);
      });
    }
  }
});

test('@themes the stop screen button fits at 360 px and at 200% zoom, with a return arrow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/pass/A');
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await answerPain(page, 1, ['Skarp smärta']);
  const button = page.getByRole('button', { name: 'Till träningen' });
  await expect(button).toBeVisible();
  // The no-entry glyph belongs to the heading only: the button has one icon, the back arrow.
  await expect(button.locator('svg')).toHaveCount(1);
  await expect(page.locator('svg path[d="M15 5l-7 7 7 7"]')).toHaveCount(1);
  // 200% zoom of a 360 px screen is a 180 CSS px viewport.
  for (const width of [360, 180]) {
    await page.setViewportSize({ width, height: 800 });
    const box = await button.boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    await noOverflow(page);
  }
});

test('@themes the week action bar sits flush on the nav on short and tall screens', async ({
  page,
}) => {
  await page.goto('/');
  await seedDone(page);
  for (const height of [800, 1300]) {
    await page.setViewportSize({ width: 360, height });
    await page.reload();
    await expect(page.getByRole('link', { name: 'Starta pass' })).toBeVisible();
    const gap = await page.evaluate(() => {
      const bar = [...document.querySelectorAll('div.sticky')].find((d) =>
        d.textContent?.includes('Starta pass'),
      );
      const nav = document.querySelector('nav');
      return (
        (nav?.getBoundingClientRect().top ?? -1) -
        (bar?.getBoundingClientRect().bottom ?? -2)
      );
    });
    expect(gap, `gap at ${height}px`).toBe(0);
  }
});
