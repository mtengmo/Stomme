// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { getActiveSession, setMeta } from '../../db/repo';
import { startTrainingSession } from '../../db/training';
import type { PlannedExercise, TrainingPreferences } from '../../domain/types';

const general: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight'],
  weights: [],
};
const plan: PlannedExercise[] = [
  {
    exerciseId: 'push-up',
    sets: 2,
    target: 8,
    loadIndex: 0,
    weightKg: 0,
    restSec: 30,
    reason: 'first_time',
    variantId: 'bodyweight',
    sides: ['both'],
  },
];

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
  await setMeta(getDb(), 'training', general);
});

afterEach(() => cleanup());

/** A prepared regular session, opened on its session route. */
async function begin() {
  const session = await startTrainingSession(
    getDb(),
    general,
    'A',
    plan,
    new Date(),
  );
  window.location.hash = `#/session/${session.id}`;
  return session;
}

describe('session flow', () => {
  it('starts without any question, logs a set, undoes it and rests', async () => {
    const user = userEvent.setup();
    await begin();
    render(<App />);

    // session mode: no bottom navigation, set screen with one primary action
    expect(await screen.findByText('Set 1 av 2')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(window.location.hash).not.toMatch(/kansla|smarta/);
    expect(await getActiveSession(getDb())).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Klar set' }));
    expect(await screen.findByText('Set 1 loggat')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Vila' })).toBeTruthy();
    expect(await getDb().setLogs.count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Ångra' }));
    await waitFor(async () => expect(await getDb().setLogs.count()).toBe(0));
    expect(
      await screen.findByRole('button', { name: 'Klar set' }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Klar set' }));
    await user.click(
      await screen.findByRole('button', { name: 'Hoppa över vila' }),
    );
    expect(await screen.findByText('Set 2 av 2')).toBeTruthy();
  });

  it('resumes where the logs left off', async () => {
    const user = userEvent.setup();
    const session = await begin();
    const { unmount } = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Klar set' }));
    await screen.findByText('Set 1 loggat');
    unmount();

    window.location.hash = `#/session/${session.id}`;
    render(<App />);
    // the rest is not persisted: resume lands on set 2
    expect(await screen.findByText('Set 2 av 2')).toBeTruthy();
  });

  it('aborts after a confirmation and keeps the sets', async () => {
    const user = userEvent.setup();
    await begin();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Klar set' }));
    await screen.findByText('Set 1 loggat');
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    await user.click(
      await screen.findByRole('button', { name: 'Avbryt passet' }),
    );
    await waitFor(async () =>
      expect(await getActiveSession(getDb())).toBeUndefined(),
    );
    expect(await getDb().setLogs.count()).toBe(1);
  });
});
