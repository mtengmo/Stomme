import type { ExerciseVariant } from '../content/exerciseMetadata';
import type { TrainingPreferences } from '../domain/types';

export function variantWeights(
  preferences: TrainingPreferences,
  variant: ExerciseVariant,
) {
  const tool = variant.equipment.find(
    (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
  );
  return tool
    ? availableWeights(
        preferences,
        tool.type as 'dumbbell' | 'kettlebell',
        tool.count,
      )
    : [];
}

/** New variants start from owned equipment, never a catalogue's sample kilograms. */
export function startingWeight(
  preferences: TrainingPreferences,
  variant: ExerciseVariant,
): number {
  return variantWeights(preferences, variant)[0]?.totalKg ?? 0;
}

export function weightLabel(totalKg: number, variant: ExerciseVariant): string {
  const tool = variant.equipment.find(
    (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
  );
  if (!tool) return totalKg === 0 ? 'Kroppsvikt' : `${totalKg} kg totalt`;
  if (totalKg <= 0) return 'Ange vikten du använder';
  const perItem = Math.round((totalKg / tool.count) * 1000) / 1000;
  return `${tool.count} × ${perItem} kg${tool.count > 1 ? ` · totalt ${totalKg} kg` : ''}`;
}

export function availableWeights(
  preferences: TrainingPreferences,
  type: 'dumbbell' | 'kettlebell',
  requiredCount: number,
): { totalKg: number; label: string }[] {
  const kilograms = [
    ...(preferences.weights ?? [])
      .filter((item) => item.type === type && item.count >= requiredCount)
      .map((item) => item.kg),
    ...(preferences.adjustableWeights ?? [])
      .filter((item) => item.type === type && item.count >= requiredCount)
      .flatMap((item) => item.settingsKg),
  ];
  return [...new Set(kilograms)]
    .sort((a, b) => a - b)
    .map((kg) => ({
      totalKg: kg * requiredCount,
      label:
        requiredCount === 1
          ? `1 × ${kg} kg`
          : `${requiredCount} × ${kg} kg · totalt ${kg * requiredCount} kg`,
    }));
}
