import { devices, type Page, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

// Opt-in screenshot round for the navigation restructure:
//   NAV_SHOTS=1 npx playwright test nav-shots
// Not part of the normal run (skipped without the variable).
const OUT = '.impeccable/shots/nav-restructure';
test.skip(!process.env.NAV_SHOTS, 'screenshots only on request');
test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const CASES = [
  { name: '390x844', viewport: { width: 390, height: 844 }, scale: 100 },
  { name: '320x640-130', viewport: { width: 320, height: 640 }, scale: 130 },
] as const;
const LOOKS = [
  { theme: 'rutat', scheme: 'light' },
  { theme: 'rutat', scheme: 'dark' },
  { theme: 'hav', scheme: 'light' },
] as const;

async function shoot(page: Page, name: string) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

for (const c of CASES)
  for (const look of LOOKS)
    test(`shots ${c.name} ${look.theme} ${look.scheme}`, async ({ page }) => {
      test.setTimeout(120_000);
      const tag = `${c.name}-${look.theme}-${look.scheme}`;
      await page.addInitScript((value) => {
        localStorage.setItem('stomme.appearance', value);
      }, JSON.stringify(look));
      await page.setViewportSize(c.viewport);
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await quickStart(page, { goal: 'general' });
      const scale = async () => {
        if (c.scale !== 100)
          await page.addStyleTag({ content: `html{font-size:${c.scale}%}` });
      };
      await page.goto('/#/');
      await scale();
      await shoot(page, `idag-program-${tag}`);
      await page.goto('/#/ovningar');
      await shoot(page, `ovningar-${tag}`);
      await page.goto('/#/mitt-program');
      await shoot(page, `mitt-program-${tag}`);
      await page.goto('/#/historik');
      await shoot(page, `historik-${tag}`);
      await page.goto('/#/installningar');
      await shoot(page, `mer-${tag}`);
      // The plain Home (no programme).
      await page.goto('/#/mitt-program');
      await page.getByRole('button', { name: 'Avsluta programmet' }).click();
      await page
        .getByRole('button', { name: 'Avsluta programmet nu', exact: true })
        .click();
      await page.getByRole('heading', { name: 'Nästa pass' }).waitFor();
      await shoot(page, `idag-plain-${tag}`);
      await page.getByRole('link', { name: /^Mitt program/ }).click();
      await shoot(page, `mitt-program-plain-${tag}`);
    });
