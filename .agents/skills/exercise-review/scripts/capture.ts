/**
 * Contact sheets for one exercise review (exercise-review skill).
 *   npx tsx .agents/skills/exercise-review/scripts/capture.ts <id|E-ref> [...]
 * Starts its own Vite dev server on port 5304 and stops it at the end. Writes
 * .impeccable/review/<id>/<390-dark|1280-light>-<view>.png (gitignored): per
 * existing view, weight variant (one per tool) and side H/V a row of ?phase=
 * 0 .25 .5 .75 1 .75 .5 .25 0 (skipped for motion 'hold', whose live loop is
 * one pose), a row of reduced-motion stills and a row of live-loop frames over
 * one cycle (fake clock, so the frames are exact).
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { type Browser, chromium, type Page } from '@playwright/test';
import { exerciseMetadata } from '../../../../src/content/exerciseMetadata';
import { exerciseReferences } from '../../../../src/content/exerciseReferences';
import { exercises } from '../../../../src/content/exercises';
import type { ExerciseId } from '../../../../src/domain/types';
import { demonstrationTiming } from '../../../../src/figures/Figure';
import { figures } from '../../../../src/figures/poses';

const PORT = 5304;
const base = `http://localhost:${PORT}`;
const PHASES = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0];
const LIVE_FRAMES = 12;
const VIEW_BUTTON = {
  side: 'Från sidan',
  front: 'Framifrån',
  oblique: 'Sned vinkel',
} as const;
type Combo = { variant: string; load?: number; side?: 'H' | 'V' };
type Shot = { label: string; png: string };

const byRef = new Map(
  Object.entries(exerciseReferences).map(([id, ref]) => [ref, id]),
);
const ids = process.argv
  .slice(2)
  .map((a) => (byRef.get(a.toUpperCase()) ?? a) as ExerciseId);
if (!ids.length || ids.some((id) => !exercises[id])) {
  console.log(
    `Usage: npx tsx .agents/skills/exercise-review/scripts/capture.ts <id|E-ref> ...${ids.length ? `\nnot in the catalogue: ${ids.filter((id) => !exercises[id]).join(', ')}` : ''}`,
  );
  process.exit(1);
}

/** Live-loop window covering one cycle (Figure.tsx timing; ballistic <= 1100 ms, sequence <= 12000 ms). */
function cycleMs(id: ExerciseId): number {
  const motion = figures[id].motion;
  if (motion === 'ballistic') return 2000;
  if (motion === 'sequence') return 12000;
  const t = demonstrationTiming(id);
  return t.startHoldMs + t.tweenMs + t.endHoldMs + t.returnMs;
}

/** One combo per weight tool (as inspect.ts) and side. */
function combos(id: ExerciseId): Combo[] {
  const seen = new Set<string>();
  const out: Combo[] = [];
  const selectable = exercises[id].loadLadder.length > 1;
  for (const v of exerciseMetadata[id].variants) {
    const tool =
      v.equipment.find((q) =>
        ['dumbbell', 'kettlebell', 'band'].includes(q.type),
      )?.type ?? 'none';
    if (seen.has(tool)) continue;
    seen.add(tool);
    for (const side of exercises[id].perSide
      ? (['H', 'V'] as const)
      : [undefined])
      out.push({
        variant: tool,
        load: selectable ? v.defaultLoadIndex : undefined,
        side,
      });
  }
  return out;
}

async function open(
  page: Page,
  id: ExerciseId,
  view: string,
  c: Combo,
  phase?: number,
) {
  await page.goto(
    `${base}/#/ovning/${id}${phase === undefined ? '' : `?phase=${phase}`}`,
  );
  const stage = page.locator('.exercise-stage');
  await stage.waitFor();
  const viewButton = page.getByRole('button', { name: view, exact: true });
  if (
    (await viewButton.count()) &&
    (await viewButton.getAttribute('aria-pressed')) !== 'true'
  )
    await viewButton.click();
  if (c.load !== undefined) {
    const select = page
      .locator('label', { hasText: /^Vikt/ })
      .locator('select');
    if ((await select.inputValue()) !== String(c.load))
      await select.selectOption(String(c.load));
  }
  if (c.side) {
    const marker = stage.locator('svg text', { hasText: /^[HV]$/ }).first();
    if ((await marker.textContent()) !== c.side)
      await page.getByRole('button', { name: /Byt sida/ }).click();
  }
  return stage;
}

async function sheet(
  browser: Browser,
  path: string,
  title: string,
  rows: [string, Shot[]][],
) {
  const page = await browser.newPage({
    viewport: { width: 1900, height: 900 },
  });
  await page.setContent(
    `<body style="margin:12px;background:#ddd;font:14px system-ui"><h1 style="font-size:18px">${title}</h1>${rows
      .map(
        ([head, shots]) =>
          `<h2 style="font-size:15px;margin:10px 0 4px">${head}</h2><div style="display:flex;flex-wrap:wrap;gap:6px">${shots
            .map(
              (s) =>
                `<figure style="margin:0"><img style="height:200px;display:block" src="data:image/png;base64,${s.png}"><figcaption>${s.label}</figcaption></figure>`,
            )
            .join('')}</div>`,
      )
      .join('')}</body>`,
  );
  await page.screenshot({ path, fullPage: true });
  await page.close();
}

async function capture(
  browser: Browser,
  id: ExerciseId,
  width: number,
  scheme: 'dark' | 'light',
) {
  const make = async (
    reducedMotion: 'reduce' | 'no-preference',
    clock = false,
  ) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: scheme,
      reducedMotion,
    });
    const page = await context.newPage();
    if (clock) await page.clock.install({ time: 0 });
    await page.goto(base);
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    return page;
  };
  const live = await make('no-preference', true);
  const still = await make('reduce');
  await live.goto(`${base}/#/ovning/${id}`);
  await live.locator('.exercise-stage').waitFor();
  const buttons = await live
    .getByRole('group')
    .getByRole('button')
    .allTextContents();
  const views = Object.entries(VIEW_BUTTON).filter(([, name]) =>
    buttons.includes(name),
  );
  const hold = figures[id].motion === 'hold';
  const ms = cycleMs(id);
  const out = `.impeccable/review/${id}`;
  mkdirSync(out, { recursive: true });
  for (const [view, button] of views.length
    ? views
    : [['default', '-'] as const]) {
    const rows: [string, Shot[]][] = [];
    for (const c of combos(id)) {
      const tag = `${c.variant}${c.side ? ` ${c.side}` : ''}`;
      if (!hold) {
        const shots: Shot[] = [];
        for (const phase of PHASES) {
          const stage = await open(live, id, button, c, phase);
          shots.push({
            label: `fas ${phase}`,
            png: (await stage.screenshot()).toString('base64'),
          });
        }
        rows.push([`${tag}: ?phase= ut och tillbaka`, shots]);
      }
      const stage = await open(still, id, button, c);
      rows.push([
        `${tag}: reduced-motion`,
        [
          {
            label: 'stills',
            png: (await stage.screenshot()).toString('base64'),
          },
        ],
      ]);
      // Freeze the fake clock, then step it: the frames span one whole cycle
      // (seam included) from wherever the loop is. A hold needs only three.
      const loop = await open(live, id, button, c);
      await live.clock.pauseAt((await live.evaluate(() => Date.now())) + 50);
      const shots: Shot[] = [];
      const n = hold ? 2 : LIVE_FRAMES;
      for (let k = 0; k <= n; k++) {
        if (k) await live.clock.runFor(ms / n);
        shots.push({
          label: `+${Math.round((k * ms) / n)} ms`,
          png: (await loop.screenshot()).toString('base64'),
        });
      }
      await live.clock.resume();
      rows.push([`${tag}: live loop, one cycle ${ms} ms`, shots]);
    }
    const path = `${out}/${width}-${scheme}-${view}.png`;
    await sheet(
      browser,
      path,
      `${exerciseReferences[id]} ${id} · ${view} · ${width} px ${scheme}`,
      rows,
    );
    console.log(path);
  }
  await live.context().close();
  await still.context().close();
}

let server: ChildProcess | undefined;
let browser: Browser | undefined;
const stop = () => {
  server?.kill();
  server = undefined;
};
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});
try {
  server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  browser = await chromium.launch();
  for (const id of ids) {
    await capture(browser, id, 390, 'dark');
    await capture(browser, id, 1280, 'light');
  }
} finally {
  await browser?.close();
  stop();
}
