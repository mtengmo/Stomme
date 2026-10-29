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
  | 'pain'
  | 'set-first'
  | 'set-side'
  | 'set-timed'
  | 'set-after-skip'
  | 'rest'
  | 'effort'
  | 'pain-after'
  | 'summary';

const ACTION =
  /^(Klar set|Hoppa över vila|Avsluta pass|Spara|Starta – 5 s förberedelse)$/;

/** Fills the pain picker (score, optional red flags) and saves. */
export async function answerPain(
  page: Page,
  score: number,
  flags: string[] = [],
): Promise<void> {
  await page
    .getByRole('radio', { name: new RegExp(`^${score}(,|$)`) })
    .check({ force: true });
  for (const f of flags) await page.getByRole('switch', { name: f }).click();
  await page.getByRole('button', { name: 'Spara' }).click();
}

/**
 * Onboarding (skipped when the spec already runs on the shared onboarded
 * state), then the preview of Pass A (nothing started yet).
 */
export async function openPreview(
  page: Page,
  onboarded = false,
): Promise<void> {
  if (onboarded) {
    await page.goto('/#/pass/A');
  } else {
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page.goto('/#/pass/A');
  }
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();
}

/**
 * Plays Pass A from a clean database: onboarding, preview, then only the
 * primary action on each screen (Klar set, skip rest, Lagom, Avsluta pass).
 * Calls `onStage` the first time each kind of screen is on show.
 */
export async function playPassA(
  page: Page,
  onStage: (stage: Stage) => Promise<void> = async () => {},
): Promise<{ sets: number }> {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.goto('/#/pass/A');
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();
  await onStage('preview');
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await expect(page.getByRole('heading', { name: /Hur känns/ })).toBeVisible();
  await onStage('pain');
  await answerPain(page, 0);
  await expect(page.locator('[data-step]')).toBeVisible();

  const seen = new Set<Stage>();
  const once = async (stage: Stage) => {
    if (seen.has(stage)) return;
    seen.add(stage);
    await onStage(stage);
  };

  let sets = 0;
  for (let guard = 0; guard < 80; guard++) {
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
      // Pass A ends with two right/left pairs of 20-second side planks.
      for (let set = 0; set < 2; set++) {
        for (const side of ['Höger sida nedåt', 'Vänster sida nedåt']) {
          await expect(page.getByText(side, { exact: true })).toBeVisible();
          await expect(page.getByRole('timer')).toHaveText('0:05');
          await page.clock.fastForward(5_000);
          await expect(page.getByRole('timer')).toHaveText('0:20');
          await page.clock.fastForward(20_000);
          sets += 1;
        }
        if (set === 0) {
          await expect(
            page.getByRole('heading', { name: 'Vila', exact: true }),
          ).toBeVisible();
          await page.clock.fastForward(60_000);
        }
      }
      await expect(
        page.getByRole('button', { name: 'Lagom', exact: true }),
      ).toBeVisible();
      await page.clock.resume();
      continue;
    }

    if (name === 'Spara') {
      await once('pain-after');
      await answerPain(page, 0);
      // Saving the 'after' reading finishes the session and shows the summary.
      const home = page.getByRole('link', { name: 'Till träningen' });
      await home.waitFor();
      await once('summary');
      await home.click();
      break;
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
      if (heading.startsWith('Sidoplanka')) await once('set-timed');
      else if (await page.getByText(/Set \d av \d · Höger/).count())
        await once('set-side');
      else await once('set-first');
      sets += 1;
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

  await expect(page.getByRole('link', { name: 'Starta pass' })).toBeVisible();
  return { sets };
}

/** Starts Pass A, skips the first exercise and reports the next set screen. */
export async function skipFirstExercise(
  page: Page,
  onStage: (stage: Stage) => Promise<void>,
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.goto('/#/pass/A');
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await answerPain(page, 0);
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

export type QuickStartGoal =
  | 'general'
  | 'running'
  | 'build'
  | 'knee'
  | 'physio'
  | 'custom';
const GOAL_BUTTON: Record<QuickStartGoal, string> = {
  general: 'Bli starkare',
  running: 'Styrka för löpning',
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
  running: 'Visa mitt pass',
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
  if (goal === 'general' || goal === 'running' || goal === 'build') {
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
  if (finish)
    await page.getByRole('button', { name: FINISH[goal], exact: true }).click();
}

/** Registers one owned weight on the equipment step through the inline add form. */
export async function addWeight(
  page: Page,
  weight: { type: 'dumbbell' | 'kettlebell'; count: 1 | 2; kg: number },
): Promise<void> {
  const noun = weight.type === 'dumbbell' ? 'hantel' : 'kettlebell';
  await page
    .getByRole('button', { name: `Lägg till ${noun}`, exact: true })
    .click();
  await page
    .getByLabel(new RegExp(`^Vikt per ${noun}`))
    .fill(String(weight.kg).replace('.', ','));
  await page
    .getByRole('radio', { name: weight.count === 2 ? 'Par' : `1 ${noun}` })
    .check();
  await page.getByRole('button', { name: 'Lägg till', exact: true }).click();
}
