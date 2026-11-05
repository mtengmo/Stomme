// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import type { ExerciseId, TrainingPreferences } from '../../domain/types';
import { basePlan } from './defaultPlan';
import { ReadyWorkout } from './ReadyWorkout';

const prefs: TrainingPreferences = {
  programId: 'general',
  equipment: ['bodyweight', 'chair', 'support', 'step'],
  experience: 'regular',
};

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

it('offers three Löpstyrka proposals and a random draw, and adds the shown one', async () => {
  await setMeta(getDb(), 'training', prefs);
  window.location.hash = '#/nytt-pass';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Färdiga pass' });
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(
    (screen.getByRole('radio', { name: 'Stark' }) as HTMLInputElement).checked,
  ).toBe(true);
  expect(screen.getByText(/Pogohopp är ett hopp/)).toBeTruthy();
  await user.click(screen.getByRole('radio', { name: 'Grund' }));
  expect(screen.getByText(/Förslag: Grund/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Slumpa nytt förslag' }));
  expect(screen.getByText(/Slumpat förslag/)).toBeTruthy();
  await user.click(
    screen.getByRole('button', {
      name: 'Lägg till färdigt pass: Löpstyrka – slump',
    }),
  );
  await waitFor(async () =>
    expect((await getDb().meta.get('customWorkouts'))?.value).toBeTruthy(),
  );
  const stored = (await getDb().meta.get('customWorkouts'))?.value as {
    name: string;
    exerciseIds: string[];
  }[];
  expect(stored).toHaveLength(1);
  expect(stored[0]?.name).toBe('Löpstyrka – slump');
  expect(stored[0]?.exerciseIds.length).toBeGreaterThanOrEqual(6);
});

it('adds nothing to Mina pass until the add button is used', async () => {
  await setMeta(getDb(), 'training', prefs);
  window.location.hash = '#/nytt-pass';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Färdiga pass' });
  await user.click(screen.getByRole('radio', { name: 'Medel' }));
  expect((await getDb().meta.get('customWorkouts'))?.value ?? []).toEqual([]);
});

it('shows Lättare, Svårare and Ta bort only when the callbacks are given', async () => {
  const plan = ['step-up', 'calf-raise'].map((id) =>
    basePlan(id as ExerciseId, prefs),
  );
  const swaps: string[][] = [];
  const removes: string[] = [];
  const { rerender } = render(
    <ReadyWorkout plan={plan} preferences={prefs} onChange={() => {}} />,
  );
  expect(screen.queryByText('Ta bort')).toBeNull();
  expect(screen.queryByText('Lättare')).toBeNull();
  rerender(
    <ReadyWorkout
      plan={plan}
      preferences={prefs}
      onChange={() => {}}
      onSwap={(from, to) => swaps.push([from, to])}
      onRemove={(id) => removes.push(id)}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /^Svårare än Uppsteg/ }));
  expect(swaps).toEqual([['step-up', 'step-down']]);
  expect(
    screen.queryByRole('button', { name: /^Lättare än Tåhävning på två ben/ }),
  ).toBeNull();
  await user.click(
    screen.getByRole('button', { name: 'Ta bort Tåhävning på två ben' }),
  );
  expect(removes).toEqual(['calf-raise']);
});
