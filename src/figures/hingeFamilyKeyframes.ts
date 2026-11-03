import { fromAngle, solveTwoBone } from './keyframes';
import { lerpPt, type Pt } from './lerp';
import type { Pose } from './poses';

/**
 * Hip hinge family (dumbbell Romanian deadlift, kettlebell deadlift) built the
 * way the squat family is: both ankles stay planted, the hip slides back and
 * down while the torso leans forward, and every limb comes from two-bone IK so
 * no segment changes length. The arms hang straight down from the shoulders
 * (a weight hangs plumb), so they stay at one length too. Facing right, floor
 * at y = 178.
 */
export type HingeFamilyId = 'dumbbell-rdl' | 'kettlebell-deadlift';

export const HINGE_FAMILY_IDS: readonly HingeFamilyId[] = [
  'dumbbell-rdl',
  'kettlebell-deadlift',
];

export const isHingeFamily = (id: string): id is HingeFamilyId =>
  (HINGE_FAMILY_IDS as readonly string[]).includes(id);

const STAND_HIP: Pt = [98, 118];
const TORSO = 44;
const NECK_TO_HEAD = 14;
const THIGH = 30.8;
const SHIN = 26.5;
const UPPER_ARM = 24.5;
const FOREARM = 22.5;
const ANKLE_R: Pt = [108, 174];
const ANKLE_L: Pt = [86, 174];
const TOE = (a: Pt): Pt => [a[0] + 11, a[1] + 3];

/** Where the hip and trunk end up at the bottom of each movement. */
const BOTTOM = {
  'dumbbell-rdl': { hip: [80, 126] as Pt, lean: 0.95 },
  'kettlebell-deadlift': { hip: [84, 136] as Pt, lean: 0.85 },
};
const STAND_LEAN = 0.05;
/** Arm hang direction: slightly forward of plumb, as in the standing pose. */
const NEAR_HANG: Pt = [3, 47];
const FAR_HANG: Pt = [-2, 47];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** `depth` 0 = standing, 1 = bottom of the hinge. */
export function hingeBody(id: HingeFamilyId, depth: number): Pose {
  const bottom = BOTTOM[id];
  const hip = lerpPt(STAND_HIP, bottom.hip, depth);
  const lean = mix(STAND_LEAN, bottom.lean, depth);
  const neck = fromAngle(hip, TORSO, lean);
  const head = fromAngle(neck, NECK_TO_HEAD, lean + 0.05);
  const legR = solveTwoBone(hip, ANKLE_R, THIGH, SHIN, -1);
  const legL = solveTwoBone(hip, ANKLE_L, THIGH, SHIN, -1);
  const hang = (offset: Pt) =>
    solveTwoBone(
      neck,
      [neck[0] + offset[0], neck[1] + offset[1]],
      UPPER_ARM,
      FOREARM,
      1,
    );
  const near = hang(NEAR_HANG);
  // The kettlebell is held with both hands on one handle.
  const far = id === 'kettlebell-deadlift' ? near : hang(FAR_HANG);
  return {
    head,
    neck,
    hip,
    eR: near.mid,
    hR: near.end,
    eL: far.mid,
    hL: far.end,
    kR: legR.mid,
    aR: legR.end,
    tR: TOE(legR.end),
    kL: legL.mid,
    aL: legL.end,
    tL: TOE(legL.end),
  };
}

/**
 * Pose for a hinge exercise at catalogue progress `t`. The Romanian deadlift
 * starts standing and ends at the bottom; the kettlebell deadlift starts with
 * the bell on the floor and ends standing.
 */
export function hingeFamilyPose(id: HingeFamilyId, progress: number): Pose {
  const t = clamp(progress);
  return hingeBody(id, id === 'dumbbell-rdl' ? t : 1 - t);
}
