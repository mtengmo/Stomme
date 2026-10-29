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
