/**
 * Review captures for every theme and scheme (viewport shots only, nothing hidden
 * by fixed bars): seeded week screens, the Utseende picker, onboarding with the
 * colour chooser collapsed and expanded, and keyboard-focus close-ups.
 * Usage: npx tsx scripts/theme-review.ts <outDir>   (needs `npm run build`)
 *
 * Files (outDir):
 *   <theme>-<scheme>-week.png        360x1300 viewport, lead card above a Kommande card
 *   <theme>-<scheme>-week-klar.png   360x1300 viewport, Pass A done (Klar chip with pencil tick)
 *   picker-set-<theme>-<scheme>.png  360x800, Settings Utseende scrolled into view
 *   picker-onb-<theme>-<scheme>-collapsed.png / -expanded.png  360 wide, onboarding (full page, no fixed bars there)
 *   focus-<theme>-<scheme>-<button|radio|nav|link>.png  keyboard Tab focus, 2x, padded close-up
 * Week uses 360x1300 so the sticky action bar and the nav do not cover the cards.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import {
  type Browser,
  chromium,
  type Locator,
  type Page,
} from '@playwright/test';
import { SCHEMES, themes } from '../src/styles/themes/registry';

const PORT = 4182;
const url = `http://localhost:${PORT}/`;
const out = process.argv[2];
if (!out) throw new Error('usage: theme-review.ts <outDir>');
mkdirSync(out, { recursive: true });

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview did not start');
}

/** Runs in the page: program start (so the week view shows) and optionally Pass A done. */
async function seed(page: Page, passADone: boolean): Promise<void> {
  await page.evaluate(async (passADone) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('stomme');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = db.transaction(['meta', 'sessions'], 'readwrite');
    tx.objectStore('meta').put({
      key: 'program',
      value: { startDate: '2026-10-19' },
    });
    if (passADone)
      tx.objectStore('sessions').put({
        id: 's-done',
        date: '2026-10-20',
        startedAt: '2026-10-20T09:00:00.000Z',
        finishedAt: '2026-10-20T09:40:00.000Z',
        programWeek: 1,
        plan: [],
        feedback: {},
        templateId: 'A',
        status: 'completed',
      });
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, passADone);
}

async function context(
  browser: Browser,
  theme: string,
  scheme: 'light' | 'dark',
  height: number,
  scale = 1,
) {
  const ctx = await browser.newContext({
    viewport: { width: 360, height },
    colorScheme: scheme,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    deviceScaleFactor: scale,
  });
  await ctx.addInitScript(
    `localStorage.setItem('stomme.appearance', ${JSON.stringify(JSON.stringify({ theme, scheme: 'system' }))})`,
  );
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'));
  return { ctx, page };
}

const settle = (page: Page) => page.waitForTimeout(700);

/** Moves focus to the locator with the Tab key only (keyboard modality). */
async function tabTo(page: Page, target: Locator): Promise<void> {
  const handle = await target.elementHandle();
  if (!handle) throw new Error('tab target not found');
  await page.mouse.move(0, 0);
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((el) => document.activeElement === el, handle))
      return;
  }
  throw new Error('could not Tab to the target');
}

async function closeUp(page: Page, target: Locator, path: string) {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  const pad = 22;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  await page.screenshot({
    path,
    clip: {
      x,
      y,
      width: Math.min(360 - x, box.width + 2 * pad),
      height: box.height + 2 * pad,
    },
    animations: 'disabled',
  });
}

const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
});
try {
  await waitForServer();
  const browser = await chromium.launch();
  for (const theme of themes) {
    for (const scheme of SCHEMES) {
      const tag = `${theme.id}-${scheme}`;

      // Week, viewport only, two seeded states.
      for (const [suffix, done] of [
        ['week', false],
        ['week-klar', true],
      ] as const) {
        const { ctx, page } = await context(browser, theme.id, scheme, 1300);
        await page.goto(url);
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        await seed(page, done);
        await page.reload();
        await page.getByRole('link', { name: 'Starta pass' }).waitFor();
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle(page);
        await page.screenshot({
          path: `${out}/${tag}-${suffix}.png`,
          animations: 'disabled',
        });
        if (suffix === 'week') {
          // Focus close-ups: primary button, nav item, link (keyboard only).
          for (const [name, target] of [
            ['link', page.getByRole('link', { name: /^Övningar/ })],
            ['button', page.getByRole('link', { name: 'Starta pass' })],
            ['nav', page.getByRole('link', { name: 'Historik' })],
          ] as const) {
            await tabTo(page, target);
            await closeUp(page, target, `${out}/focus-${tag}-${name}.png`);
          }
        }
        await ctx.close();
      }

      // Picker in Settings.
      {
        const { ctx, page } = await context(browser, theme.id, scheme, 800, 1);
        await page.goto(url);
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        await page.goto(`${url}#/installningar`);
        const legend = page.getByText('Färgtema', { exact: true });
        await legend.waitFor();
        await page.evaluate(() => {
          const el = [...document.querySelectorAll('legend')].find(
            (l) => l.textContent === 'Färgtema',
          );
          const top = (el?.getBoundingClientRect().top ?? 0) + window.scrollY;
          window.scrollTo(0, top - 16);
        });
        await settle(page);
        await page.screenshot({
          path: `${out}/picker-set-${tag}.png`,
          animations: 'disabled',
        });
        const rows = page
          .getByRole('group', { name: 'Färgtema' })
          .getByRole('radio')
          .locator('xpath=following-sibling::span[1]');
        const heights: number[] = [];
        for (let i = 0; i < (await rows.count()); i++)
          heights.push(
            Math.round((await rows.nth(i).boundingBox())?.height ?? 0),
          );
        console.log(`${tag} picker row heights: ${heights.join(', ')}`);
        // Focus close-up on the selected radio row, then back out.
        const radio = page
          .getByRole('group', { name: 'Färgtema' })
          .getByRole('radio', { checked: true });
        await page.evaluate(() => window.scrollTo(0, 0));
        await tabTo(page, radio);
        await closeUp(
          page,
          radio.locator('xpath=following-sibling::span[1]'),
          `${out}/focus-${tag}-radio.png`,
        );
        await ctx.close();
      }

      // Onboarding, chooser collapsed and expanded (full page: no fixed bars here).
      {
        const { ctx, page } = await context(browser, theme.id, scheme, 800);
        await page.goto(url);
        await page.getByRole('button', { name: /Jag förstår/ }).waitFor();
        await settle(page);
        await page.screenshot({
          path: `${out}/picker-onb-${tag}-collapsed.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByText('Välj färger (kan ändras senare)').click();
        await settle(page);
        await page.screenshot({
          path: `${out}/picker-onb-${tag}-expanded.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await ctx.close();
      }
    }
  }
  await browser.close();
} finally {
  if (process.platform === 'win32' && server.pid) {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F']);
  } else {
    server.kill();
  }
}
