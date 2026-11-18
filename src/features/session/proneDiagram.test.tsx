// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { startTrainingSession } from '../../db/training';
import type { PlannedExercise, TrainingPreferences } from '../../domain/types';
import { STANCE_DIAGRAM_IDS } from '../../figures/StanceDiagrams';
import { ExerciseCardBody } from '../exercise/ExerciseCard';

const IDS = [
  'knee-push-up',
  'decline-push-up',
  'diamond-push-up',
  'plank-arm-lift',
  ...STANCE_DIAGRAM_IDS,
] as const;

const general: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight', 'support', 'chair', 'step'],
  weights: [
    { type: 'dumbbell', kg: 8, count: 2 },
    { type: 'kettlebell', kg: 8, count: 1 },
  ],
};

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
  await setMeta(getDb(), 'training', general);
});
afterEach(() => cleanup());

describe('prone placement diagrams in the app', () => {
  it.each(IDS)('%s: the exercise card shows its diagram', (id) => {
    render(<ExerciseCardBody exercise={exercises[id]} />);
    expect(screen.getByTestId(`placement-diagram-${id}`)).toBeTruthy();
  });

  it('the exercise card has no placement diagram for other exercises', () => {
    render(<ExerciseCardBody exercise={exercises['dead-bug']} />);
    expect(screen.queryByTestId(/^placement-diagram-/)).toBeNull();
  });

  it.each(IDS)(
    '%s: the set screen shows its diagram under Hur gör man?',
    async (id) => {
      const variant = exerciseMetadata[id].variants[0];
      const weighted = variant?.equipment.some(
        (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
      );
      const plan: PlannedExercise[] = [
        {
          exerciseId: id,
          sets: 1,
          target: 8,
          loadIndex: 0,
          weightKg: weighted ? 8 : 0,
          restSec: 30,
          reason: 'first_time',
          variantId: variant?.id ?? 'bodyweight',
          sides:
            exerciseMetadata[id].sidePolicy === 'choose-side'
              ? ['left']
              : ['both'],
        },
      ];
      const session = await startTrainingSession(
        getDb(),
        general,
        'A',
        plan,
        new Date(),
      );
      window.location.hash = `#/session/${session.id}`;
      render(<App />);
      const region = await screen.findByRole('region', { name: 'Teknik' });
      expect(
        within(region).getByTestId(`placement-diagram-${id}`),
      ).toBeTruthy();
    },
  );
});
