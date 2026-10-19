/** Capture the muscle-guidance surfaces with synthetic data only. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { exerciseList } from '../src/content/exercises';

const port = 5301;
const base = `http://localhost:${port}`;
const out = '.impeccable/review';
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
  if (!ready) throw new Error('Muscle review server did not start');
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 412, height: 915 },
    ]) {
      const context = await browser.newContext({
        viewport,
        colorScheme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const tag = `muscles-${viewport.width}-${colorScheme}`;
      await page.goto(base);
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await page.goto(`${base}/#/ovningar?muskel=core`);
      await page
        .getByRole('heading', { name: 'Övningar', exact: true })
        .waitFor();
      await page.screenshot({
        path: `${out}/${tag}-library.png`,
        fullPage: true,
      });
      await page.goto(`${base}/#/pass/A`);
      await page
        .getByRole('button', { name: 'Byt övning', exact: true })
        .first()
        .click();
      await page.getByLabel('Övning i moment 1').selectOption('split-squat');
      await page.screenshot({
        path: `${out}/${tag}-choices.png`,
        fullPage: true,
      });
      for (const { id } of exerciseList) {
        await page.goto(`${base}/#/ovning/${id}`);
        await page
          .getByRole('button', { name: 'Muskler', exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: 'Rörelse', exact: true })
          .click();
        if (['goblet-chair-squat', 'single-leg-rdl', 'dead-bug'].includes(id)) {
          await page.screenshot({
            path: `${out}/${tag}-${id}-movement.png`,
            fullPage: true,
          });
        }
        await page
          .getByRole('button', { name: 'Muskler', exact: true })
          .click();
        const navigation = page.locator('nav[aria-label="Huvudmeny"]');
        await navigation.evaluate((element) => {
          element.style.visibility = 'hidden';
        });
        await page
          .getByRole('region', { name: 'Muskler', exact: true })
          .screenshot({ path: `${out}/${tag}-${id}-map.png` });
        await navigation.evaluate((element) => {
          element.style.visibility = '';
        });
      }
      if (viewport.width === 360) {
        await page.goto(`${base}/#/dev/figurer`);
        await page
          .getByRole('heading', { name: 'Figurer', exact: true })
          .waitFor();
        for (const [i, section] of (
          await page.locator('main section').all()
        ).entries()) {
          await section.screenshot({ path: `${out}/${tag}-poses-${i}.png` });
        }
      }
      await context.close();
    }
  }
  console.log(`Muscle review screenshots: ${out}/muscles-*`);
} finally {
  await browser.close();
  server.kill();
}
