// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { PAIN_COPY } from '../../content/copy';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { recordTrainingCheckin, startTrainingSession } from '../../db/training';
import type {
  PlannedExercise,
  Session,
  TrainingPreferences,
} from '../../domain/types';
import { hurtLastTime } from '../../rules/training';
import { defaultPlan } from '../training/defaultPlan';
import { PainValve } from './PainValve';

const general: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight'],
  weights: [],
};
function item(exerciseId: PlannedExercise['exerciseId']): PlannedExercise {
  return {
    exerciseId,
    sets: 1,
    target: 8,
    loadIndex: 0,
    weightKg: 0,
    restSec: 30,
    reason: 'first_time',
    variantId: 'bodyweight',
    sides: ['both'],
  };
}
const plan = [item('push-up'), item('knee-push-up')];

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PainValve', () => {
  it('shows the red-flag line, the easier option and three choices, without diagnosing', async () => {
    const onSkip = vi.fn();
    const onAbort = vi.fn();
    const onContinue = vi.fn();
    const { container } = render(
      <PainValve
        exerciseName="Armhävning"
        easierText="Gör den mot en vägg."
        easierExerciseName="Knäarmhävning"
        busy={false}
        onBack={() => undefined}
        onSkip={onSkip}
        onAbort={onAbort}
        onContinue={onContinue}
      />,
    );
    expect(
      screen.getByText(
        'Vid skarp smärta, svullnad eller om en led låser sig: avbryt och kontakta vården (1177).',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Gör den mot en vägg.')).toBeTruthy();
    expect(screen.getByText(/Knäarmhävning/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/säker|diagnos/i);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Hoppa över övningen' }),
    );
    await user.click(screen.getByRole('button', { name: 'Avbryt passet' }));
    await user.click(screen.getByRole('button', { name: 'Fortsätt ändå' }));
    expect(
      [onSkip, onAbort, onContinue].map((fn) => fn.mock.calls.length),
    ).toEqual([1, 1, 1]);
  });

  it('omits the easier exercise line when none is linked and disables choices while busy', () => {
    render(
      <PainValve
        exerciseName="Knäarmhävning"
        easierText="Håll benen lägre."
        busy
        onBack={() => undefined}
        onSkip={() => undefined}
        onAbort={() => undefined}
        onContinue={() => undefined}
      />,
    );
    expect(screen.queryByText(/byta till/)).toBeNull();
    for (const name of [
      'Hoppa över övningen',
      'Avbryt passet',
      'Fortsätt ändå',
      'Tillbaka',
    ])
      expect(
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
  });
});

describe('PainValve back and errors', () => {
  const noop = () => undefined;
  it('Tillbaka only calls onBack', async () => {
    const onBack = vi.fn();
    const onSkip = vi.fn();
    render(
      <PainValve
        exerciseName="Armhävning"
        easierText="x"
        busy={false}
        onBack={onBack}
        onSkip={onSkip}
        onAbort={noop}
        onContinue={noop}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Tillbaka' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('shows the write error only when there is one', () => {
    const props = {
      exerciseName: 'Armhävning',
      easierText: 'x',
      busy: false,
      onBack: noop,
      onSkip: noop,
      onAbort: noop,
      onContinue: noop,
    };
    const { rerender } = render(<PainValve {...props} />);
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(<PainValve {...props} error />);
    expect(screen.getByRole('alert').textContent).toBe(PAIN_COPY.error);
  });
});

describe('the valve in a regular session', () => {
  async function open(prefs: TrainingPreferences = general) {
    const session = await startTrainingSession(
      getDb(),
      prefs,
      'A',
      plan,
      new Date(),
    );
    window.location.hash = `#/session/${session.id}`;
    render(<App />);
    return session;
  }
  const feedback = async (id: string) =>
    (await getDb().sessions.get(id))?.feedback;

  it('offers "Det gör ont" instead of the rehab report, and continuing marks only that exercise', async () => {
    const user = userEvent.setup();
    const session = await open();
    await screen.findByRole('button', { name: 'Klar set' });
    expect(screen.queryByRole('button', { name: /Rapportera/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Det gör ont' }));
    expect(screen.getByText(/kontakta vården \(1177\)/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Fortsätt ändå' }));
    await screen.findByRole('button', { name: 'Klar set' });
    expect(await feedback(session.id)).toEqual({ 'push-up': { hurt: true } });
    expect(screen.getByRole('button', { name: /Gjorde ont/ })).toBeTruthy();
    expect(window.location.hash).not.toMatch(/kansla|smarta/);
  });

  it('skips the exercise and marks it, then finishes without any /kansla step', async () => {
    const user = userEvent.setup();
    const session = await open();
    await screen.findByRole('button', { name: 'Klar set' });
    await user.click(screen.getByRole('button', { name: 'Det gör ont' }));
    await user.click(
      screen.getByRole('button', { name: 'Hoppa över övningen' }),
    );
    expect(await feedback(session.id)).toEqual({
      'push-up': { skipped: true, hurt: true },
    });
    // The first write may still be settling; retry until the skip is stored.
    await waitFor(async () => {
      await user.click(
        await screen.findByRole('button', { name: 'Hoppa över övningen' }),
      );
      expect((await feedback(session.id))?.['knee-push-up']?.skipped).toBe(
        true,
      );
    });
    const finish = await screen.findByRole('button', { name: 'Avsluta pass' });
    expect(window.location.hash).not.toMatch(/kansla/);
    await user.click(finish);
    await waitFor(async () =>
      expect((await getDb().sessions.get(session.id))?.status).toBe(
        'completed',
      ),
    );
    expect(window.location.hash).toBe('#/');
    expect(
      (await feedback(session.id))?.['knee-push-up']?.hurt,
    ).toBeUndefined();
  });

  it('aborts the session as pain_stop and shows the stop screen', async () => {
    const user = userEvent.setup();
    const session = await open();
    await screen.findByRole('button', { name: 'Klar set' });
    await user.click(screen.getByRole('button', { name: 'Det gör ont' }));
    await user.click(screen.getByRole('button', { name: 'Avbryt passet' }));
    await waitFor(() =>
      expect(window.location.hash).toBe(`#/stopp/${session.id}`),
    );
    expect(await getDb().sessions.get(session.id)).toMatchObject({
      status: 'aborted',
      abortReason: 'pain_stop',
      feedback: { 'push-up': { hurt: true } },
    });
  });

  it('Tillbaka returns to the set and writes nothing', async () => {
    const user = userEvent.setup();
    const session = await open();
    await screen.findByRole('button', { name: 'Klar set' });
    await user.click(screen.getByRole('button', { name: 'Det gör ont' }));
    await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
    await screen.findByRole('button', { name: 'Klar set' });
    expect(await feedback(session.id)).toEqual({});
  });

  it('shows the error when a valve write fails', async () => {
    const user = userEvent.setup();
    await open();
    await screen.findByRole('button', { name: 'Klar set' });
    await user.click(screen.getByRole('button', { name: 'Det gör ont' }));
    vi.spyOn(getDb().sessions, 'get').mockRejectedValue(new Error('x'));
    vi.spyOn(getDb().sessions, 'update').mockRejectedValue(new Error('x'));
    await user.click(screen.getByRole('button', { name: 'Fortsätt ändå' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      PAIN_COPY.error,
    );
  });

  it('marks the exercise hurt when the abort dialog is used for pain', async () => {
    const user = userEvent.setup();
    const session = await open();
    await screen.findByRole('button', { name: 'Klar set' });
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    await user.click(
      await screen.findByRole('button', { name: PAIN_COPY.stopAbortPain }),
    );
    await waitFor(() =>
      expect(window.location.hash).toBe(`#/stopp/${session.id}`),
    );
    const stored = await getDb().sessions.get(session.id);
    expect(stored).toMatchObject({
      abortReason: 'pain_stop',
      feedback: { 'push-up': { hurt: true } },
    });
    expect(hurtLastTime('push-up', 'general', [stored as Session])).toBe(true);
    const next = defaultPlan(general, 'A', [stored as Session], []).find(
      (p) => p.exerciseId === 'push-up',
    );
    expect(next?.reason).not.toBe('increase_amount');
  });

  it('keeps rehab on its own report and without the valve', async () => {
    const session = await open({ ...general, programId: 'rehab' });
    await waitFor(() => expect(window.location.hash).toMatch(/kansla.*before/));
    await recordTrainingCheckin(getDb(), session.id, 'before', {
      recordedAt: new Date().toISOString(),
      feeling: 'ready',
      symptoms: null,
    });
    window.location.hash = `#/session/${session.id}`;
    await screen.findByRole('button', { name: 'Klar set' });
    expect(screen.getByRole('button', { name: /Rapportera/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Det gör ont' })).toBeNull();
  });
});
