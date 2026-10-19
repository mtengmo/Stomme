/** M6 UI captures: settings, import/delete confirm, update banner, backup reminder. DEV server + SYNTHETIC demo data. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 5291;
const OUT = '.impeccable/review';
const sizes = [
  { name: '360', width: 360, height: 800 },
  { name: '412', width: 412, height: 915 },
];
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
const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
try {
  const base = `http://localhost:${PORT}`;
  await up(base);
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark'] as const) {
    for (const s of sizes) {
      const opts = {
        viewport: { width: s.width, height: s.height },
        colorScheme: scheme,
        reducedMotion: 'reduce' as const,
        acceptDownloads: true,
      };
      const tag = `m6-${s.name}-${scheme}`;
      const shot = (p: import('@playwright/test').Page, n: string) =>
        p.screenshot({ path: `${OUT}/${tag}-${n}.png` });
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(base);
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.goto(`${base}/#/dev/demo`);
      await page
        .getByRole('button', { name: 'Fyll med syntetisk testdata' })
        .click();
      await page.getByText(/Fyllde med/).waitFor();

      // reminder below the cards, never an export yet
      await page.goto(`${base}/#/`);
      await page.getByText('Aldrig säkerhetskopierat').waitFor();
      await shot(page, 'week-first-viewport');
      await page.getByText('Aldrig säkerhetskopierat').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);
      await shot(page, 'reminder');

      // settings: never backed up (top and bottom viewports)
      await page.goto(`${base}/#/installningar`);
      await page.getByRole('heading', { name: 'Inställningar' }).waitFor();
      await shot(page, 'settings-never');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);
      await shot(page, 'settings-bottom');
      await page.evaluate(() => window.scrollTo(0, 0));
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Exportera' }).click(),
      ]);
      const path = await dl.path();
      await page.getByRole('status').waitFor();
      await shot(page, 'settings-exported');

      const input = page.getByLabel('Välj säkerhetskopia att importera');
      await input.setInputFiles({
        name: 'x.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"schemaVersion":99}'),
      });
      await page.getByRole('alert').waitFor();
      await shot(page, 'import-error');

      await input.setInputFiles(path);
      await page.getByRole('heading', { name: 'Ersätta din data?' }).waitFor();
      await shot(page, 'import-confirm');
      await page.goBack(); // Android Back = Behåll min data
      await page.getByRole('heading', { name: 'Inställningar' }).waitFor();

      await page.getByRole('button', { name: 'Radera all data' }).click();
      await page.getByRole('heading', { name: 'Radera allt?' }).waitFor();
      await shot(page, 'delete-confirm');
      await ctx.close();

      // persisted + installable + installed
      const ctx3 = await browser.newContext(opts);
      const p3 = await ctx3.newPage();
      await p3.addInitScript(
        "Object.defineProperty(navigator,'storage',{value:{persisted:async()=>true,persist:async()=>true,estimate:async()=>({usage:3407872,quota:64424509440})}})",
      );
      await p3.goto(base);
      await p3.getByRole('button', { name: /Jag förstår/ }).click();
      await p3.goto(`${base}/#/installningar`);
      await p3.getByText('Lagring: skyddad').waitFor();
      await p3.evaluate(() =>
        window.dispatchEvent(new Event('beforeinstallprompt')),
      );
      await p3.getByRole('button', { name: 'Installera appen' }).waitFor();
      await p3
        .getByRole('heading', { name: 'Lagring' })
        .scrollIntoViewIfNeeded();
      await p3.evaluate(() => window.scrollBy(0, 100));
      await shot(p3, 'settings-installable');
      await p3.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
      await p3.getByText('Installerad', { exact: true }).waitFor();
      await shot(p3, 'settings-installed');
      await ctx3.close();

      // update banner (virtual module stubbed to a waiting update): week and settings
      const ctx2 = await browser.newContext(opts);
      const p2 = await ctx2.newPage();
      await p2.route('**/virtual:pwa-register/react*', (r) =>
        r.fulfill({
          contentType: 'text/javascript',
          body: 'export function useRegisterSW(){return {needRefresh:[true,()=>{}],offlineReady:[false,()=>{}],updateServiceWorker:async()=>{}}}',
        }),
      );
      await p2.goto(base);
      await p2.getByRole('button', { name: /Jag förstår/ }).click();
      await p2.getByText('Ny version finns').waitFor();
      await shot(p2, 'update-banner');
      await p2.goto(`${base}/#/installningar`);
      await p2.getByText('Appen laddas om. Din data påverkas inte.').waitFor();
      await shot(p2, 'update-settings');
      await ctx2.close();
    }
  }
  await browser.close();
} finally {
  srv.kill();
}
