/**
 * Captures onboarding and week view screenshots into .impeccable/review/.
 * Run: npm run shots   (builds, serves `vite preview`, drives Chromium).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

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

/** Runs in the page: replaces sessions/setLogs in the app's IndexedDB. */
async function seed(scenario: 'done' | 'partial'): Promise<void> {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('stomme');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tx = db.transaction(['sessions', 'setLogs'], 'readwrite');
  tx.objectStore('sessions').clear();
  tx.objectStore('setLogs').clear();
  const base = {
    date,
    startedAt: now.toISOString(),
    programWeek: 1,
    plan: [],
    feedback: {},
  };
  if (scenario === 'done') {
    tx.objectStore('sessions').put({
      ...base,
      id: 's-done',
      templateId: 'A',
      status: 'completed',
      finishedAt: now.toISOString(),
    });
  } else {
    tx.objectStore('sessions').put({
      ...base,
      id: 's-open',
      templateId: 'A',
      status: 'in_progress',
    });
    const ex = [
      'goblet-chair-squat',
      'goblet-chair-squat',
      'step-up',
      'step-up',
      'single-leg-rdl',
    ];
    for (const [i, exerciseId] of ex.entries()) {
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
  }
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
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
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        colorScheme: scheme,
        reducedMotion: 'reduce',
      });
      await context.addInitScript('window.__name = (f) => f;');
      const page = await context.newPage();
      await page.goto(url);
      await page.getByRole('button', { name: /Jag förstår/ }).waitFor();
      await page.screenshot({
        path: `${OUT}/${size.name}-${scheme}-onboarding.png`,
      });
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.getByRole('link', { name: 'Starta pass' }).waitFor();
      await page.screenshot({
        path: `${OUT}/${size.name}-${scheme}-week-empty.png`,
      });
      for (const scenario of ['done', 'partial'] as const) {
        await page.evaluate(seed, scenario);
        await page.reload();
        await page.getByRole('link', { name: 'Starta pass' }).waitFor();
        await page.screenshot({
          path: `${OUT}/${size.name}-${scheme}-week-${scenario}.png`,
        });
      }
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
