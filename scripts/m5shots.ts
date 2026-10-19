/** M5 captures: history with charts, table toggles, empty state, session detail. DEV server + SYNTHETIC demo data. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 5198;
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
      });
      const page = await ctx.newPage();
      const tag = `m5-${s.name}-${scheme}`;
      await page.goto(base);
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.goto(`${base}/#/historik`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${tag}-empty.png` });
      await page.goto(`${base}/#/dev/demo`);
      await page
        .getByRole('button', { name: 'Fyll med syntetisk testdata' })
        .click();
      await page.getByText(/Fyllde med/).waitFor();
      await page.goto(`${base}/#/historik`);
      await page.getByRole('heading', { name: 'Set per vecka' }).waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${OUT}/${tag}-history.png`,
        fullPage: true,
      });
      for (let i = 0; i < 3; i++) {
        await page
          .getByRole('button', { name: 'Visa som tabell' })
          .first()
          .click();
      }
      await page.waitForTimeout(200);
      await page.screenshot({
        path: `${OUT}/${tag}-tables.png`,
        fullPage: true,
      });
      await page.goto(`${base}/#/historik`);
      await page.getByRole('link', { name: /Pass/ }).first().click();
      await page
        .getByRole('heading', { name: /Pass [AB]/, level: 1 })
        .waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${OUT}/${tag}-detail.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Radera passet' }).click();
      await page.getByRole('button', { name: 'Ja, radera passet' }).waitFor();
      await page.waitForTimeout(200);
      await page
        .getByRole('button', { name: 'Behåll passet' })
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${OUT}/${tag}-confirm.png` });
      await ctx.close();
    }
  }
  await browser.close();
} finally {
  srv.kill();
}
