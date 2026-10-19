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
      const ctx = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        colorScheme: scheme,
        reducedMotion: 'reduce',
        acceptDownloads: true,
      });
      const page = await ctx.newPage();
      const tag = `m6-${s.name}-${scheme}`;
      await page.goto(base);
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.goto(`${base}/#/dev/demo`);
      await page
        .getByRole('button', { name: 'Fyll med syntetisk testdata' })
        .click();
      await page.getByText(/Fyllde med/).waitFor();

      // backup reminder on the week view
      await page.goto(`${base}/#/`);
      await page.getByText(/säkerhetskopierade/).waitFor();
      await page.screenshot({ path: `${OUT}/${tag}-reminder.png` });

      // settings (full page), with an export status line
      await page.goto(`${base}/#/installningar`);
      await page.getByRole('heading', { name: 'Inställningar' }).waitFor();
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Exportera' }).click(),
      ]);
      const path = await dl.path();
      await page.getByRole('status').waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${OUT}/${tag}-settings.png`,
        fullPage: true,
      });

      // import error
      await page.getByLabel('Välj säkerhetskopia att importera').setInputFiles({
        name: 'x.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"schemaVersion":1}'),
      });
      await page.getByRole('alert').waitFor();
      await page.screenshot({
        path: `${OUT}/${tag}-import-error.png`,
        fullPage: true,
      });

      // import confirm
      await page
        .getByLabel('Välj säkerhetskopia att importera')
        .setInputFiles(path);
      await page.getByRole('heading', { name: 'Ersätta din data?' }).waitFor();
      await page.screenshot({ path: `${OUT}/${tag}-import-confirm.png` });
      await page.getByRole('button', { name: 'Behåll min data' }).click();

      // delete confirm
      await page.getByRole('button', { name: 'Radera all data' }).click();
      await page.getByRole('heading', { name: 'Radera allt?' }).waitFor();
      await page.screenshot({ path: `${OUT}/${tag}-delete-confirm.png` });
      await ctx.close();

      // update banner (virtual module stubbed to a waiting update)
      const ctx2 = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        colorScheme: scheme,
        reducedMotion: 'reduce',
      });
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
      await p2.screenshot({ path: `${OUT}/${tag}-update-banner.png` });
      await ctx2.close();
    }
  }
  await browser.close();
} finally {
  srv.kill();
}
