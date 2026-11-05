import type { ExerciseId } from '../domain/types';

/**
 * The curated beginner set: the first programme block only draws from these
 * (docs/plan-ditt-program.md, T1). The whole library stays browsable.
 *
 * Chosen against docs/exercise-audit-log.json on 2026-11-03:
 * - Never rehab additions, rehab impact exercises, the ballistic group, the knee
 *   exercises E90-E98 or anything with status `needs-fix`.
 * - `risk: normal` is preferred. A `risk: high` exercise is only here when its
 *   risk comes from load or knee load (not ballistics), it has ok text and
 *   animation reviews dated on or after its latest fix, and its open issues are
 *   process gaps, not factual errors.
 * - Controlled tempo: an automatic 2 s up / 2 s down beat, a static hold or a
 *   walk. No fixed ballistic beat and no hand-counted reps.
 * - At least one `basic` variant, except the few marked "practiced": they only
 *   enter in-level for `some` and `regular`, so experienced users still get a
 *   real first block.
 *
 * Selection is not approval. No copy may call these "granskade övningar"; see
 * the audit log for each exercise's actual status. src/content/beginnerSet.test.ts
 * enforces the rules above.
 */
export const beginnerExerciseIds: ReadonlySet<ExerciseId> = new Set<ExerciseId>(
  [
    // Legs
    // E01: chair sets the depth; bodyweight, dumbbell and kettlebell all basic.
    'goblet-chair-squat',
    // E23: lying hinge with no balance demand; the hinge slot without weights.
    'glute-bridge',
    // E67: normal risk, two feet with a wall to hold; fills the calf slot.
    'calf-raise',
    // E11: static hold at a self-chosen depth. In no roster slot yet.
    'wall-sit',
    // E06 (practiced): feet stay put, hand on the wall; split-leg for some/regular.
    'split-squat',
    // E24 (practiced): the step back brakes less than a forward lunge.
    'reverse-lunge',

    // Press
    // E66: normal risk, the easier swap for knee push-up. In no roster slot yet.
    'wall-push-up',
    // E65: normal risk; the bodyweight press for new trainees.
    'knee-push-up',
    // E54 (practiced, normal risk): the bodyweight press for some/regular.
    'push-up',
    // E21: light dumbbells, short lever; the shoulder slot for new trainees.
    'lateral-raise',
    // E22: free hand on a support, only the elbow moves.
    'triceps-kickback',
    // E17 (practiced): standing dumbbell press, no back lean; some/regular.
    'shoulder-press',

    // Pull
    // E57: normal risk, the only bodyweight back exercise besides bird dog.
    'back-extension',
    // E10: normal risk, slow opposite arm and leg; back and core.
    'bird-dog',
    // E15: one hand on a support, the loaded row for anyone with weights.
    'supported-row',
    // E20: neutral grip, elbows still; the curl slot.
    'hammer-curl',
    // E19: second curl, so pull-focused B passes get a different arm exercise.
    'biceps-curl',

    // Core
    // E04: normal risk, lying on the back with the low back on the floor.
    'dead-bug',
    // E61: normal risk, forearm hold; the core slot and core filler.
    'plank',
    // E05 (practiced, normal risk): side core for some/regular.
    'side-plank',

    // Carry
    // E18: two-handed walk; grip and posture with dumbbells or a kettlebell.
    'farmer-carry',
    // E09: one-sided walk, the anti-lean core carry.
    'suitcase-carry',
  ],
);
