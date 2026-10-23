/**
 * Deterministic key-screen captures at 360x800, light and dark, for pixel
 * comparison across token refactors.
 * Usage: npx tsx scripts/theme-shots.ts <outDir> [--theme=<id>]   (needs `npm run build`)
 * Output goes to .impeccable/review/<outDir> style paths chosen by the caller.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { themes } from '../src/styles/themes/registry';
import { answerPain } from '../tests/e2e/flow';

const PORT = 4180;
const url = `http://localhost:${PORT}/`;
const out = process.argv[2];
if (!out) throw new Error('usage: theme-shots.ts <outDir> [--all-themes]');
/** --all-themes: every registered theme, 6 screens, files <theme>-<scheme>-<screen>.png. */
const allThemes = process.argv.includes('--all-themes');
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

async function seedOpenSession(page: Page, withDone: boolean): Promise<void> {
  await page.evaluate(async (withDone) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('stomme');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const tx = db.transaction(['sessions', 'setLogs'], 'readwrite');
    if (withDone)
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
    tx.objectStore('sessions').put({
      id: 's-open',
      date,
      startedAt: now.toISOString(),
      programWeek: 1,
      plan: [],
      feedback: {},
      templateId: 'A',
      status: 'in_progress',
    });
    for (const [i, exerciseId] of ['goblet-chair-squat', 'step-up'].entries()) {
      tx.objectStore('setLogs').put({
        id: `l${i}`,
        sessionId: 's-open',
        exerciseId,
        setNumber: i + 1,
        side: 'both',
        amount: 8,
        loadIndex: 0,
        weightKg: 5,
        loggedAt: now.toISOString(),
      });
    }
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, withDone);
}

const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
});
try {
  await waitForServer();
  const browser = await chromium.launch();
  for (const theme of allThemes ? themes.map((t) => t.id) : [undefined]) {
    for (const scheme of ['light', 'dark'] as const) {
      const fresh = async () => {
        const context = await browser.newContext({
          viewport: { width: 360, height: 800 },
          colorScheme: scheme,
          reducedMotion: 'reduce',
          serviceWorkers: 'block',
        });
        if (theme)
          await context.addInitScript(
            `localStorage.setItem('stomme.appearance', ${JSON.stringify(JSON.stringify({ theme, scheme: 'system' }))})`,
          );
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'));
        await page.goto(url);
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        return { context, page };
      };
      const shot = async (page: Page, name: string) => {
        await page.waitForTimeout(name === 'rest' ? 2500 : 700);
        await page.screenshot({
          path: `${out}/${theme ? `${theme}-` : ''}${scheme}-${name}.png`,
          animations: 'disabled',
        });
      };

      let { context, page } = await fresh();
      if (!allThemes) {
        await page.goto(`${url}#/installningar`);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        await shot(page, 'settings');
      }
      await page.goto(`${url}#/ovning/single-leg-calf-raise`);
      await page.getByText('Visa muskelkarta', { exact: true }).click();
      await page.getByRole('img', { name: 'Kropp bakifrån' }).waitFor();
      await shot(page, 'muscle-map');
      // Week captures for --all-themes come from theme-review.ts (seeded, viewport only).
      if (!allThemes) {
        await seedOpenSession(page, false);
        await page.goto(url);
        await page.reload();
        await page.getByRole('link', { name: /Fortsätt passet/ }).waitFor();
        await shot(page, 'week');
      }
      await context.close();

      ({ context, page } = await fresh());
      await page.goto(`${url}#/pass/A`);
      await page.getByRole('heading', { name: 'Pass A' }).waitFor();
      if (!allThemes) await shot(page, 'preview');
      await page.getByRole('button', { name: 'Starta pass' }).click();
      await page.getByRole('heading', { name: /Hur känns/ }).waitFor();
      await shot(page, 'pain');
      await answerPain(page, 0);
      await page.getByRole('button', { name: 'Klar set' }).waitFor();
      await shot(page, 'set');
      await page.getByRole('button', { name: 'Klar set' }).click();
      await page.getByRole('button', { name: 'Hoppa över vila' }).waitFor();
      await shot(page, 'rest');
      await context.close();

      ({ context, page } = await fresh());
      await page.goto(`${url}#/pass/A`);
      await page.getByRole('button', { name: 'Starta pass' }).click();
      await page.getByRole('heading', { name: /Hur känns/ }).waitFor();
      await answerPain(page, 1, ['Skarp smärta']);
      await page.getByRole('heading', { name: 'Avbryt passet.' }).waitFor();
      await shot(page, 'stop');
      await context.close();
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
