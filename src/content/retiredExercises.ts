import type { Exercise, ExerciseId } from '../domain/types';
import { exerciseList } from './exercises';

/**
 * Exercises retired from new use because another catalogue entry covers the
 * same movement. Retired is not deleted: the id stays in the catalogue, types,
 * figures and audit log, and still resolves wherever an id is stored (session
 * history, saved workouts, favourites, backups, the detail page by direct
 * link). Retired exercises are left out of the library list, the pickers, the
 * suggestion paths (rosters, focus, quick start, next-level swaps) and
 * programme generation.
 *
 * `replacedBy` lists the active exercises that cover the movement.
 */
export const retiredExercises = {
  'blast-off-push-up': {
    replacedBy: ['push-up', 'knee-push-up'],
    reason:
      'Utgått: samma press som armhävning och knäarmhävning. / Retired: same press as push-up and knee push-up.',
  },
  'squat-curl': {
    replacedBy: ['goblet-squat', 'biceps-curl'],
    reason:
      'Utgått: knäböj och bicepscurl finns som egna övningar. / Retired: goblet squat and biceps curl exist as separate exercises.',
  },
  'fast-feet': {
    replacedBy: ['knee-drive'],
    reason:
      'Utgått: knälyft täcker snabba fotsteg. / Retired: knee drive covers quick feet.',
  },
} as const satisfies Partial<
  Record<ExerciseId, { replacedBy: readonly ExerciseId[]; reason: string }>
>;

export const retiredExerciseIds: ReadonlySet<ExerciseId> = new Set(
  Object.keys(retiredExercises) as ExerciseId[],
);

export function isRetiredExercise(id: ExerciseId): boolean {
  return retiredExerciseIds.has(id);
}

/** The catalogue without retired exercises: the source for everything a user can newly choose. */
export const activeExerciseList: readonly Exercise[] = exerciseList.filter(
  (exercise) => !retiredExerciseIds.has(exercise.id),
);
