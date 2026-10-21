import type { ExerciseId } from '../domain/types';
import type { Pt } from './lerp';
import type { Pose } from './poses';

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
 * demonstrations include clear limb shrinkage (step-up and lunges), so solve
 * their knees from stable segment lengths while keeping hips, ankles and feet
 * on their authored paths.
 */
export function constrainLegInterpolation(
  exerciseId: ExerciseId,
  pose: Pose,
  referencePoses: readonly Pose[],
): Pose {
  if (
    !['step-up', 'split-squat', 'reverse-lunge', 'forward-lunge'].includes(
      exerciseId,
    )
  )
    return pose;

  const out = { ...pose };
  const anchor =
    exerciseId === 'step-up' || exerciseId === 'split-squat'
      ? referencePoses[0]
      : referencePoses[Math.floor(referencePoses.length / 2)];
  if (!anchor) return pose;
  for (const side of ['R', 'L'] as const) {
    const { knee, ankle, toe } = keys[side];
    const fixedAnkle =
      exerciseId === 'split-squat' ? referencePoses[0]?.[ankle] : undefined;
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
