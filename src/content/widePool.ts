import type { ExerciseId } from '../domain/types';
import { beginnerExerciseIds } from './beginnerSet';
import { exerciseReferences } from './exerciseReferences';
import { exerciseList } from './exercises';
import { programExcludedIds } from './programExclusions';
import { plyometricIds } from './runningProposals';

/**
 * The audit log's `ballistic` group (docs/exercise-audit-log.json). A wide
 * programme never draws from it; programVariety.test.ts keeps this list in step with
 * the log. The jump exercise has its own gate below.
 */
export const ballisticIds: ReadonlySet<ExerciseId> = new Set<ExerciseId>([
  'kettlebell-swing',
  'one-arm-kettlebell-swing',
  'burpee',
  'squat-jump',
  'jumping-lunge',
  'mountain-climber',
  'blast-off-push-up',
  'single-leg-lateral-hop',
  'box-jump',
  'fast-feet',
  'in-and-out-jump',
  'lateral-shuffle',
  'knee-drive',
  'plate-pogos',
]);

/**
 * Exercises whose audit-log entry still lists a factual figure or text error
 * in `openIssues` (fixed, awaiting re-review). Kept out of a wide programme
 * until the review closes them; programVariety.test.ts fails when a pool member has
 * such an issue, so a new entry in the log cannot slip in unnoticed. Remove an
 * id here only after the re-review (Astra) has cleared its openIssues.
 */
export const unresolvedFigureIssueIds: ReadonlySet<ExerciseId> =
  new Set<ExerciseId>([
    'chin-up',
    'diamond-push-up',
    'woodchop',
    'thruster',
    'single-arm-thruster',
  ]);

/** The AAOS knee range E28-E38 (half-squat, seated knee extension, ...). */
function isAaosKneeGroup(id: ExerciseId): boolean {
  const n = Number(exerciseReferences[id].slice(1));
  return n >= 28 && n <= 38;
}

const wide: ExerciseId[] = exerciseList
  .map((e) => e.id)
  .filter(
    (id) =>
      !programExcludedIds.has(id) &&
      !ballisticIds.has(id) &&
      !unresolvedFigureIssueIds.has(id) &&
      !isAaosKneeGroup(id),
  );

const widePlyo: ReadonlySet<ExerciseId> = new Set([...wide, ...plyometricIds]);
const widePlain: ReadonlySet<ExerciseId> = new Set(wide);

/**
 * Candidate pool of a programme for users past the beginner set: the whole
 * catalogue minus the programme exclusions (rehab additions, impact, knee
 * range E90-E98) and the ballistic group. `plyo` adds the jump exercise; it
 * only enters through the running slot model, never through a general slot.
 */
export function widePool(plyo: boolean): ReadonlySet<ExerciseId> {
  return plyo ? widePlyo : widePlain;
}

/** Only the beginner level draws from the curated set. */
export function isCuratedLevel(level: 'new' | 'some' | 'regular'): boolean {
  return level === 'new';
}

/** The pool a programme for this level draws from. */
export function programPool(
  level: 'new' | 'some' | 'regular',
  emphasis: 'full' | 'run' | 'upper',
): ReadonlySet<ExerciseId> {
  return isCuratedLevel(level)
    ? beginnerExerciseIds
    : widePool(emphasis === 'run');
}
