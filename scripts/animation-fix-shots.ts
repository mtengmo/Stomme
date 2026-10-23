/** Review the full outward/return path and actual guide layout together. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = 'http://localhost:5303';
const out = '.impeccable/review/animation-fixes';
mkdirSync(out, { recursive: true });
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', '5303', '--strictPort'],
  { stdio: 'ignore' },
);
const browser = await chromium.launch();
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: width === 390 ? 'dark' : 'light',
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    const defaults = [
      'dead-bug',
      'bird-dog',
      'kettlebell-press',
      'kettlebell-floor-press',
      'bench-side-plank-leg-lift',
      'step-up',
      'rear-foot-split-squat',
      'suitcase-carry',
    ];
    for (const id of process.argv.length > 2
      ? process.argv.slice(2)
      : defaults) {
      const frames: { label: string; png: string }[] = [];
      for (const side of ['right', 'left']) {
        for (const phase of [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]) {
          await page.goto(`${base}/#/ovning/${id}?phase=${phase}`);
          const stage = page.locator('.exercise-stage');
          await stage.waitFor();
          const toggle = page.getByRole('button', { name: /Byt sida/ });
          if (
            (await stage.locator('svg > text').first().textContent()) !==
            (side === 'left' ? 'V' : 'H')
          )
            await toggle.click();
          if (
            ['step-up', 'rear-foot-split-squat', 'suitcase-carry'].includes(id)
          )
            await page
              .getByRole('button', { name: 'Framifrån', exact: true })
              .click();
          frames.push({
            label: `${side} · ${phase}`,
            png: (await stage.screenshot()).toString('base64'),
          });
        }
      }
      const sheet = await context.newPage();
      await sheet.setViewportSize({ width: 1500, height: 900 });
      await sheet.setContent(
        `<body style="margin:12px;background:#eee;font:16px system-ui;display:grid;grid-template-columns:repeat(6,240px);gap:8px">${frames.map(({ label, png }) => `<figure style="margin:0"><figcaption>${id} · ${label}</figcaption><img width="240" src="data:image/png;base64,${png}"></figure>`).join('')}</body>`,
      );
      await sheet.screenshot({
        path: `${out}/${width}-${id}.png`,
        fullPage: true,
      });
      await sheet.close();
    }
    await page.goto(`${base}/#/ovning/kettlebell-floor-press`);
    await page
      .getByRole('heading', { name: 'Greppet under pressen' })
      .waitFor();
    await page.screenshot({
      path: `${out}/${width}-guide.png`,
      fullPage: true,
    });
    await context.close();
  }
  console.log(`Animation fix sheets: ${out}`);
} finally {
  await browser.close();
  server.kill();
}
