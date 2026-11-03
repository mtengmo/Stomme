// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { TrainingPreferences } from '../../domain/types';
import { defaultPlan } from './defaultPlan';
import { ReadyWorkout } from './ReadyWorkout';

afterEach(cleanup);

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support'],
  weights: [
    { type: 'dumbbell', kg: 4, count: 2 },
    { type: 'dumbbell', kg: 8, count: 2 },
  ],
};

it('shows the heavy-start note in the overview but not the generic start line', () => {
  const plan = defaultPlan(preferences, 'A', [], []);
  render(
    <ReadyWorkout plan={plan} preferences={preferences} onChange={() => {}} />,
  );
  expect(screen.getAllByText(/Tung startvikt/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/^Startförslag/)).toBeNull();
});

it('omits the whole-body coverage warning for an intentional focus', () => {
  const plan = defaultPlan(preferences, 'A', [], [], undefined, undefined, {
    id: 'push',
  });
  render(
    <ReadyWorkout
      plan={plan}
      preferences={preferences}
      fullBody={false}
      onChange={() => {}}
    />,
  );
  expect(screen.queryByText(/Saknas:/)).toBeNull();
});

it('has no E-codes, shows the beginner note and the set legend without history', () => {
  const plan = defaultPlan(preferences, 'A', [], []);
  render(
    <ReadyWorkout
      plan={plan}
      preferences={preferences}
      hasHistory={false}
      onChange={() => {}}
    />,
  );
  expect(screen.queryByText(/\bE\d{2}\b/)).toBeNull();
  expect(
    screen.getByText(
      'Startförslag för din nivå. Ändra före start om det behövs.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/Antal bygger på/)).toBeNull();
  expect(
    screen.getByText(
      '2 × 10 = 2 set med 10 repetitioner. 60 s vila mellan seten.',
    ),
  ).toBeTruthy();
});

it('keeps the old note when there is completed history', () => {
  const plan = defaultPlan(preferences, 'A', [], []);
  render(
    <ReadyWorkout plan={plan} preferences={preferences} onChange={() => {}} />,
  );
  expect(screen.getByText(/Antal bygger på/)).toBeTruthy();
  expect(screen.queryByText(/2 × 10 = /)).toBeNull();
});

it('warns about missing coverage for a free whole-body pass but not for a programme pass', () => {
  const plan = defaultPlan(preferences, 'A', [], []).filter(
    (item) =>
      item.exerciseId === 'glute-bridge' || item.exerciseId === 'wall-sit',
  );
  const { rerender } = render(
    <ReadyWorkout plan={plan} preferences={preferences} onChange={() => {}} />,
  );
  expect(screen.getByText(/Saknas:/)).toBeTruthy();
  rerender(
    <ReadyWorkout
      plan={plan}
      preferences={preferences}
      programPass
      onChange={() => {}}
    />,
  );
  expect(screen.queryByText(/Saknas:/)).toBeNull();
});
