/**
 * Deterministic key-screen captures at 360x800, light and dark, for pixel
 * comparison across token refactors.
 * Usage: npx tsx scripts/theme-shots.ts <outDir> [--theme=<id>]   (needs `npm run build`)
 * Output goes to .impeccable/review/<outDir> style paths chosen by the caller.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { themes } from '../src/styles/themes/registry';
import { abortForPain, openPreview } from '../tests/e2e/flow';

const PORT = 4180;
const url = `http://localhost:${PORT}/`;
const out = process.argv[2];
if (!out) throw new Error('usage: theme-shots.ts <outDir> [--all-themes]');
/** --all-themes: every registered theme, the key screens, files <theme>-<scheme>-<screen>.png. */
const allThemes = process.argv.includes('--all-themes');
mkdirSync(out, { recursive: true });

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview did not start');
}

const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
});
try {
  await waitForServer();
  const browser = await chromium.launch();
  for (const theme of allThemes ? themes.map((t) => t.id) : [undefined]) {
    for (const scheme of ['light', 'dark'] as const) {
      const fresh = async () => {
        const context = await browser.newContext({
          baseURL: url,
          viewport: { width: 360, height: 800 },
          colorScheme: scheme,
          reducedMotion: 'reduce',
          serviceWorkers: 'block',
        });
        await context.addInitScript(
          `localStorage.setItem('stomme.repCount.manual', '1')`,
        );
        if (theme)
          await context.addInitScript(
            `localStorage.setItem('stomme.appearance', ${JSON.stringify(JSON.stringify({ theme, scheme: 'system' }))})`,
          );
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'));
        await page.goto(url);
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        return { context, page };
      };
      const shot = async (page: Page, name: string) => {
        await page.waitForTimeout(name === 'rest' ? 2500 : 700);
        await page.screenshot({
          path: `${out}/${theme ? `${theme}-` : ''}${scheme}-${name}.png`,
          animations: 'disabled',
        });
      };

      let { context, page } = await fresh();
      if (!allThemes) {
        await page.goto(`${url}#/installningar`);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        await shot(page, 'settings');
      }
      await page.goto(`${url}#/ovning/single-leg-calf-raise`);
      await page.getByText('Visa muskelkarta', { exact: true }).click();
      await page.getByRole('img', { name: 'Kropp bakifrån' }).waitFor();
      await shot(page, 'muscle-map');
      await context.close();

      ({ context, page } = await fresh());
      await openPreview(page, true);
      if (!allThemes) await shot(page, 'preview');
      if (!allThemes) {
        await page.goto(url);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        await shot(page, 'home');
        await page.goBack();
      }
      await page
        .getByRole('button', { name: 'Börja passet', exact: true })
        .click();
      await page.getByRole('button', { name: 'Klar set' }).waitFor();
      await shot(page, 'set');
      await page.getByRole('button', { name: 'Det gör ont' }).click();
      await page.getByRole('button', { name: 'Fortsätt ändå' }).waitFor();
      await shot(page, 'valve');
      await page.getByRole('button', { name: 'Fortsätt ändå' }).click();
      await page.getByRole('button', { name: 'Klar set' }).click();
      await page.getByRole('button', { name: 'Hoppa över vila' }).waitFor();
      await shot(page, 'rest');
      await context.close();

      ({ context, page } = await fresh());
      await openPreview(page, true);
      await page
        .getByRole('button', { name: 'Börja passet', exact: true })
        .click();
      await page.getByRole('button', { name: 'Klar set' }).waitFor();
      await abortForPain(page);
      await page.getByRole('heading', { name: 'Avbryt passet.' }).waitFor();
      await shot(page, 'stop');
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
