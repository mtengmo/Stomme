/** M3 captures: figurer page, an exercise card, the set screen with figure. */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 5199;
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
      await page.goto(base);
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      const tag = `m3-${s.name}-${scheme}`;
      await page.goto(`${base}/#/dev/figurer`);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${tag}-figurer.png`, fullPage: true });
      await page.goto(`${base}/#/ovning/step-up`);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${tag}-card.png`, fullPage: true });
      await page.goto(`${base}/#/pass/A`);
      await page.getByRole('button', { name: 'Starta pass' }).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${tag}-set.png` });
      await page.getByRole('button', { name: 'Hur gör man?' }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${tag}-sheet.png` });
      await ctx.close();
    }
  }
  await browser.close();
} finally {
  srv.kill();
}
