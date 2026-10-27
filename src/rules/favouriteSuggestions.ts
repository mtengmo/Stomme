import { exerciseMetadata } from '../content/exerciseMetadata';
import type { ExerciseId, TrainingPreferences } from '../domain/types';
import { equipmentFits } from './equipment';
import { allowedLevels, movementSlots } from './levelPolicy';

export function favouriteAlternatives(
  id: ExerciseId,
  favourites: readonly ExerciseId[],
  selected: readonly ExerciseId[],
  preferences: TrainingPreferences,
): ExerciseId[] {
  if (preferences.programId === 'rehab' || !movementSlots[id]) return [];
  const levels = allowedLevels(preferences.experience);
  return [...new Set(favourites)].filter(
    (candidate) =>
      candidate !== id &&
      !selected.includes(candidate) &&
      movementSlots[candidate] === movementSlots[id] &&
      exerciseMetadata[candidate]?.variants.some(
        (variant) =>
          levels.includes(variant.technicalLevel) &&
          equipmentFits(variant.equipment, preferences.equipment),
      ),
  );
}
