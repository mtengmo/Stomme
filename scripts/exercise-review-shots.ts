/** Static start/middle/end contact sheets for the exercise text/animation audit. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const port = 5302;
const base = `http://localhost:${port}`;
const out = '.impeccable/review/exercises';
const batchSize = 9;
mkdirSync(out, { recursive: true });

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', `${port}`, '--strictPort'],
  { stdio: 'ignore' },
);
const browser = await chromium.launch();

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Exercise review server did not start');

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.goto(`${base}/#/dev/figurer`);
  await page.getByRole('heading', { name: 'Figurer', exact: true }).waitFor();
  await page.addStyleTag({
    content: `
      nav[aria-label="Huvudmeny"] { display: none !important; }
      main > div { max-width: none !important; display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start;
        gap: 20px !important; padding: 20px !important; }
      main > div > h1 { grid-column: 1 / -1; }
      main > div > section { margin: 0 !important; break-inside: avoid; }
    `,
  });

  const sections = page.locator('main > div > section');
  const count = await sections.count();
  for (let start = 0; start < count; start += batchSize) {
    const end = Math.min(count, start + batchSize);
    await sections.evaluateAll(
      (nodes, range) => {
        nodes.forEach((node, index) => {
          (node as HTMLElement).style.display =
            index >= range.start && index < range.end ? '' : 'none';
        });
      },
      { start, end },
    );
    const first = String(start + 1).padStart(2, '0');
    const last = String(end).padStart(2, '0');
    await page.screenshot({
      path: `${out}/E${first}-E${last}.png`,
      fullPage: true,
    });
  }
  await context.close();
  console.log(`Exercise review screenshots: ${out}/E*.png`);
} finally {
  await browser.close();
  server.kill();
}
