import { devices, expect, test } from '@playwright/test';
import { exerciseReferences } from '../../src/content/exerciseReferences';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const CASES = [
  { name: '320x640', viewport: { width: 320, height: 640 }, scale: 100 },
  { name: '390x844', viewport: { width: 390, height: 844 }, scale: 100 },
  { name: '360x640 130%', viewport: { width: 360, height: 640 }, scale: 130 },
] as const;
const SCHEMES = ['light', 'dark'] as const;
const IMPACT_IDS = [
  'blast-off-push-up',
  'squat-jump',
  'jumping-lunge',
  'burpee',
  'single-leg-lateral-hop',
  'box-jump',
  'fast-feet',
  'in-and-out-jump',
  'lateral-shuffle',
  'knee-drive',
] as const;

async function prepareGeneral(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general' });
  await page.goto('/#/');
}

async function openFocus(page: import('@playwright/test').Page) {
  await page.getByText(/^Dagens fokus:/).waitFor();
  await page.getByRole('link', { name: 'Byt', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vad tränar du idag?' }),
  ).toBeVisible();
}

for (const scenario of CASES)
  for (const colorScheme of SCHEMES) {
    test.describe(`start focus ${scenario.name} ${colorScheme}`, () => {
      test.use({ viewport: scenario.viewport, colorScheme });

      test('Home opens the focus picker and Press opens its preview', async ({
        page,
      }, testInfo) => {
        await prepareGeneral(page);
        if (scenario.scale !== 100)
          await page.addStyleTag({
            content: `html{font-size:${scenario.scale}%}`,
          });
        await expect(page.getByText(/^Dagens fokus:/)).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Byt', exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`home-${scenario.name}-${colorScheme}.png`),
          fullPage: true,
        });
        await openFocus(page);
        await page.screenshot({
          path: testInfo.outputPath(
            `focus-${scenario.name}-${colorScheme}.png`,
          ),
          fullPage: true,
        });
        await page.getByRole('radio', { name: /^Press/ }).check();
        await page
          .getByRole('button', { name: 'Visa passet', exact: true })
          .click();
        await expect(page).toHaveURL(/#\/traning\/[AB]\?fokus=push$/);
        await expect(
          page.getByRole('heading', { name: 'Fokus: Press', exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(
            `preview-${scenario.name}-${colorScheme}.png`,
          ),
          fullPage: true,
        });

        for (const id of IMPACT_IDS)
          await expect(
            page.getByRole('link', {
              name: new RegExp(exerciseReferences[id]),
            }),
          ).toHaveCount(0);
      });
    });
  }
