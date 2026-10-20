import { describe, expect, it } from 'vitest';
import { validateTrainingPlan } from '../db/training';
import type { TrainingPreferences } from '../domain/types';
import { kneeConditioningPlan } from './kneeRehab';

const preferences: TrainingPreferences = {
  programId: 'rehab',
  experience: 'new',
  equipment: ['bodyweight', 'support'],
  rehabFocus: 'knee',
  rehabSide: 'left',
};
describe('general knee starter', () => {
  it('provides six valid source-dosed movements with correct units and selected sides', () => {
    const plan = kneeConditioningPlan(preferences);
    expect(plan).toHaveLength(6);
    expect(validateTrainingPlan(plan)).toBe(true);
    expect(
      plan.find((p) => p.exerciseId === 'hamstring-stretch'),
    ).toMatchObject({ sets: 2, target: 30, sides: ['left'] });
    expect(plan.find((p) => p.exerciseId === 'half-squat')).toMatchObject({
      sets: 3,
      target: 10,
      sides: ['both'],
    });
    expect(plan.every((p) => p.weightKg === 0)).toBe(true);
  });
  it('omits unavailable support exercises and returns independent editable plans', () => {
    const plan = kneeConditioningPlan({
      ...preferences,
      equipment: ['bodyweight'],
      rehabSide: 'both',
    });
    expect(plan).toHaveLength(3);
    expect(validateTrainingPlan(plan)).toBe(true);
    expect(plan.every((p) => p.sides?.length === 2)).toBe(true);
    plan[0]?.sides?.pop();
    expect(kneeConditioningPlan(preferences)[3]?.sides).toEqual(['left']);
  });
});
