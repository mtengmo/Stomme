import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exerciseList } from '../../content/exercises';
import { kneeRehabExercises } from '../../content/kneeRehab';
import { rehabGroup } from '../../content/programmes';
import { validateTrainingPlan } from '../../db/training';
import type { PlannedExercise, TrainingPreferences } from '../../domain/types';
import { equipmentFits } from '../../rules/equipment';
import { basePlan } from './defaultPlan';
import { startProblems } from './startReadiness';

const prefs: TrainingPreferences = {
  programId: 'general',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support'],
};
const good = (): PlannedExercise[] => [basePlan('glute-bridge', prefs)];

// The expression `ready` had before the reasons were introduced.
function oldReady(plan: PlannedExercise[], preferences: TrainingPreferences) {
  return (
    validateTrainingPlan(plan) &&
    !(
      preferences.programId === 'rehab' &&
      rehabGroup(preferences) === 'aaos' &&
      plan.some(
        (item) => !kneeRehabExercises.some((ex) => ex.id === item.exerciseId),
      )
    ) &&
    plan.every((item) => {
      const variant = exerciseMetadata[item.exerciseId].variants.find(
        (v) => v.id === item.variantId,
      );
      return (
        !!variant && equipmentFits(variant.equipment, preferences.equipment)
      );
    })
  );
}

describe('startProblems', () => {
  it('is empty for a good plan', () => {
    expect(startProblems(good(), prefs)).toEqual([]);
  });
  it('names the missing exercise, count and set', () => {
    expect(startProblems([], prefs)).toEqual(['Lägg till minst en övning.']);
    const [row] = good() as [PlannedExercise];
    expect(startProblems([{ ...row, sets: 0 }], prefs)[0]).toMatch(
      /^Ange set för /,
    );
    expect(startProblems([{ ...row, target: 0 }], prefs)[0]).toMatch(
      /^Ange antal för /,
    );
  });
  it('asks for a weight on a weighted variant', () => {
    const weighted: TrainingPreferences = {
      ...prefs,
      equipment: ['bodyweight', 'dumbbell-2'],
    };
    const plan = [basePlan('floor-press', weighted)];
    expect(startProblems(plan, weighted)).toEqual([
      'Ange vikt för Hantelpress på golv.',
    ]);
  });
  it('flags a variant that does not fit, duplicates and too many exercises', () => {
    const [row] = good() as [PlannedExercise];
    expect(
      startProblems([{ ...row, variantId: 'kettlebell' }], prefs)[0],
    ).toMatch(/välj en variant som passar din utrustning/);
    expect(startProblems([row, row], prefs)[0]).toMatch(/flera gånger/);
    const many = exerciseList
      .slice(0, 13)
      .map((exercise) => ({ ...row, exerciseId: exercise.id }));
    expect(startProblems(many, prefs)).toContain('Högst 12 övningar.');
  });
  it('explains an empty focused plan and AAOS outsiders', () => {
    expect(startProblems([], { ...prefs, bodyParts: ['legs'] })[0]).toMatch(
      /^Inga övningar passar/,
    );
    const aaos: TrainingPreferences = {
      ...prefs,
      programId: 'rehab',
      rehabFocus: 'knee',
    };
    expect(startProblems(good(), aaos).join()).toMatch(/AAOS-samlingen/);
  });
  it('is empty exactly when the old ready expression was true', () => {
    const [row] = good() as [PlannedExercise];
    const aaos: TrainingPreferences = {
      ...prefs,
      programId: 'rehab',
      rehabFocus: 'knee',
    };
    const plans: PlannedExercise[][] = [
      [],
      good(),
      [{ ...row, sets: 0 }],
      [{ ...row, weightKg: 3 }],
      [{ ...row, variantId: 'kettlebell' }],
      [{ ...row, loadIndex: 99 }],
      [row, row],
    ];
    for (const preferences of [prefs, aaos])
      for (const plan of plans)
        expect(startProblems(plan, preferences).length === 0).toBe(
          oldReady(plan, preferences),
        );
  });
});
