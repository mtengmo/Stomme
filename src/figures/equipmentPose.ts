import type { ExerciseId } from '../domain/types';
import type { Pt } from './lerp';
import { figures, type Pose } from './poses';

/**
 * The pose as it is drawn: with external load the renderer rewrites arm
 * positions. Pure so the geometry gate can measure what is on screen.
 * `equipment` is undefined for the catalogue default, null for none.
 */
export function applyEquipmentPose(
  exerciseId: ExerciseId,
  pose: Pose,
  equipment: 'dumbbell' | 'kettlebell' | 'band' | null | undefined,
): {
  p: Pose;
  anchors: Pt[];
  twoHandedBell: boolean;
  heldKind: 'dumbbell' | 'kettlebell' | 'band' | null | undefined;
} {
  const spec = figures[exerciseId];
  let p = pose;
  // With external load, hands carry it rather than resting on the support.
  if (
    equipment &&
    (exerciseId === 'split-squat' || exerciseId === 'single-leg-calf-raise')
  ) {
    p = {
      ...pose,
      eR: [pose.neck[0] + 6, pose.neck[1] + 20],
      hR: [pose.hip[0] + 10, pose.hip[1] + 8],
    };
    if (exerciseId === 'split-squat')
      p = {
        ...p,
        eL: [pose.neck[0] - 8, pose.neck[1] + 20],
        hL: [pose.hip[0] - 12, pose.hip[1] + 8],
      };
  }
  if (
    equipment &&
    (exerciseId === 'single-leg-hip-thrust' || exerciseId === 'glute-bridge')
  ) {
    p = {
      ...p,
      hR: [p.hip[0] + 5, p.hip[1] - 5],
      hL: [p.hip[0] - 5, p.hip[1] - 5],
    };
  }
  const heldKind = equipment === undefined ? spec.held?.kind : equipment;
  const twoHandedBell =
    heldKind === 'kettlebell' &&
    ['dumbbell-rdl', 'reverse-lunge', 'forward-lunge'].includes(exerciseId);
  if (twoHandedBell) {
    if (exerciseId === 'dumbbell-rdl') {
      // Both hands share one handle: the near arm already hangs plumb at its
      // exact length, so the far arm simply copies it (no blending).
      p = { ...p, eL: p.eR, hL: p.hR };
    } else {
      const hands: Pt = [p.neck[0] + 13, p.neck[1] + 9];
      p = {
        ...p,
        eR: [p.neck[0] + 12, p.neck[1] + 26],
        eL: [p.neck[0] + 6, p.neck[1] + 24],
        hR: hands,
        hL: hands,
      };
    }
  }
  const anchors: Pt[] = twoHandedBell
    ? [p.hR]
    : exerciseId === 'russian-twist'
      ? [[(p.hR[0] + p.hL[0]) / 2, (p.hR[1] + p.hL[1]) / 2]]
      : exerciseId === 'single-leg-hip-thrust' || exerciseId === 'glute-bridge'
        ? [[p.hip[0], p.hip[1] - (heldKind === 'kettlebell' ? 16 : 5)]]
        : (
            spec.held?.hands ??
            (exerciseId === 'split-squat'
              ? (['hR', 'hL'] as const)
              : (['hR'] as const))
          ).map((hand) => p[hand]);
  if (equipment === null && exerciseId === 'goblet-squat')
    p = {
      ...p,
      eR: [p.neck[0] + 21, p.neck[1] + 7],
      hR: [p.neck[0] + 43, p.neck[1] + 9],
      eL: [p.neck[0] + 19, p.neck[1] + 10],
      hL: [p.neck[0] + 41, p.neck[1] + 12],
    };
  return { p, anchors, twoHandedBell, heldKind };
}
