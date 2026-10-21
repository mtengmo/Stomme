import { exerciseMetadata } from '../content/exerciseMetadata';
import type { ExerciseId, TrainingPreferences } from '../domain/types';
import { equipmentFits } from './equipment';

/** Explicit movement slots prevent a liked curl replacing a squat or row. */
const slots: Partial<Record<ExerciseId, string>> = {
  'goblet-squat': 'squat',
  'goblet-chair-squat': 'squat',
  'half-squat': 'squat',
  'dumbbell-rdl': 'hinge',
  'kettlebell-deadlift': 'hinge',
  'single-leg-rdl': 'hinge',
  'supported-row': 'row',
  'floor-press': 'horizontal-press',
  'kettlebell-floor-press': 'horizontal-press',
  'shoulder-press': 'overhead-press',
  'kettlebell-press': 'overhead-press',
  'farmer-carry': 'carry',
  'suitcase-carry': 'carry',
  'kettlebell-rack-carry': 'carry',
  'reverse-lunge': 'split-leg',
  'forward-lunge': 'split-leg',
  'split-squat': 'split-leg',
  'biceps-curl': 'curl',
  'hammer-curl': 'curl',
  'glute-bridge': 'bridge',
  'single-leg-floor-bridge': 'bridge',
  'dead-bug': 'core',
  'bird-dog': 'core',
  'side-plank': 'core',
};

export function favouriteAlternatives(
  id: ExerciseId,
  favourites: readonly ExerciseId[],
  selected: readonly ExerciseId[],
  preferences: TrainingPreferences,
): ExerciseId[] {
  if (preferences.programId === 'rehab' || !slots[id]) return [];
  const levels =
    preferences.experience === 'new'
      ? ['basic']
      : preferences.experience === 'some'
        ? ['basic', 'practiced']
        : ['basic', 'practiced', 'technical'];
  return [...new Set(favourites)].filter(
    (candidate) =>
      candidate !== id &&
      !selected.includes(candidate) &&
      slots[candidate] === slots[id] &&
      exerciseMetadata[candidate]?.variants.some(
        (variant) =>
          levels.includes(variant.technicalLevel) &&
          equipmentFits(variant.equipment, preferences.equipment),
      ),
  );
}
