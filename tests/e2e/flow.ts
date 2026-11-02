import { expect, type Page } from '@playwright/test';
import { exerciseReferences } from '../../src/content/exerciseReferences';
import type { ExerciseId } from '../../src/domain/types';

/** Pick an exercise through the searchable editor chooser. */
export async function addExercise(page: Page, exerciseId: ExerciseId) {
  await page
    .getByRole('button', { name: 'Lägg till övning', exact: true })
    .click();
  await page.getByLabel('Sök övning', { exact: true }).fill(exerciseId);
  await page
    .getByRole('listitem')
    .filter({ hasText: exerciseReferences[exerciseId] })
    .getByRole('button', { name: 'Lägg till övningen', exact: true })
    .click();
}

/**
 * Installs a fake clock that only moves when the test advances it
 * (fastForward/runFor). A plain `clock.install()` lets time flow in real time,
 * so a loaded machine can let a countdown run past the value being asserted.
 */
export async function freezeClock(page: Page): Promise<void> {
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now + 1_000);
}

export type Stage =
  | 'preview'
  | 'set-first'
  | 'set-side'
  | 'set-timed'
  | 'set-after-skip'
  | 'rest'
  | 'effort'
  | 'summary';

const ACTION =
  /^(Klar set|Hoppa över vila|Avsluta pass|Starta – 5 s förberedelse)$/;

/**
 * Starts a regular (general) user from a clean first visit: onboarding, the
 * first-use questions and the preview of Pass A (nothing started yet).
 * With `onboarded` the shared onboarded storage state is assumed.
 */
export async function openPreview(
  page: Page,
  onboarded = false,
  options: Partial<Parameters<typeof quickStart>[1]> = {},
): Promise<void> {
  await page.goto('/');
  if (!onboarded)
    await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general', ...options });
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();
}

/**
 * Opens the preview, replaces the whole pass with one chosen exercise (`sets`
 * sets) and starts it. For specs that need one known exercise on screen.
 */
export async function startOnlyExercise(
  page: Page,
  exerciseId: ExerciseId,
  options: {
    sets?: number;
    onboarded?: boolean;
    quickStart?: Partial<Parameters<typeof quickStart>[1]>;
  } = {},
): Promise<void> {
  await openPreview(page, options.onboarded ?? true, options.quickStart);
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await removeAllExercises(page);
  await addExercise(page, exerciseId);
  if (options.sets !== undefined)
    await page.getByLabel('Set', { exact: true }).fill(String(options.sets));
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await expect(page.locator('[data-step]')).toBeVisible();
}

/** Opens the preview of Pass A and starts it: no questions, straight to the first set. */
export async function startPassA(page: Page, onboarded = false): Promise<void> {
  await openPreview(page, onboarded);
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await expect(page.locator('[data-step]')).toBeVisible();
}

/** Number of distinct (exercise, set number) pairs stored; both sides of a set count once. */
async function storedSetCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('stomme');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result
            .transaction('setLogs')
            .objectStore('setLogs')
            .getAll();
          request.onsuccess = () => {
            open.result.close();
            const rows = request.result as {
              exerciseId: string;
              setNumber: number;
            }[];
            resolve(
              new Set(rows.map((r) => `${r.exerciseId}|${r.setNumber}`)).size,
            );
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
}

/**
 * Plays Pass A of a new regular user from a clean database: onboarding,
 * quick start, preview, then only the primary action on each screen (Klar set,
 * skip rest, Lagom, Avsluta pass). Calls `onStage` the first time each kind of
 * screen is on show. `planned` is the set total the tally showed at the start;
 * `sets` is what was stored.
 */
export async function playPassA(
  page: Page,
  onStage: (stage: Stage) => Promise<void> = async () => {},
): Promise<{ sets: number; planned: number }> {
  await openPreview(page);
  await onStage('preview');
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await expect(page.locator('[data-step]')).toBeVisible();
  const tally = await page
    .getByRole('img', { name: /set klara/ })
    .getAttribute('aria-label');
  const planned = Number(/av (\d+) set klara/.exec(tally ?? '')?.[1]);

  const seen = new Set<Stage>();
  const once = async (stage: Stage) => {
    if (seen.has(stage)) return;
    seen.add(stage);
    await onStage(stage);
  };

  for (let guard = 0; guard < 120; guard++) {
    const action = page.getByRole('button', { name: ACTION }).first();
    const finalEffort = page.getByRole('heading', {
      name: /Hur ansträngande/,
    });
    await action.or(finalEffort).first().waitFor();
    if (await finalEffort.count()) {
      await once('effort');
      await page.getByRole('button', { name: 'Lagom', exact: true }).click();
      await expect(finalEffort).toHaveCount(0);
      continue;
    }
    const name = (await action.innerText()).trim();

    if (name.startsWith('Starta –')) {
      await once('set-timed');
      await freezeClock(page);
      await action.click();
      // Drive the countdowns (preparation, holds, sides, rests) until the
      // effort question or a plain action shows again.
      const plain = page.getByRole('button', {
        name: /^(Klar set|Avsluta pass)$/,
      });
      const effort = page.getByRole('button', {
        name: 'Lagom',
        exact: true,
      });
      for (let tick = 0; tick < 200; tick++) {
        if ((await effort.count()) || (await plain.count())) break;
        await page.clock.fastForward(5_000);
      }
      await page.clock.resume();
      continue;
    }

    if (name === 'Avsluta pass') {
      await once('summary');
      await action.click();
      break;
    }

    const stepAttr = page.locator('[data-step]');
    const before = await stepAttr.getAttribute('data-step');

    if (name === 'Klar set') {
      const heading = (await page.locator('h1').innerText()).trim();
      if (await page.getByText(/Set \d av \d · Höger/).count())
        await once('set-side');
      else if (/^Sidoplanka|^Plankan/.test(heading)) await once('set-timed');
      else await once('set-first');
    } else if (name === 'Hoppa över vila') {
      await once('rest');
      if (
        await page.getByRole('button', { name: 'Lagom', exact: true }).count()
      )
        await once('effort');
    } else {
      await once('effort');
    }
    await action.click();
    // the summary has no data-step, so a vanished attribute also counts as moved on
    await expect(async () => {
      const now = await stepAttr
        .getAttribute('data-step', { timeout: 250 })
        .catch(() => null);
      expect(now).not.toBe(before);
    }).toPass();
  }

  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page.getByRole('link', { name: 'Visa nästa pass', exact: true }),
  ).toBeVisible();
  return { sets: await storedSetCount(page), planned };
}

/** From a running session: "Avbryt", then "Avbryt – det gör ont", ending on the stop screen. */
export async function abortForPain(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await page.getByRole('button', { name: 'Avbryt – det gör ont' }).click();
  await expect(page).toHaveURL(/#\/stopp\//);
}

/** Starts Pass A, skips the first exercise and reports the next set screen. */
export async function skipFirstExercise(
  page: Page,
  onStage: (stage: Stage) => Promise<void>,
): Promise<void> {
  await startPassA(page);
  const frame = page.locator('[data-step]');
  const before = await frame.getAttribute('data-step');
  await page.getByRole('button', { name: 'Hoppa över övningen' }).click();
  await expect(frame).not.toHaveAttribute('data-step', before ?? '');
  await expect(page.getByRole('status')).toContainText('Hoppade över');
  await onStage('set-after-skip');
}

/**
 * Removes exercises from the compact editor until `keep` remain, then opens
 * the first remaining row so its fields can be edited.
 */
export async function keepFirstExercises(page: Page, keep = 1): Promise<void> {
  const rows = page.locator('ol > li > button[aria-expanded]');
  const remove = page.getByRole('button', { name: /^Ta bort / });
  while ((await rows.count()) > keep) {
    if (!(await remove.count())) await rows.last().click();
    await remove.click();
  }
  if (!(await remove.count())) await rows.first().click();
  await expect(page.getByLabel('Set', { exact: true })).toBeVisible();
}

/** Completes every remaining set of the current exercise (one tap each). */
export async function completeSets(page: Page): Promise<void> {
  const effort = page.getByRole('heading', {
    name: 'Hur ansträngande var övningen?',
  });
  const done = page.getByRole('button', { name: 'Klar set', exact: true });
  for (let guard = 0; guard < 12; guard++) {
    await done.or(effort).first().waitFor();
    if (await effort.count()) return;
    const before = await page.locator('[data-step]').getAttribute('data-step');
    await done.click();
    await expect(async () => {
      const now = await page
        .locator('[data-step]')
        .getAttribute('data-step', { timeout: 250 })
        .catch(() => null);
      expect(now).not.toBe(before);
    }).toPass();
    if (await page.getByRole('button', { name: 'Hoppa över vila' }).count())
      await page.getByRole('button', { name: 'Hoppa över vila' }).click();
  }
}

/** Empties the compact editor, removing each exercise through its own row. */
export async function removeAllExercises(page: Page): Promise<void> {
  const rows = page.locator('ol > li > button[aria-expanded]');
  const remove = page.getByRole('button', { name: /^Ta bort / });
  while (await rows.count()) {
    if (!(await remove.count())) await rows.last().click();
    await remove.click();
  }
}

export type QuickStartGoal = 'general' | 'build' | 'knee' | 'physio' | 'custom';
const GOAL_BUTTON: Record<QuickStartGoal, string> = {
  general: 'Bli starkare',
  build: 'Skapa eget pass',
  knee: 'Knärehab',
  physio: 'Jag har fysioterapeutens knäprogram (9 övningar)',
  custom: 'Jag har ett eget rehabprogram',
};
const LEVEL_LABEL = {
  new: /Ny eller på väg tillbaka/,
  some: /Viss vana/,
  regular: /Tränar regelbundet/,
};
const FINISH: Record<QuickStartGoal, string> = {
  general: 'Visa mitt pass',
  build: 'Skapa pass',
  knee: 'Visa mitt pass',
  physio: 'Visa mitt program',
  custom: 'Öppna mitt rehabprogram',
};

/**
 * Walks the one-question-per-screen first-use flow. The equipment step starts with
 * chair and wall ticked; `equipment` lists extra checkbox labels to tick, `without`
 * labels to untick, and `onEquipment` runs on that screen (weights). `finish: false`
 * stops before the last button.
 */
export async function quickStart(
  page: Page,
  options: {
    goal: QuickStartGoal;
    equipment?: string[];
    without?: string[];
    onEquipment?: (page: Page) => Promise<void>;
    level?: keyof typeof LEVEL_LABEL;
    focus?: string[];
    side?: 'both' | 'right' | 'left';
    /** 'equipment' stops after the equipment screen; false stops on the last screen. */
    finish?: boolean | 'equipment';
  },
): Promise<void> {
  const { goal, equipment = [], without = [], level, focus, side } = options;
  const finish = options.finish ?? true;
  await page
    .getByRole('button', { name: GOAL_BUTTON[goal], exact: true })
    .click();
  for (const label of equipment)
    await page.getByRole('checkbox', { name: label, exact: true }).check();
  for (const label of without)
    await page.getByRole('checkbox', { name: label, exact: true }).uncheck();
  await options.onEquipment?.(page);
  if (finish === 'equipment') return;
  if (side)
    await page
      .getByRole('combobox', { name: /Arbetande sida/ })
      .selectOption(side);
  if (goal === 'general' || goal === 'build') {
    await page.getByRole('button', { name: 'Nästa', exact: true }).click();
    if (level)
      await page.getByRole('radio', { name: LEVEL_LABEL[level] }).check();
    if (goal === 'build') {
      await page.getByRole('button', { name: 'Nästa', exact: true }).click();
      // The pick step: tick the first exercise so the final button is enabled.
      if (finish)
        await page
          .getByRole('button', { name: /^Välj: / })
          .first()
          .click();
    }
    if (goal === 'general') {
      await page.getByRole('button', { name: 'Nästa', exact: true }).click();
      if (focus?.length) {
        await page.getByRole('radio', { name: 'Välj kroppsdelar' }).check();
        for (const part of focus)
          await page.getByRole('checkbox', { name: part, exact: true }).check();
      }
    }
  }
  if (finish) {
    await page.getByRole('button', { name: FINISH[goal], exact: true }).click();
    // Setup saves asynchronously before navigation. Callers may now navigate
    // onward without a late setup navigation overwriting their destination.
    await expect(page).toHaveURL(/#\/traning\/A(?:\?|$)/);
  }
}

const CHIP_KG = {
  dumbbell: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20],
  kettlebell: [8, 12, 16, 20, 24],
};

/**
 * Registers one owned weight on the equipment step: a quick-pick chip for listed weights
 * (a dumbbell chip is a pair, a kettlebell chip is one), the "Annan vikt" form otherwise.
 * A different count than the chip gives is switched with "Ändra till".
 */
export async function addWeight(
  page: Page,
  weight: { type: 'dumbbell' | 'kettlebell'; count: 1 | 2; kg: number },
): Promise<void> {
  const noun = weight.type === 'dumbbell' ? 'hantel' : 'kettlebell';
  const kind = weight.type === 'dumbbell' ? 'Hantlar' : 'Kettlebell';
  const tick = page.getByRole('checkbox', { name: kind, exact: true });
  if (!(await tick.isChecked())) await tick.check();
  const kgLabel = String(weight.kg).replace('.', ',');
  const name = `${noun[0]?.toUpperCase()}${noun.slice(1)} ${kgLabel} kg`;
  const chip = page.getByRole('button', { name, exact: true });
  const listed = CHIP_KG[weight.type].includes(weight.kg);
  if (listed && (await chip.getAttribute('aria-pressed')) === 'false') {
    await chip.click();
    const natural = weight.type === 'dumbbell' ? 2 : 1;
    if (weight.count !== natural)
      await page
        .getByRole('button', {
          name: `Ändra ${noun} ${kgLabel} kg till ${weight.count === 2 ? 'par' : '1 st'}`,
        })
        .click();
    return;
  }
  await page
    .getByRole('button', { name: `Annan vikt, ${noun}`, exact: true })
    .click();
  await page.getByLabel('Vikt (kg)').fill(kgLabel);
  await page
    .getByRole('radio', { name: weight.count === 2 ? 'Par' : '1 st' })
    .check();
  await page.getByRole('button', { name: /^Lägg till .* kg \(/ }).click();
}
