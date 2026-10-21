import type { TrainingPreferences } from '../domain/types';

export function availableWeights(
  preferences: TrainingPreferences,
  type: 'dumbbell' | 'kettlebell',
  requiredCount: number,
): { totalKg: number; label: string }[] {
  return (preferences.weights ?? [])
    .filter((item) => item.type === type && item.count >= requiredCount)
    .map((item) => ({
      totalKg: item.kg * requiredCount,
      label:
        requiredCount === 1
          ? `1 × ${item.kg} kg`
          : `${requiredCount} × ${item.kg} kg · totalt ${item.kg * requiredCount} kg`,
    }))
    .sort((a, b) => a.totalKg - b.totalKg);
}
