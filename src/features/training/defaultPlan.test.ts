import { describe, expect, it } from 'vitest';
import type {
  PlannedExercise,
  Session,
  TrainingPreferences,
} from '../../domain/types';
import { defaultPlan } from './TrainingPreview';

const prefs: TrainingPreferences = {
  programId: 'rehab',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support', 'band'],
  rehabFocus: 'knee-physio',
  rehabSide: 'both',
};
const row = (sets: number): PlannedExercise => ({
  exerciseId: 'quad-set',
  sets,
  target: 7,
  loadIndex: 0,
  weightKg: 0,
  restSec: 60,
  reason: 'first_time',
  variantId: 'bodyweight',
  sides: ['right', 'left'],
});
const session = (focus: Session['rehabFocus'], sets: number): Session => ({
  id: `s${sets}`,
  templateId: 'A',
  programId: 'rehab',
  rehabFocus: focus,
  date: '2026-01-02',
  startedAt: '2026-01-02T10:00:00Z',
  status: 'completed',
  programWeek: 1,
  plan: [row(sets)],
  feedback: {},
});

describe('rehab start plan order', () => {
  it('prefills only a fresh start', () => {
    expect(defaultPlan(prefs, 'A', [], [])).toHaveLength(9);
  });
  it('prefers the last session for the same focus over the prefill', () => {
    const plan = defaultPlan(
      prefs,
      'A',
      [session('knee', 5), session('knee-physio', 3)],
      [],
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]?.sets).toBe(3);
  });
  it('prefers a saved plan over a session and the prefill', () => {
    const plan = defaultPlan(prefs, 'A', [session('knee-physio', 3)], [], {
      'knee-physio': [row(4)],
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]?.sets).toBe(4);
  });
  it('ignores a saved plan of another focus', () => {
    expect(defaultPlan(prefs, 'A', [], [], { knee: [row(4)] })).toHaveLength(9);
  });
  it('keeps custom and AAOS behaviour', () => {
    expect(
      defaultPlan({ ...prefs, rehabFocus: 'custom' }, 'A', [], []),
    ).toEqual([]);
    expect(
      defaultPlan({ ...prefs, rehabFocus: 'knee' }, 'A', [], []),
    ).toHaveLength(6);
  });
});
