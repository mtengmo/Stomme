import { describe, expect, it } from 'vitest';
import { exerciseList } from '../content/exercises';
import { exerciseMuscles } from '../content/muscles';
import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../domain/types';
import { inventory } from '../test/inventory';
import { regionOfExercise, selectionSummary } from './selectionSummary';

const planFor =
  (_preferences: TrainingPreferences) => (ids: readonly ExerciseId[]) =>
    ids.map(
      (exerciseId) =>
        ({
          exerciseId,
          sets: 2,
          target: 8,
          restSec: 60,
          loadIndex: 0,
        }) as PlannedExercise,
    );

describe('selectionSummary', () => {
  const prefs: TrainingPreferences = {
    programId: 'general',
    experience: 'some',
    ...inventory({ dumbbells: [[5, 2]] }),
  };
  const byRegion = (region: string, n: number) =>
    exerciseList
      .filter((exercise) => regionOfExercise(exercise.id) === region)
      .slice(0, n)
      .map((exercise) => exercise.id);

  it('counts picks and splits them per region in region order', () => {
    const ids = [...byRegion('core', 1), ...byRegion('legs', 2)];
    const summary = selectionSummary(ids, prefs, planFor(prefs));
    expect(summary.count).toBe(3);
    expect(summary.regions.map((r) => [r.id, r.count])).toEqual([
      ['legs', 2],
      ['core', 1],
    ]);
    expect(summary.minutes).toBeGreaterThan(0);
  });

  it('is empty before the first pick and hides the estimate without setup or in rehab', () => {
    expect(selectionSummary([], prefs, planFor(prefs))).toEqual({
      count: 0,
      regions: [],
    });
    const ids = byRegion('legs', 2);
    expect(
      selectionSummary(ids, undefined, planFor(prefs)).minutes,
    ).toBeUndefined();
    expect(
      selectionSummary(ids, { ...prefs, programId: 'rehab' }, planFor(prefs))
        .minutes,
    ).toBeUndefined();
  });
});

describe('selectionSummary without a plan source', () => {
  const prefs: TrainingPreferences = {
    programId: 'general',
    experience: 'some',
    ...inventory({ dumbbells: [[5, 2]] }),
  };
  const ids = exerciseList.slice(0, 2).map((exercise) => exercise.id);
  it('has no estimate when planFor is missing or returns nothing', () => {
    expect(selectionSummary(ids, prefs).minutes).toBeUndefined();
    expect(
      selectionSummary(ids, prefs, () => undefined).minutes,
    ).toBeUndefined();
  });
});

describe('selectionSummary for an exercise without primary muscles', () => {
  it('counts the pick but gives it no region', () => {
    const id = exerciseList[0]?.id as ExerciseId;
    const original = exerciseMuscles[id].primary;
    exerciseMuscles[id].primary = [];
    try {
      expect(regionOfExercise(id)).toBeUndefined();
      expect(selectionSummary([id])).toEqual({ count: 1, regions: [] });
    } finally {
      exerciseMuscles[id].primary = original;
    }
  });
});
