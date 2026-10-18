import { expect, type Page } from '@playwright/test';

export type Stage =
  | 'preview'
  | 'set-first'
  | 'set-side'
  | 'set-timed'
  | 'set-after-skip'
  | 'rest'
  | 'effort'
  | 'summary';

const ACTION = /^(Klar set|Hoppa över vila|Lagom|Avsluta pass)$/;

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
  await page.getByRole('link', { name: 'Starta pass' }).click();
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();
  await onStage('preview');
  await page.getByRole('button', { name: 'Starta pass' }).click();
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
    await action.waitFor();
    const name = (await action.innerText()).trim();

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
  await page.getByRole('link', { name: 'Starta pass' }).click();
  await page.getByRole('button', { name: 'Starta pass' }).click();
  const frame = page.locator('[data-step]');
  const before = await frame.getAttribute('data-step');
  await page.getByRole('button', { name: 'Hoppa över övningen' }).click();
  await expect(frame).not.toHaveAttribute('data-step', before ?? '');
  await expect(page.getByRole('status')).toContainText('Hoppade över');
  await onStage('set-after-skip');
}
