import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { availableWeights } from './weightInventory';

const preferences: TrainingPreferences = {
  programId: 'running',
  experience: 'some',
  equipment: ['bodyweight', 'dumbbell-2', 'kettlebell-1'],
  weights: [
    { type: 'dumbbell', kg: 5, count: 2 },
    { type: 'dumbbell', kg: 10, count: 2 },
    { type: 'kettlebell', kg: 16, count: 1 },
  ],
};

describe('owned weight choices', () => {
  it('converts per-implement weights to honest total loads', () => {
    expect(availableWeights(preferences, 'dumbbell', 2)).toEqual([
      { totalKg: 10, label: '2 × 5 kg · totalt 10 kg' },
      { totalKg: 20, label: '2 × 10 kg · totalt 20 kg' },
    ]);
    expect(availableWeights(preferences, 'kettlebell', 1)).toEqual([
      { totalKg: 16, label: '1 × 16 kg' },
    ]);
    expect(availableWeights(preferences, 'kettlebell', 2)).toEqual([]);
  });

  it('offers one dumbbell only for single-dumbbell variants', () => {
    const one: TrainingPreferences = {
      ...preferences,
      weights: [{ type: 'dumbbell', kg: 8, count: 1 }],
    };
    expect(availableWeights(one, 'dumbbell', 1)).toEqual([
      { totalKg: 8, label: '1 × 8 kg' },
    ]);
    expect(availableWeights(one, 'dumbbell', 2)).toEqual([]);
  });

  it('never pairs two unequal dumbbells into one two-implement load', () => {
    const unequal: TrainingPreferences = {
      ...preferences,
      weights: [
        { type: 'dumbbell', kg: 5, count: 1 },
        { type: 'dumbbell', kg: 10, count: 1 },
      ],
    };
    expect(availableWeights(unequal, 'dumbbell', 2)).toEqual([]);
    expect(availableWeights(unequal, 'dumbbell', 1)).toHaveLength(2);
  });

  it('lets a matching pair serve a single-implement variant', () => {
    expect(availableWeights(preferences, 'dumbbell', 1)).toEqual([
      { totalKg: 5, label: '1 × 5 kg' },
      { totalKg: 10, label: '1 × 10 kg' },
    ]);
  });

  it('offers nothing when no weights are entered or the inventory is deleted', () => {
    const { weights: _removed, ...none } = preferences;
    expect(availableWeights(none, 'dumbbell', 2)).toEqual([]);
    expect(availableWeights({ ...none, weights: [] }, 'kettlebell', 1)).toEqual(
      [],
    );
  });
});
