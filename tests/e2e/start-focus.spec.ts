import { devices, expect, test } from '@playwright/test';
import { exerciseMetadata } from '../../src/content/exerciseMetadata';
import { exerciseReferences } from '../../src/content/exerciseReferences';
import type { ExerciseId } from '../../src/domain/types';
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
  'single-leg-lateral-hop',
  'box-jump',
] as const;

async function prepareGeneral(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general' });
  await page.goto('/#/');
}

type PlannedLoad = {
  exerciseId: ExerciseId;
  variantId?: string;
  weightKg: number;
};
type StoredPreview = { key: string; plan: PlannedLoad[] };

async function storedPreviewPlan(
  page: import('@playwright/test').Page,
  template: 'A' | 'B',
  focus: string,
): Promise<StoredPreview | null> {
  return page.evaluate(
    ({ template, focus }) => {
      for (const key of Object.keys(sessionStorage)) {
        try {
          const value: unknown = JSON.parse(
            sessionStorage.getItem(key) ?? 'null',
          );
          if (
            Array.isArray(value) &&
            key.includes(`.${template}.${focus}.`) &&
            value.length > 0 &&
            value.every(
              (item) =>
                item &&
                typeof item === 'object' &&
                typeof item.exerciseId === 'string' &&
                typeof item.weightKg === 'number',
            )
          )
            return { key, plan: value as PlannedLoad[] };
        } catch {
          // Ignore other session values and malformed drafts.
        }
      }
      return null;
    },
    { template, focus },
  );
}

function lightestOwnedLoad(item: PlannedLoad): number {
  const variant = exerciseMetadata[item.exerciseId].variants.find(
    (candidate) => candidate.id === item.variantId,
  );
  const tool = variant?.equipment.find(
    (equipment) =>
      equipment.type === 'dumbbell' || equipment.type === 'kettlebell',
  );
  return tool ? tool.count * 2 : 0;
}

async function startedPlan(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      new Promise<PlannedLoad[]>((resolve, reject) => {
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
              plan: PlannedLoad[];
            }[];
            const active = all
              .filter((session) => session.status === 'in_progress')
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
            db.close();
            resolve(active?.plan ?? []);
          };
        };
      }),
  );
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

  test('a symptom invalidates the untouched Press draft and starts at the lightest owned load', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, {
      goal: 'general',
      level: 'regular',
      onEquipment: async (currentPage) => {
        await addWeight(currentPage, { type: 'dumbbell', count: 2, kg: 2 });
        await addWeight(currentPage, { type: 'dumbbell', count: 2, kg: 5 });
      },
    });

    await page.goto('/#/');
    await choosePress(page);
    await expect
      .poll(
        async () =>
          (await storedPreviewPlan(page, 'A', 'push'))?.plan.length ?? 0,
      )
      .toBeGreaterThan(0);
    const automaticPressDraft = await storedPreviewPlan(page, 'A', 'push');
    expect(automaticPressDraft).not.toBeNull();
    expect(
      automaticPressDraft?.plan.some(
        (item) => item.weightKg > lightestOwnedLoad(item),
      ),
    ).toBe(true);

    // A different focus and direction leaves the untouched A/Press draft stored.
    await page.goto('/#/traning/B?fokus=legs');
    await expect(
      page.getByRole('heading', { name: 'Fokus: Ben', exact: true }),
    ).toBeVisible();
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
    const retainedPressDraft = await storedPreviewPlan(page, 'A', 'push');
    expect(retainedPressDraft?.plan).toEqual(automaticPressDraft?.plan);
    await choosePress(page);
    await expect(page).toHaveURL(/#\/traning\/A\?fokus=push$/);
    await expect
      .poll(async () => {
        const draft = await storedPreviewPlan(page, 'A', 'push');
        return (
          draft?.plan.length &&
          draft.plan.every((item) => item.weightKg === lightestOwnedLoad(item))
        );
      })
      .toBe(true);
    for (const id of IMPACT_IDS)
      await expect(
        page.getByRole('link', { name: new RegExp(exerciseReferences[id]) }),
      ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();

    const plan = await startedPlan(page);
    expect(plan.length).toBeGreaterThan(0);
    expect(
      plan.every((item) =>
        exerciseMetadata[item.exerciseId].variants.some(
          (variant) => variant.id === item.variantId,
        ),
      ),
    ).toBe(true);
    expect(plan.map((item) => item.weightKg)).toEqual(
      plan.map((item) => lightestOwnedLoad(item)),
    );
  });
});
