import { exerciseMetadata } from '../content/exerciseMetadata';
import { readyWorkouts } from '../content/readyWorkouts';
import { plyometricIds, proposals } from '../content/runningProposals';
import type {
  ExerciseId,
  ProgramPass,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits } from './equipment';

/**
 * One programme pass from a ready-made workout, or null for an unknown id
 * (bodyweight always fits, so a known workout is never empty). `exerciseIds` is a copy.
 *
 * Löpstyrka uses the fixed proposals: Grund for a beginner, Medel otherwise.
 * Fixed workouts are filtered by equipment and, for a beginner, lose the jump.
 * Focus 'lower' / template 'A' keeps the rest rules between muscles right for
 * these leg workouts. Ready passes sit outside the beginner set and the wide
 * pool on purpose (see db/program.ts).
 */
export function readyProgramPass(
  readyId: string,
  preferences: TrainingPreferences,
): ProgramPass | null {
  const workout = readyWorkouts.find((w) => w.id === readyId);
  if (!workout) return null;
  let ids: ExerciseId[];
  if (workout.id === 'running-strength') {
    const wanted = preferences.experience === 'new' ? 'grund' : 'medel';
    ids = proposals(preferences)
      .filter((p) => p.id === wanted)
      .flatMap((p) => p.exerciseIds);
  } else {
    ids = workout.exerciseIds.filter(
      (id) =>
        exerciseMetadata[id].variants.some((v) =>
          equipmentFits(v.equipment, preferences),
        ) && !(preferences.experience === 'new' && plyometricIds.has(id)),
    );
  }
  return {
    focus: 'lower',
    template: 'A',
    exerciseIds: ids,
    ready: { id: workout.id, name: workout.name },
  };
}
