import { devices, expect, test } from '@playwright/test';
import { exerciseReferences } from '../../src/content/exerciseReferences';
import { addWeight, quickStart } from './flow';
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

async function choosePress(page: import('@playwright/test').Page) {
  await openFocus(page);
  await page.getByRole('radio', { name: /^Press/ }).check();
  await page.getByRole('button', { name: 'Visa passet', exact: true }).click();
  await expect(page).toHaveURL(/#\/traning\/[AB]\?fokus=push$/);
  await expect(
    page.getByRole('heading', { name: 'Fokus: Press', exact: true }),
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

test.describe('start focus after a reported symptom', () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

  test('Press omits impact work and starts at bodyweight after a symptom', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, {
      goal: 'general',
      level: 'some',
      onEquipment: async (currentPage) =>
        addWeight(currentPage, { type: 'dumbbell', count: 2, kg: 5 }),
    });
    await page.goto('/#/');
    await choosePress(page);
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();

    await page
      .getByRole('button', { name: 'Rapportera smärta eller besvär' })
      .click();
    await page.getByLabel('Var känns besvären?').selectOption('Axel');
    await page
      .getByRole('combobox', { name: 'Sida', exact: true })
      .selectOption('left');
    await page
      .getByRole('group', { name: 'Besvärens intensitet (0–10)', exact: true })
      .getByText('2', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Spara besvär', exact: true })
      .click();
    await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await page
      .getByRole('button', { name: 'Avbryt passet', exact: true })
      .click();

    await page.goto('/#/');
    await choosePress(page);
    for (const id of IMPACT_IDS)
      await expect(
        page.getByRole('link', { name: new RegExp(exerciseReferences[id]) }),
      ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();

    const plans = await page.evaluate(
      () =>
        new Promise<{ exerciseId: string; weightKg: number }[]>(
          (resolve, reject) => {
            const open = indexedDB.open('stomme');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const request = db
                .transaction('sessions')
                .objectStore('sessions')
                .getAll();
              request.onerror = () => reject(request.error);
              request.onsuccess = () => {
                const all = request.result as {
                  status: string;
                  startedAt: string;
                  plan: { exerciseId: string; weightKg: number }[];
                }[];
                const active = all
                  .filter((session) => session.status === 'in_progress')
                  .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
                resolve(active?.plan ?? []);
              };
              db.onclose = () => db.close();
            };
          },
        ),
    );
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((item) => item.weightKg === 0)).toBe(true);
  });
});
