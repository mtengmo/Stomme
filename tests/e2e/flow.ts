import { expect, type Page } from '@playwright/test';
import { exercises } from '../../src/content/exercises';
import type { ExerciseId } from '../../src/domain/types';

/** Pick an exercise through the searchable editor chooser. */
export async function addExercise(page: Page, exerciseId: ExerciseId) {
  await page
    .getByRole('button', { name: 'Lägg till övning', exact: true })
    .click();
  await page
    .getByLabel('Sök övning', { exact: true })
    .fill(exercises[exerciseId].name);
  await page
    .getByRole('listitem')
    .filter({ hasText: exercises[exerciseId].name })
    .getByRole('button', { name: 'Lägg till övningen', exact: true })
    .first()
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
  await page
    .getByRole('button', { name: 'Starta passet', exact: true })
    .click();
  await expect(page.locator('[data-step]')).toBeVisible();
}

/** Opens the preview of Pass A and starts it: no questions, straight to the first set. */
export async function startPassA(page: Page, onboarded = false): Promise<void> {
  await openPreview(page, onboarded);
  await page
    .getByRole('button', { name: 'Starta passet', exact: true })
    .click();
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
  await page
    .getByRole('button', { name: 'Starta passet', exact: true })
    .click();
  return playRunningSession(page, onStage);
}

/**
 * Plays the session that was just started (the first set is on screen) to the summary and
 * "Avsluta pass", using only the primary action on each screen. Ends on Home.
 */
export async function playRunningSession(
  page: Page,
  onStage: (stage: Stage) => Promise<void> = async () => {},
): Promise<{ sets: number; planned: number }> {
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
    page.getByRole('link', { name: 'Starta passet', exact: true }),
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
  physio: 'Fysioterapeutens knäprogram',
  custom: 'Eget rehabprogram',
};
const LEVEL_LABEL = {
  new: /Ny eller på väg tillbaka/,
  some: /Viss vana/,
  regular: /Tränar regelbundet/,
};
const FINISH: Record<QuickStartGoal, string> = {
  general: 'Visa mitt program',
  build: 'Skapa pass',
  knee: 'Visa mitt pass',
  physio: 'Visa mitt program',
  custom: 'Öppna mitt rehabprogram',
};
const EMPHASIS_LABEL = {
  full: 'Hela kroppen',
  run: 'Ben & bål för löpning',
  upper: 'Mer överkropp',
  unsure: 'Vet inte – välj åt mig',
};

/**
 * Walks the one-question-per-screen first-use flow at /kom-igang.
 * General (strength): goal, days (default 2), emphasis (default whole body), plan (running only), equipment,
 * weights (only when dumbbells or kettlebells are ticked) and level. Chair and wall are
 * always included; `equipment` lists extra checkbox labels to tick, `without` labels to
 * untick (own and rehab programmes only), and `onEquipment` runs on that screen (weights).
 * `finish: false` stops before the last button, 'equipment' after the equipment screen.
 *
 * Finishing a strength flow lands on the programme reveal (/program); for the many specs
 * that predate it the helper then opens the ordinary Pass A preview (#/traning/A).
 * With `reveal: true` it stays on the reveal instead.
 */
export async function quickStart(
  page: Page,
  options: {
    goal: QuickStartGoal;
    equipment?: string[];
    without?: string[];
    onEquipment?: (page: Page) => Promise<void>;
    level?: keyof typeof LEVEL_LABEL;
    days?: 1 | 2 | 3 | 4 | 5;
    emphasis?: keyof typeof EMPHASIS_LABEL;
    /** Running emphasis only: the ready workout to start with (default: automatic). */
    plan?: string;
    side?: 'both' | 'right' | 'left';
    /** 'equipment' stops after the equipment screen; false stops on the last screen. */
    finish?: boolean | 'equipment';
    /** Stay on the programme reveal after a strength flow. */
    reveal?: boolean;
  },
): Promise<void> {
  const { goal, equipment = [], without = [], level, side } = options;
  const finish = options.finish ?? true;
  const rehab = goal === 'knee' || goal === 'physio' || goal === 'custom';
  if (rehab)
    await page
      .getByRole('button', { name: 'Knä- eller rehabprogram', exact: true })
      .click();
  await page
    .getByRole('button', { name: GOAL_BUTTON[goal], exact: true })
    .click();
  const next = page.getByRole('button', { name: 'Nästa', exact: true });
  if (goal === 'general') {
    if (options.days)
      await page
        .getByRole('radio', {
          name: options.days === 1 ? '1 dag' : `${options.days} dagar`,
        })
        .check();
    await next.click();
    if (options.emphasis)
      await page
        .getByRole('radio', { name: EMPHASIS_LABEL[options.emphasis] })
        .check();
    await next.click();
    // Running emphasis adds the plan step.
    if (options.emphasis === 'run') {
      await page
        .getByRole('radio', { name: options.plan ?? 'Automatiskt program' })
        .check();
      await next.click();
    }
  }
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
    await next.click();
    if (goal === 'general') {
      // The weights step shows only when dumbbells or kettlebells were ticked.
      const weights = page.getByRole('heading', {
        name: 'Vilka vikter har du?',
      });
      const levelStep = page.getByRole('group', { name: 'Träningsvana' });
      await weights.or(levelStep).first().waitFor();
      if (await weights.count()) await next.click();
    }
    if (level)
      await page.getByRole('radio', { name: LEVEL_LABEL[level] }).check();
    if (goal === 'build') {
      await next.click();
      // The pick step: tick the first exercise so the final button is enabled.
      if (finish)
        await page
          .getByRole('button', { name: /^Välj: / })
          .first()
          .click();
    }
  }
  if (finish) {
    await page.getByRole('button', { name: FINISH[goal], exact: true }).click();
    // Setup saves asynchronously before navigation. Callers may now navigate
    // onward without a late setup navigation overwriting their destination.
    if (goal === 'general') {
      await expect(page).toHaveURL(/#\/program(?:\?|$)/);
      if (!options.reveal) {
        await page.goto('/#/traning/A');
        await expect(page).toHaveURL(/#\/traning\/A(?:\?|$)/);
      }
    } else {
      await expect(page).toHaveURL(/#\/traning\/A(?:\?|$)/);
    }
  }
}

const CHIP_KG = {
  dumbbell: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20],
  kettlebell: [8, 12, 16, 20, 24],
};

/**
 * Registers one owned weight on the equipment step (the weights step of the strength start flow): a quick-pick chip for listed weights
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
  // On the weights step the ticks are gone: step back to the equipment step first.
  if (!(await tick.count()))
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  if (!(await tick.isChecked())) await tick.check();
  // In the strength start flow the weights live on their own step.
  const weightsHeading = page.getByRole('heading', {
    name: 'Vilka vikter har du?',
  });
  const onEquipmentStep = page.getByRole('heading', {
    name: 'Vad tränar du med?',
  });
  if (await onEquipmentStep.count()) {
    await page.getByRole('button', { name: 'Nästa', exact: true }).click();
    await expect(weightsHeading).toBeVisible();
  }
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

/**
 * Ends the programme from "Mitt program" (week header > "Avsluta programmet"), so
 * the user lands on the ordinary Home (pass A/B, focus picker, week planner) that
 * users without a programme see. Everything else (sessions, workouts) stays.
 */
export async function endProgram(page: Page): Promise<void> {
  await page.goto('/#/');
  await page.getByRole('link', { name: /^Vecka \d av 4/ }).click();
  await page
    .getByRole('button', { name: 'Avsluta programmet', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Avsluta programmet nu', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /^Vecka \d/ })).toHaveCount(0);
}
