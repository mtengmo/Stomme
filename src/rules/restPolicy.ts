import type { ExerciseId, TrainingPreferences } from '../domain/types';
import { heavyStartAllowed } from './levelPolicy';

/** Rest between sets and between exercises in the general programme. */
export const GENERAL_REST_SEC = 20;
/** Heavy compound lifts need a little longer. */
export const HEAVY_REST_SEC = 30;
/** Knee rehab and the physio programme keep their own, longer rest. */
export const REHAB_REST_SEC = 60;

/**
 * Starting rest for an exercise. Rest between exercises is the rest of the
 * exercise just finished, so one value covers both. Saved routines keep what
 * the user saved; this only seeds new plans.
 */
export function restSecFor(
  id: ExerciseId,
  preferences: Pick<TrainingPreferences, 'programId'>,
): number {
  if (preferences.programId === 'rehab') return REHAB_REST_SEC;
  return heavyStartAllowed(id) ? HEAVY_REST_SEC : GENERAL_REST_SEC;
}
