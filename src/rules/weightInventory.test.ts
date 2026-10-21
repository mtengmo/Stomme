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
});
