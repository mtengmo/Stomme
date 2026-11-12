import type { ExerciseId } from '../domain/types';
import { exerciseReferences } from './exerciseReferences';
import { exerciseList } from './exercises';
import { rehabAdditionIds, rehabImpactExercises } from './rosterSlots';

/** The AAOS knee exercises E90-E98: never part of a general programme. */
function isKneeRange(id: ExerciseId): boolean {
  const n = Number(exerciseReferences[id].slice(1));
  return n >= 90 && n <= 98;
}

/**
 * New exercises waiting for cross-review (see docs/exercise-audit-log.json).
 * Kept out of generated programmes until approved; then remove the id here.
 */
export const pendingReviewIds: ReadonlySet<ExerciseId> = new Set([
  'renegade-row',
  'weighted-sit-up',
]);

/**
 * Exercises a stored programme must never contain: rehab additions, rehab
 * impact exercises and the knee exercises E90-E98. Enforced by the programme
 * schema (db/program.ts), by the next-level swap filter and by
 * content/beginnerSet.test.ts.
 */
export const programExcludedIds: ReadonlySet<ExerciseId> = new Set(
  exerciseList
    .map((e) => e.id)
    .filter(
      (id) =>
        rehabAdditionIds.has(id) ||
        rehabImpactExercises.has(id) ||
        isKneeRange(id) ||
        pendingReviewIds.has(id),
    ),
);
