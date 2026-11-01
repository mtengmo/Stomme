import { impactExercises } from '../content/rosterSlots';
import type { ExerciseId, TrainingPreferences } from '../domain/types';

/**
 * Whether the exercise pickers and custom-workout builders may offer an
 * exercise in the chosen programme. In rehab, every exercise in
 * `impactExercises` is left out; the AAOS knee list is narrowed separately.
 * It does not touch rosters (they use `impactExercises` with pain on record)
 * or workouts already saved.
 */
export function pickableInProgramme(
  id: ExerciseId,
  preferences: Pick<TrainingPreferences, 'programId'>,
): boolean {
  return !(preferences.programId === 'rehab' && impactExercises.has(id));
}
