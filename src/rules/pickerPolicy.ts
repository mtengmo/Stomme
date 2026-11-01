import { impactExercises } from '../content/rosterSlots';
import type { ExerciseId, TrainingPreferences } from '../domain/types';

/**
 * Whether the exercise picker may offer an exercise in the chosen programme.
 * Rehab never offers jumping and other impact exercises, whatever the focus.
 */
export function pickableInProgramme(
  id: ExerciseId,
  preferences: Pick<TrainingPreferences, 'programId'>,
): boolean {
  return !(preferences.programId === 'rehab' && impactExercises.has(id));
}
