import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits } from '../rules/equipment';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseList } from './exercises';

export const kneeRehabExercises = exerciseList.filter((exercise) =>
  exerciseMetadata[exercise.id].sources.some((source) =>
    source.url.includes('orthoinfo.aaos.org'),
  ),
);
export const kneeRehabSource =
  'https://www.orthoinfo.org/recovery/knee-conditioning-program/';

// Stomme's selection from AAOS; these are source doses, not individual treatment.
const starterDose: [ExerciseId, number, number][] = [
  ['half-squat', 3, 10],
  ['hamstring-curl', 3, 10],
  ['single-leg-calf-raise', 2, 10],
  ['straight-leg-raise', 3, 10],
  ['side-lying-hip-abduction', 3, 20],
  ['hamstring-stretch', 2, 30],
];
export function kneeConditioningPlan(
  preferences: TrainingPreferences,
): PlannedExercise[] {
  return starterDose.flatMap(([exerciseId, sets, target]) => {
    const exercise = kneeRehabExercises.find((ex) => ex.id === exerciseId);
    const variant = exerciseMetadata[exerciseId].variants.find(
      (v) =>
        v.id === 'bodyweight' &&
        equipmentFits(v.equipment, preferences.equipment),
    );
    if (!exercise || !variant) return [];
    return [
      {
        exerciseId,
        sets,
        target,
        loadIndex: variant.defaultLoadIndex,
        weightKg: 0,
        restSec: 60,
        reason: 'first_time' as const,
        variantId: variant.id,
        sides: exercise.perSide
          ? preferences.rehabSide && preferences.rehabSide !== 'both'
            ? [preferences.rehabSide]
            : ['right' as const, 'left' as const]
          : ['both' as const],
        explanation:
          exercise.unit === 'seconds'
            ? 'AAOS: två hållningar à 30 sekunder per vald sida. Appens set räknar hållningarna. Ändra vid behov.'
            : 'Antal från AAOS knäprogram, utan extra vikt. Kontrollera och anpassa före start.',
      },
    ];
  });
}
