import type { ExerciseId } from '../domain/types';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import {
  arm,
  bone,
  foot,
  headNeck,
  keepSegmentLengths,
  leg,
  type SegmentRule,
  trunk,
} from './segmentLengths';

type LegSide = 'R' | 'L';
type LegKeys = {
  knee: 'kR' | 'kL';
  ankle: 'aR' | 'aL';
  toe: 'tR' | 'tL';
};
const keys: Record<LegSide, LegKeys> = {
  R: { knee: 'kR', ankle: 'aR', toe: 'tR' },
  L: { knee: 'kL', ankle: 'aL', toe: 'tL' },
};

const distance = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Return the knee at the intersection of two fixed-length limb segments.
 * The raw interpolated knee selects the familiar bend direction when both
 * circle intersections are possible.
 */
function solveKnee(
  hip: Pt,
  ankle: Pt,
  rawKnee: Pt,
  upper: number,
  lower: number,
): Pt {
  const dx = ankle[0] - hip[0];
  const dy = ankle[1] - hip[1];
  const d = Math.hypot(dx, dy);
  if (d < 0.001 || d > upper + lower || d < Math.abs(upper - lower))
    return rawKnee;

  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const base: Pt = [hip[0] + (dx / d) * along, hip[1] + (dy / d) * along];
  const offset: Pt = [(-dy / d) * height, (dx / d) * height];
  const first: Pt = [base[0] + offset[0], base[1] + offset[1]];
  const second: Pt = [base[0] - offset[0], base[1] - offset[1]];
  return distance(first, rawKnee) <= distance(second, rawKnee) ? first : second;
}

/**
 * The side catalogue interpolates joint coordinates independently. These
 * demonstrations include clear limb shrinkage (the lunges), so solve
 * their knees from stable segment lengths while keeping hips, ankles and feet
 * on their authored paths.
 */
export function constrainLegInterpolation(
  exerciseId: ExerciseId,
  pose: Pose,
  referencePoses: readonly Pose[],
): Pose {
  const solved = solveLegKnees(exerciseId, pose, referencePoses);
  const rules = SEGMENT_RULES[exerciseId];
  return rules ? keepSegmentLengths(solved, referencePoses, rules) : solved;
}

/**
 * Per-exercise segment-length rules (opt-in, see `segmentLengths.ts`): the
 * listed segments keep the length of the authored start pose through the whole
 * interpolation. The authored start, middle and end keyframes must agree on
 * those lengths; `segmentLengths.test.ts` asserts it.
 */
export const SEGMENT_RULES: Partial<
  Record<ExerciseId, readonly SegmentRule[]>
> = {
  // Hands stay on the chest, only the elbows move.
  'goblet-chair-squat': [arm('R', { bend: 1 }), arm('L', { bend: 1 })],
  // A hinging trunk of constant length; head and arms ride on it.
  'single-leg-rdl': [trunk(), headNeck()],
  // Opposite arm and leg reach out as straight, constant-length limbs.
  'dead-bug': [
    arm('R', { straight: true }),
    arm('L', { straight: true }),
    leg('R'),
    leg('L'),
    foot('R'),
    foot('L'),
  ],
  // Hold figure: the loop between Start and Håll only moves the hip and the
  // free arm, every segment keeps its length.
  'side-plank': [
    bone('neck', 'hip'),
    arm('R'),
    arm('L'),
    leg('R', { straight: true }),
    leg('L', { straight: true }),
    foot('R'),
    foot('L'),
  ],
  'bird-dog': [
    arm('R', { straight: true }),
    arm('L', { straight: true }),
    leg('R'),
    leg('L'),
    foot('R'),
    foot('L'),
  ],
};

function solveLegKnees(
  exerciseId: ExerciseId,
  pose: Pose,
  referencePoses: readonly Pose[],
): Pose {
  if (
    ![
      'step-down',
      'split-squat',
      'reverse-lunge',
      'forward-lunge',
      'single-leg-rdl',
      'goblet-chair-squat',
      'wall-sit',
    ].includes(exerciseId)
  )
    return pose;

  const out = { ...pose };
  // Feet stay planted through these; only hip and knee move.
  const plantedFeet =
    exerciseId === 'split-squat' ||
    exerciseId === 'goblet-chair-squat' ||
    exerciseId === 'wall-sit';
  const anchor =
    exerciseId === 'step-down' || exerciseId === 'split-squat' || plantedFeet
      ? referencePoses[0]
      : exerciseId === 'single-leg-rdl'
        ? referencePoses.at(-1)
        : referencePoses[Math.floor(referencePoses.length / 2)];
  if (!anchor) return pose;
  for (const side of ['R', 'L'] as const) {
    const { knee, ankle, toe } = keys[side];
    const fixedAnkle = plantedFeet ? referencePoses[0]?.[ankle] : undefined;
    if (fixedAnkle) {
      out[ankle] = fixedAnkle;
      out[toe] = referencePoses[0]?.[toe] ?? out[toe];
    }
    let upper = distance(anchor.hip, anchor[knee]);
    const lower = distance(anchor[knee], anchor[ankle]);

    // Some source frames have a shorter drawn shin than the stance-frame
    // reach requires. Grow the upper segment just enough to keep every
    // authored hip/ankle pair geometrically reachable without moving contact.
    const longestReach = Math.max(
      ...referencePoses.map((reference) =>
        distance(reference.hip, fixedAnkle ?? reference[ankle]),
      ),
    );
    upper = Math.max(upper, longestReach - lower + 0.01);

    out[knee] = solveKnee(out.hip, out[ankle], out[knee], upper, lower);
  }
  return out;
}
