import { rehabImpactExercises } from '../content/rosterSlots';
import type { ExerciseId, TrainingPreferences } from '../domain/types';

/**
 * Whether the exercise pickers and custom-workout builders may offer an
 * exercise in the chosen programme. In rehab, every exercise in
 * `rehabImpactExercises` is left out; the AAOS knee list is narrowed separately.
 * It does not touch rosters
 * or workouts already saved.
 */
export function pickableInProgramme(
  id: ExerciseId,
  preferences: Pick<TrainingPreferences, 'programId'>,
): boolean {
  return !(preferences.programId === 'rehab' && rehabImpactExercises.has(id));
}
