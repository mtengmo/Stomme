/** M6 final-batch captures: stale session, after red flag, error boundary. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 5297;
const OUT = '.impeccable/review';
async function up(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no server');
}
mkdirSync(OUT, { recursive: true });
const srv = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'],
  {
    stdio: 'ignore',
  },
);
try {
  const base = `http://localhost:${PORT}`;
  await up(base);
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark'] as const) {
    for (const s of [
      { name: '360', width: 360, height: 800 },
      { name: '412', width: 412, height: 915 },
    ]) {
      const tag = `m6b-${s.name}-${scheme}`;
      const ctx = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        colorScheme: scheme,
        reducedMotion: 'reduce',
      });
      // tsx preserves function names with __name inside serialized callbacks.
      await ctx.addInitScript(
        "window.__name = (fn) => fn; localStorage.setItem('stomme.repCount.manual', '1');",
      );
      const page = await ctx.newPage();
      await page.goto(base);
      await page.getByRole('button', { name: /Jag förstår/ }).click();

      await page.goto(`${base}/#/dev/demo`);
      await page
        .getByRole('button', { name: 'Fyll med syntetisk testdata' })
        .click();
      await page.getByText(/Fyllde med/).waitFor();
      await page.goto(base);

      // after red flag: stop screen, then the banner on the week view
      await page.getByRole('link', { name: 'Starta pass' }).click();
      await page.getByRole('button', { name: 'Starta pass' }).click();
      await page.getByRole('radio', { name: /^1(,|$)/ }).check({ force: true });
      await page.getByRole('button', { name: 'Spara' }).click();
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: 'Hoppa över övningen' }).click();
      }
      await page.getByRole('heading', { name: /efter passet/ }).waitFor();
      await page.getByRole('radio', { name: /^2(,|$)/ }).check({ force: true });
      await page.getByRole('switch', { name: 'Svullnad' }).click();
      await page.getByRole('button', { name: 'Spara' }).click();
      await page.getByRole('heading', { name: /Passet är klart/ }).waitFor();
      await page.screenshot({ path: `${OUT}/${tag}-after-stop.png` });
      await page.getByRole('button', { name: 'Till träningen' }).click();
      await page.getByText(/Senast avbröt du/).waitFor();
      await page.screenshot({ path: `${OUT}/${tag}-after-stop-week.png` });

      // session idle for days: ended by the timeout, with a notice
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('stomme');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const tx = db.transaction(['sessions', 'setLogs'], 'readwrite');
              const d = new Date(Date.now() - 3 * 86400000);
              const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              tx.objectStore('sessions').put({
                id: 'stale-1',
                templateId: 'B',
                date,
                startedAt: d.toISOString(),
                status: 'in_progress',
                programWeek: 1,
                plan: [],
                feedback: {},
              });
              tx.objectStore('setLogs').put({
                id: 'stale-set',
                sessionId: 'stale-1',
                exerciseId: 'goblet-chair-squat',
                setNumber: 1,
                side: 'both',
                amount: 8,
                weightKg: 0,
                loadIndex: 0,
                loggedAt: d.toISOString(),
              });
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            };
          }),
      );
      await page.reload();
      await page.getByText(/avslutades automatiskt/).waitFor();
      await page.screenshot({ path: `${OUT}/${tag}-stale.png` });
      await ctx.close();

      // error boundary: make the History route throw on render
      const ctx2 = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        colorScheme: scheme,
        reducedMotion: 'reduce',
      });
      // tsx preserves function names with __name inside serialized callbacks.
      await ctx2.addInitScript('window.__name = (fn) => fn;');
      const p2 = await ctx2.newPage();
      await p2.route('**/features/history/History.tsx*', (r) =>
        r.fulfill({
          contentType: 'text/javascript',
          body: "export function History(){ throw new Error('demo'); }",
        }),
      );
      await p2.goto(base);
      await p2.getByRole('button', { name: /Jag förstår/ }).click();
      await p2.goto(`${base}/#/historik`);
      await p2.getByRole('heading', { name: 'Något gick fel' }).waitFor();
      await p2.screenshot({ path: `${OUT}/${tag}-error-boundary.png` });
      await ctx2.close();
    }
  }
  await browser.close();
} finally {
  srv.kill();
}
