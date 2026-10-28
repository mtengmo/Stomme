import { describe, expect, it } from 'vitest';
import type { ExerciseId, PlannedExercise } from '../domain/types';
import { estimateWorkoutMinutes, shortWorkoutPlan } from './shortWorkout';

const item = (exerciseId: ExerciseId, sets = 3): PlannedExercise => ({
  exerciseId,
  sets,
  target: 10,
  loadIndex: 0,
  weightKg: 0,
  restSec: 60,
  reason: 'first_time',
  sides: ['both'],
});

describe('short workout', () => {
  it('spreads a smaller, two-set plan across the original order without changing dose or rest', () => {
    const full = [
      item('push-up'),
      item('side-plank'),
      item('dead-bug'),
      item('wall-sit'),
      item('bird-dog'),
      item('plank'),
      item('calf-raise'),
      item('crunch'),
      item('squat-jump'),
    ];
    const original = structuredClone(full);
    const result = shortWorkoutPlan(full, 'general');
    expect(result?.plan.map((row) => row.exerciseId)).toEqual([
      'push-up',
      'wall-sit',
      'plank',
      'squat-jump',
    ]);
    expect(
      result?.plan.every((row) => row.sets === 2 && row.restSec === 60),
    ).toBe(true);
    expect(result?.estimatedMinutes).toBeLessThan(
      result?.fullEstimatedMinutes ?? 0,
    );
    expect(full).toEqual(original);
    result?.plan[0]?.sides?.push('left');
    expect(full[0]?.sides).toEqual(['both']);
  });

  it('declines rehab, custom, empty and plans that cannot be shortened', () => {
    expect(shortWorkoutPlan([item('push-up')], 'rehab')).toBeNull();
    expect(shortWorkoutPlan([item('push-up')], 'running', true)).toBeNull();
    expect(shortWorkoutPlan([], 'general')).toBeNull();
    expect(shortWorkoutPlan([item('push-up', 1)], 'general')).toBeNull();
    expect(
      shortWorkoutPlan([item('push-up', 3)], 'running')?.plan[0]?.sets,
    ).toBe(2);
  });

  it('counts reps, manual pace, holds, sides, distance, laps and transitions', () => {
    const rows: PlannedExercise[] = [
      item('push-up'),
      { ...item('pull-up'), sides: undefined },
      { ...item('side-plank'), sides: undefined },
      { ...item('wall-sit'), sides: undefined },
      { ...item('suitcase-carry'), sides: ['left'] },
      item('mountain-climber'),
      item('wall-sit'),
      item('farmer-carry'),
    ];
    expect(estimateWorkoutMinutes(rows)).toBeGreaterThan(
      estimateWorkoutMinutes(rows.slice(0, 1)),
    );
    expect(
      shortWorkoutPlan([{ ...item('push-up', 3), sides: undefined }], 'general')
        ?.plan[0]?.sides,
    ).toBeUndefined();
    expect(estimateWorkoutMinutes([{ ...item('push-up'), sets: 0 }])).toBe(0);
  });
});
