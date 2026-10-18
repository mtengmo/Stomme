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
      const page = await context.newPage();
      await page.goto(url);
      await page.getByRole('button', { name: /Jag förstår/ }).waitFor();
      await page.screenshot({
        path: `${OUT}/${size.name}-${scheme}-onboarding.png`,
      });
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.getByRole('link', { name: 'Starta pass' }).waitFor();
      await page.screenshot({
        path: `${OUT}/${size.name}-${scheme}-week.png`,
      });
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
