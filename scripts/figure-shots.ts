/**
 * Figure captures against the Vite dev server (the dev figure page is DEV only).
 * Usage: npx tsx scripts/figure-shots.ts <outDir> <compare|review>
 *   compare: dev-page sections and a few cards of the pre-existing figures
 *            (rutat light and dark), for before/after pixel comparison.
 *   dev:     only the dev-page sections of E49-E53 (with the frame strip).
 *   review:  E49-E53 on the dev page and the exercise card: start/mid/end at
 *            card size and 128 px, a mid-cycle frame sequence, three themes,
 *            light and dark.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { exerciseList } from '../src/content/exercises';

const out = process.argv[2];
const mode = process.argv[3];
if (!out || (mode !== 'compare' && mode !== 'review' && mode !== 'dev'))
  throw new Error('usage: figure-shots.ts <outDir> <compare|review|dev>');
mkdirSync(out, { recursive: true });

const port = 5311;
const base = `http://localhost:${port}`;
const NEW_IDS = [
  'quad-set',
  'seated-knee-flexion',
  'band-knee-extension',
  'band-hip-extension',
  'balance-clock',
] as const;
const CARD_SAMPLES = [
  'seated-knee-extension',
  'band-leg-press',
  'hamstring-curl',
  'balance-pendulum',
  'dumbbell-rdl',
];

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', `${port}`, '--strictPort'],
  { stdio: 'ignore' },
);
const browser = await chromium.launch();

async function prepare(page: Page, theme: string) {
  await page.goto(base);
  await page.evaluate(
    (appearance) => localStorage.setItem('stomme.appearance', appearance),
    JSON.stringify({ theme, scheme: 'system' }),
  );
  await page.reload();
  const accept = page.getByRole('button', { name: /Jag förstår/ });
  await accept.waitFor({ timeout: 15000 });
  await accept.click();
}

async function sheet(
  page: Page,
  frames: { label: string; image: Buffer }[],
  file: string,
  width: number,
  columns: number,
) {
  const html = `<html><body style="margin:12px;background:#ddd;font:14px system-ui;display:grid;grid-template-columns:repeat(${columns},auto);gap:10px;justify-content:start">${frames
    .map(
      ({ label, image }) =>
        `<figure style="margin:0"><figcaption>${label}</figcaption><img style="display:block;width:${width}px" src="data:image/png;base64,${image.toString('base64')}"></figure>`,
    )
    .join('')}</body></html>`;
  const sheetPage = await page.context().newPage();
  await sheetPage.setViewportSize({
    width: Math.min(2000, columns * (width + 16) + 40),
    height: 600,
  });
  await sheetPage.setContent(html);
  await sheetPage.screenshot({ path: file, fullPage: true });
  await sheetPage.close();
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('dev server did not start');

  const themes =
    mode === 'compare' ? ['rutat'] : ['rutat', 'hav', 'hog-kontrast'];
  for (const theme of themes) {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        viewport: { width: 360, height: 900 },
        deviceScaleFactor: mode === 'dev' ? 2 : 1,
        colorScheme,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      await prepare(page, theme);
      const tag = `${theme}-${colorScheme}`;
      await page.goto(`${base}/#/dev/figurer`);
      await page.getByRole('heading', { name: 'Figurer' }).waitFor();
      const wanted =
        mode === 'compare'
          ? exerciseList.filter(
              (ex) => !(NEW_IDS as readonly string[]).includes(ex.id),
            )
          : exerciseList.filter((ex) =>
              (NEW_IDS as readonly string[]).includes(ex.id),
            );
      for (const ex of wanted) {
        await page
          .locator('section')
          .filter({
            has: page.getByRole('heading', { name: ex.name, exact: true }),
          })
          .first()
          .screenshot({ path: `${out}/dev-${tag}-${ex.id}.png` });
      }

      const ids: readonly string[] =
        mode === 'dev' ? [] : mode === 'compare' ? CARD_SAMPLES : NEW_IDS;
      for (const id of ids) {
        await page.clock.install({ time: 0 });
        await page.clock.pauseAt(100);
        await page.goto(`${base}/#/ovning/${id}`);
        const stage = page.locator('.exercise-stage');
        await stage.waitFor();
        const full: { label: string; image: Buffer }[] = [];
        const small: { label: string; image: Buffer }[] = [];
        const steps = mode === 'compare' ? 6 : 16;
        for (let i = 0; i < steps; i++) {
          if (i > 0) await page.clock.runFor(500);
          const label = `${i * 500} ms`;
          full.push({ label, image: await stage.screenshot() });
          if (mode === 'review') {
            await page.evaluate(() => {
              const svg = document.querySelector<SVGElement>(
                '.exercise-stage svg',
              );
              if (svg) svg.style.width = '128px';
            });
            small.push({
              label,
              image: await page.locator('.exercise-stage svg').screenshot(),
            });
            await page.evaluate(() => {
              const svg = document.querySelector<SVGElement>(
                '.exercise-stage svg',
              );
              if (svg) svg.style.width = '';
            });
          }
        }
        if (mode === 'compare') {
          for (const [i, frame] of full.entries())
            await sheet(
              page,
              [frame],
              `${out}/card-${tag}-${id}-${i}.png`,
              300,
              1,
            );
        } else {
          await sheet(page, full, `${out}/card-${tag}-${id}.png`, 230, 4);
          await sheet(page, small, `${out}/slot128-${tag}-${id}.png`, 128, 8);
          await page.screenshot({
            path: `${out}/page-${tag}-${id}.png`,
            fullPage: true,
          });
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
