import {
  fromAngle,
  type Keyframe,
  sampleKeyframes,
  solveTwoBone,
} from './keyframes';
import type { Pt } from './lerp';
import type { Pose, Prop } from './poses';

/**
 * E02 step-up, side view, as keyframes plus two-bone IK (same pattern as
 * `stepDownKeyframes.ts`). The near (R) foot is planted on the step and drives
 * the rep; the far leg follows and ends standing on the step. Facing right,
 * floor at y = 178. The scene is mirrored by the renderer for a left set.
 *
 * Step height is 19 units, roughly 26 cm at the pilot's scale (editorial).
 */
export const STEP_UP_PROPS: Prop[] = [{ type: 'step', x: 104, y: 159, w: 44 }];

const THIGH = 34;
const SHIN = 33;
const TORSO = 40;
const UPPER_ARM = 25;
const FOREARM = 25;
const NECK_TO_HEAD = 15;
const FOOT = 13;

const STEP_TOP = 159;
const PLANTED_ANKLE: Pt = [118, STEP_TOP - 3];
const PLANTED_TOE_ANGLE = Math.atan2(3, 13);

export interface StepUpValues extends Record<string, number> {
  hipX: number;
  hipY: number;
  /** Trunk lean forward, radians from vertical. */
  lean: number;
  footX: number;
  footY: number;
  /** Free foot angle below horizontal. */
  footAngle: number;
}

export const STEP_UP_KEYFRAMES: readonly Keyframe<StepUpValues>[] = [
  {
    t: 0,
    name: 'Fot på steget',
    values: {
      hipX: 92,
      hipY: 109,
      lean: 0.15,
      footX: 86,
      footY: 175,
      footAngle: 0.226,
    },
  },
  {
    t: 0.3,
    name: 'Trycker upp',
    values: {
      hipX: 101,
      hipY: 103,
      lean: 0.12,
      footX: 90,
      footY: 168,
      footAngle: 0.6,
    },
  },
  {
    t: 0.6,
    name: 'Fria benet följer med',
    values: {
      hipX: 112,
      hipY: 94,
      lean: 0.08,
      footX: 93,
      footY: 148,
      footAngle: 0.4,
    },
  },
  {
    t: 1,
    name: 'Stående på steget',
    values: {
      hipX: 117,
      hipY: 90,
      lean: 0.03,
      footX: 104,
      footY: 146,
      footAngle: 0.25,
    },
  },
];

/** Pose for working side R; `t` runs 0 (foot on the step) to 1 (standing up). */
export function stepUpPose(t: number): Pose {
  const v = sampleKeyframes(STEP_UP_KEYFRAMES, t, false);
  const hip: Pt = [v.hipX, v.hipY];
  const neck = fromAngle(hip, TORSO, v.lean);
  const head = fromAngle(neck, NECK_TO_HEAD, v.lean + 0.1);
  const planted = solveTwoBone(hip, PLANTED_ANKLE, THIGH, SHIN, -1);
  const free = solveTwoBone(hip, [v.footX, v.footY], THIGH, SHIN, -1);
  const toe = (ankle: Pt, angle: number): Pt => [
    ankle[0] + FOOT * Math.cos(angle),
    ankle[1] + FOOT * Math.sin(angle),
  ];
  const nearArm = solveTwoBone(
    neck,
    [neck[0] + 3, neck[1] + 46],
    UPPER_ARM,
    FOREARM,
    1,
  );
  const farArm = solveTwoBone(
    neck,
    [neck[0] - 1, neck[1] + 46],
    UPPER_ARM,
    FOREARM,
    1,
  );
  return {
    head,
    neck,
    hip,
    eR: nearArm.mid,
    hR: nearArm.end,
    eL: farArm.mid,
    hL: farArm.end,
    kR: planted.mid,
    aR: planted.end,
    tR: toe(planted.end, PLANTED_TOE_ANGLE),
    kL: free.mid,
    aL: free.end,
    tL: toe(free.end, v.footAngle),
  };
}
