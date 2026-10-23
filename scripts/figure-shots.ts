/**
 * Figure captures against the Vite dev server (the dev figure page is DEV only).
 * Usage: npx tsx scripts/figure-shots.ts <outDir> <compare|review>
 *   compare: dev-page sections and a few cards of the pre-existing figures
 *            (rutat light and dark), for before/after pixel comparison.
 *   dev:     only the dev-page sections of E49-E53 (with the frame strip).
 *   final:   full-card 360x640 captures of E53 (right/left, animated/paused)
 *            in rutat light and hog-kontrast dark, plus a layout report.
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
if (
  !out ||
  (mode !== 'compare' &&
    mode !== 'review' &&
    mode !== 'dev' &&
    mode !== 'final')
)
  throw new Error('usage: figure-shots.ts <outDir> <compare|review|dev|final>');
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
    mode === 'compare'
      ? ['rutat']
      : mode === 'final'
        ? ['rutat', 'hog-kontrast']
        : ['rutat', 'hav', 'kvallssol', 'hog-kontrast'];
  for (const theme of themes) {
    for (const colorScheme of ['light', 'dark'] as const) {
      if (mode === 'final' && (theme === 'rutat') !== (colorScheme === 'light'))
        continue;
      const context = await browser.newContext({
        viewport: { width: 360, height: 900 },
        deviceScaleFactor: mode === 'dev' ? 2 : 1,
        colorScheme,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      await prepare(page, theme);
      const tag = `${theme}-${colorScheme}`;
      if (mode === 'final') {
        await context.close();
        const fin = await browser.newContext({
          viewport: { width: 360, height: 640 },
          deviceScaleFactor: 2,
          colorScheme,
          reducedMotion: 'no-preference',
        });
        const fp = await fin.newPage();
        await prepare(fp, theme);
        for (const side of ['right', 'left'] as const) {
          await fp.goto(`${base}/#/ovning/balance-clock?phase=0.25`);
          await fp.getByTestId('balance-clock-diagram').waitFor();
          const toggle = fp.getByRole('button', { name: /Byt sida/ });
          if (
            ((await toggle.textContent()) ?? '').startsWith('Höger') !==
            (side === 'right')
          )
            await toggle.click();
          const resume = fp.getByRole('button', { name: 'Spela rörelsen' });
          if (await resume.count()) await resume.click();
          for (const state of ['animated', 'paused'] as const) {
            if (state === 'paused')
              await fp.getByRole('button', { name: 'Pausa rörelsen' }).click();
            await fp.evaluate(
              `window.scrollTo(0, 0); document.querySelectorAll('*').forEach(function (e) { e.scrollTop = 0; })`,
            );
            await fp.screenshot({
              path: `${out}/fullcard-${tag}-${side}-${state}.png`,
            });
            // A string keeps tsx helpers (__name) out of the browser.
            const boxes = await fp.evaluate(`(() => {
              var rect = function (e) {
                var r = e && e.getBoundingClientRect();
                return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null;
              };
              var byText = function (re) {
                return Array.from(document.querySelectorAll('button,p')).find(function (e) { return re.test(e.textContent || ''); });
              };
              return {
                viewportHeight: innerHeight,
                sideButton: rect(byText(/Byt sida/)),
                diagram: rect(document.querySelector('[data-testid="balance-clock-diagram"]')),
                pause: rect(byText(/(Pausa|Spela) rörelsen/)),
                stage: rect(document.querySelector('.exercise-stage')),
                legend: rect(byText(/rör sig. Du står/)),
              };
            })()`);
            console.log(tag, side, state, JSON.stringify(boxes));
            await fp.evaluate(
              `document.querySelector('[data-testid="exercise-guide-scroll"]').scrollTop = 330`,
            );
            await fp.screenshot({
              path: `${out}/fullcard-${tag}-${side}-${state}-scrolled.png`,
            });
          }
        }
        await fin.close();
        continue;
      }
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

      if (mode === 'review') {
        // Cycle-aligned frames: the dev-only ?phase= hook freezes the figure.
        const phases = [0, 0.25, 0.5, 0.75, 1];
        for (const id of NEW_IDS) {
          for (const side of ['right', 'left'] as const) {
            const card: { label: string; image: Buffer }[] = [];
            const slot: { label: string; image: Buffer }[] = [];
            for (const phase of phases) {
              await page.goto(`${base}/#/ovning/${id}?phase=${phase}`);
              const region = page.getByRole('region', { name: 'Rörelsen' });
              await region.waitFor();
              // The chosen side persists between visits: set it explicitly.
              const toggle = page.getByRole('button', { name: /Byt sida/ });
              const current = (await toggle.textContent()) ?? '';
              if (current.startsWith('Höger') !== (side === 'right'))
                await toggle.click();
              const label = `${side} phase ${phase}`;
              card.push({
                label,
                image: await (id === 'balance-clock'
                  ? page.locator('.exercise-stage')
                  : region
                ).screenshot(),
              });
              const svg = page.locator('.exercise-stage svg');
              await svg.evaluate((e) => {
                (e as unknown as SVGElement).style.cssText =
                  'width:128px;height:auto;max-width:none';
              });
              slot.push({ label, image: await svg.screenshot() });
              await svg.evaluate((e) => {
                (e as unknown as SVGElement).style.cssText = '';
              });
            }
            if (id === 'balance-clock') {
              const diagram = page.getByTestId('balance-clock-diagram');
              await diagram.screenshot({
                path: `${out}/diagram-${tag}-${side}.png`,
              });
              const pause = page.getByRole('button', {
                name: /Pausa rörelsen/,
              });
              await pause.click();
              await diagram.screenshot({
                path: `${out}/diagram-${tag}-${side}-paused.png`,
              });
              await page
                .getByRole('button', { name: /Spela rörelsen/ })
                .click();
            }
            await sheet(
              page,
              card,
              `${out}/card-${tag}-${id}-${side}.png`,
              230,
              5,
            );
            await sheet(
              page,
              slot,
              `${out}/slot128-${tag}-${id}-${side}.png`,
              128,
              5,
            );
          }
        }
      }
      const ids: readonly string[] = mode === 'compare' ? CARD_SAMPLES : [];
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
