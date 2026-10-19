/**
 * Captures the M4 pain screens into .impeccable/review/ (gitignored).
 * Run: npm run build && npx tsx scripts/screenshots-pain.ts
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { type Browser, chromium, type Page } from '@playwright/test';
import { answerPain, openPreview } from '../tests/e2e/flow';

const PORT = 4173;
const OUT = '.impeccable/review';
const sizes = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-412', width: 412, height: 915 },
];
const schemes = ['light', 'dark'] as const;

async function waitForServer(url: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start at ${url}`);
}

/** Runs in the page: writes history into the app's IndexedDB. */
async function seed(kind: 'dayAfter' | 'history'): Promise<void> {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('stomme');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = (ago: number) => {
    const d = new Date();
    d.setDate(d.getDate() - ago);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const tx = db.transaction(
    ['sessions', 'setLogs', 'painLogs', 'meta'],
    'readwrite',
  );
  const ago = kind === 'dayAfter' ? 1 : 3;
  const date = day(ago);
  const plan = [
    ['goblet-chair-squat', 1, 10],
    ['step-up', 1, 8],
    ['single-leg-rdl', 1, 8],
    ['dead-bug', 0, 8],
    ['side-plank', 0, 20],
  ].map(([exerciseId, loadIndex, target]) => ({
    exerciseId,
    sets: 2,
    target,
    loadIndex,
    weightKg: 10,
    restSec: 60,
    reason: 'start_load',
  }));
  tx.objectStore('meta').put({ key: 'program', value: { startDate: day(8) } });
  tx.objectStore('sessions').put({
    id: 's-prev',
    templateId: 'A',
    date,
    startedAt: `${date}T07:00:00.000Z`,
    finishedAt: `${date}T07:30:00.000Z`,
    status: 'completed',
    programWeek: 2,
    plan,
    feedback: { 'goblet-chair-squat': { effort: 'ok' } },
  });
  let n = 0;
  for (const [exerciseId, loadIndex, target] of plan.map((p) => [
    p.exerciseId,
    p.loadIndex,
    p.target,
  ])) {
    for (const setNumber of [1, 2]) {
      for (const side of exerciseId === 'goblet-chair-squat'
        ? ['both']
        : ['right', 'left']) {
        n += 1;
        tx.objectStore('setLogs').put({
          id: `l${n}`,
          sessionId: 's-prev',
          exerciseId,
          setNumber,
          side,
          amount: target,
          loadIndex,
          weightKg: 10,
          loggedAt: `${date}T07:${pad(n % 60)}:00.000Z`,
        });
      }
    }
  }
  tx.objectStore('painLogs').put({
    id: 'p-after',
    sessionId: 's-prev',
    date,
    timing: 'after',
    score: 2,
    location: 'right_knee',
    redFlags: { sharp: false, swelling: false, locking: false },
    createdAt: `${date}T07:31:00.000Z`,
  });
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

async function fresh(
  browser: Browser,
  url: string,
  size: (typeof sizes)[number],
  scheme: (typeof schemes)[number],
): Promise<Page> {
  const context = await browser.newContext({
    baseURL: url,
    viewport: { width: size.width, height: size.height },
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  await context.addInitScript('window.__name = (f) => f;');
  return context.newPage();
}

mkdirSync(OUT, { recursive: true });
const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
});
try {
  const url = `http://localhost:${PORT}/`;
  await waitForServer(url);
  const browser = await chromium.launch();
  for (const size of sizes) {
    for (const scheme of schemes) {
      const shot = (page: Page, name: string, fullPage = false) =>
        page.screenshot({
          path: `${OUT}/${size.name}-${scheme}-${name}.png`,
          fullPage,
        });

      // Picker, then the stop screen and the banners that follow it.
      let page = await fresh(browser, url, size, scheme);
      await openPreview(page);
      await page.getByRole('button', { name: 'Starta pass' }).click();
      await page.getByRole('heading', { name: /Hur känns/ }).waitFor();
      await shot(page, 'pain-picker-empty');
      await page
        .getByRole('radio', { name: '4', exact: true })
        .check({ force: true });
      await shot(page, 'pain-picker');
      await page
        .getByRole('radio', { name: '1', exact: true })
        .check({ force: true });
      await page.getByRole('switch', { name: 'Skarp smärta' }).click();
      await shot(page, 'pain-picker-flag');
      await page.getByRole('button', { name: 'Spara' }).click();
      await page.getByRole('heading', { name: 'Avbryt passet.' }).waitFor();
      await shot(page, 'pain-stop');
      await page.getByRole('button', { name: 'Till veckan' }).click();
      await page.getByText(/Senast stoppade du/).waitFor();
      await shot(page, 'banner-week');
      await page.getByRole('link', { name: 'Starta pass' }).click();
      await page.getByText(/Senast stoppade du/).waitFor();
      await shot(page, 'banner-preview');
      await page.context().close();

      // Warn screen with the wall sit offer.
      page = await fresh(browser, url, size, scheme);
      await openPreview(page);
      await page.getByRole('button', { name: 'Starta pass' }).click();
      await answerPain(page, 6);
      await page.getByRole('heading', { name: 'Smärtan är över 3.' }).waitFor();
      await shot(page, 'pain-warn');
      await page.getByRole('switch', { name: /väggsittning/i }).click();
      await shot(page, 'pain-warn-wallsit');
      await page.context().close();

      // Day-after card, then the worse-than-after warning.
      page = await fresh(browser, url, size, scheme);
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.getByRole('link', { name: 'Starta pass' }).waitFor();
      await page.evaluate(seed, 'dayAfter' as const);
      await page.reload();
      await page
        .getByRole('heading', { name: 'Hur känns knäet idag?' })
        .waitFor();
      await shot(page, 'dayafter-card');
      await page.getByRole('link', { name: 'Svara' }).click();
      await answerPain(page, 3);
      await page
        .getByRole('heading', { name: 'Knäet är värre än efter passet.' })
        .waitFor();
      await shot(page, 'dayafter-warn');
      await page.getByRole('button', { name: 'Till veckan' }).click();
      await page.getByText(/Knäet var värre dagen efter/).waitFor();
      await shot(page, 'dayafter-warn-card');
      await page.context().close();

      // Preview with Förra gången / Idag.
      page = await fresh(browser, url, size, scheme);
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.getByRole('link', { name: 'Starta pass' }).waitFor();
      await page.evaluate(seed, 'history' as const);
      await page.goto('/#/pass/A');
      await page.reload();
      await page.getByText('Förra gången').first().waitFor();
      await shot(page, 'preview-suggestions');
      await shot(page, 'preview-suggestions-full', true);
      await page.context().close();
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
