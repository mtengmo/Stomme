import {
  fromAngle,
  type GateOptions,
  type Keyframe,
  sampleKeyframes,
  solveTwoBone,
} from './keyframes';
import type { Pt } from './lerp';
import type { Pose, Prop } from './poses';

/**
 * E96 step-down as a keyframe pilot. Standing leg (near side, R) stays planted
 * on the step and bends as the hip lowers; the far leg hangs forward past the
 * step edge, the heel stops about 5-8 cm below the step (it does not touch the
 * floor), pauses, and the body rises again. The far hand rests on a banister
 * beside the body. Everything is authored as a few numbers per keyframe
 * and rendered through two-bone IK, so segment lengths cannot drift.
 *
 * Coordinates match the existing figures: 200x200 box, facing right, floor at
 * y = 178. A left working side is the same scene mirrored (x -> 192 - x), as
 * Figure.tsx does it.
 */

const RAIL_Y = 96;
/** Rail length in x; the support hand grips it ahead of the body, within reach. */
const RAIL_X2 = 140;
const HAND_AHEAD = 27;

export const STEP_DOWN_PILOT_PROPS: Prop[] = [
  // Stair height: 14 units, roughly 19 cm at this scale (the catalogue
  // figure uses a step of about 43 cm).
  { type: 'step', x: 84, y: 164, w: 34 },
  { type: 'rail', x1: 70, x2: RAIL_X2, y: RAIL_Y },
];

export const STEP_DOWN_VIEWBOX = [14, 0, 164, 188] as const;
const MIRROR_X = 192;

const THIGH = 34;
const SHIN = 33;
const TORSO = 40;
const UPPER_ARM = 25;
const FOREARM = 25;
const NECK_TO_HEAD = 15;
const FOOT = 13;

const STEP_TOP = 164;
/** Planted foot, resting flat on the step. */
const PLANTED_ANKLE: Pt = [99, STEP_TOP - 3];
const PLANTED_TOE_ANGLE = Math.atan2(3, 13);

export interface StepDownValues extends Record<string, number> {
  hipX: number;
  hipY: number;
  /** Trunk lean forward, radians from vertical. */
  lean: number;
  /** Free ankle position. */
  footX: number;
  footY: number;
  /** Free foot angle below horizontal (negative = toes up). */
  footAngle: number;
}

const LOWEST = {
  hipX: 98,
  hipY: 108,
  lean: 0.15,
  footX: 124,
  footY: 168.5,
  footAngle: -0.1,
};
const STANDING = {
  hipX: 100,
  hipY: 96,
  lean: 0.03,
  footX: 124,
  footY: 150,
  footAngle: 0.5,
};

export const STEP_DOWN_KEYFRAMES: readonly Keyframe<StepDownValues>[] = [
  { t: 0, name: 'Stående på steget', values: { ...STANDING } },
  {
    t: 0.3,
    name: 'Sänker',
    values: {
      hipX: 99,
      hipY: 101,
      lean: 0.09,
      footX: 124,
      footY: 159,
      footAngle: 0.2,
    },
  },
  { t: 0.5, name: 'Lägsta punkt', values: { ...LOWEST } },
  { t: 0.58, name: 'Paus', values: { ...LOWEST } },
  {
    t: 0.8,
    name: 'Reser sig',
    values: {
      hipX: 99,
      hipY: 100,
      lean: 0.08,
      footX: 124,
      footY: 157,
      footAngle: 0.25,
    },
  },
  { t: 1, name: 'Stående på steget', values: { ...STANDING } },
];

/** Pose for working side R, as the renderer wants it (mirrors itself for L). */
export function stepDownKeyframePose(t: number): Pose {
  const v = sampleKeyframes(STEP_DOWN_KEYFRAMES, t);
  const hip: Pt = [v.hipX, v.hipY];
  const neck = fromAngle(hip, TORSO, v.lean);
  const head = fromAngle(neck, NECK_TO_HEAD, v.lean + 0.1);
  const planted = solveTwoBone(hip, PLANTED_ANKLE, THIGH, SHIN, -1);
  const free = solveTwoBone(hip, [v.footX, v.footY], THIGH, SHIN, -1);
  const toe = (ankle: Pt, angle: number): Pt => [
    ankle[0] + FOOT * Math.cos(angle),
    ankle[1] + FOOT * Math.sin(angle),
  ];
  // Far (grey) hand rests on the banister beside the body; the near (blue)
  // arm hangs relaxed, slightly forward. Elbows point backwards.
  const farArm = solveTwoBone(
    neck,
    [v.hipX + HAND_AHEAD, RAIL_Y],
    UPPER_ARM,
    FOREARM,
    1,
  );
  const nearArm = solveTwoBone(
    neck,
    [neck[0] + 12, neck[1] + 46],
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

/**
 * Catalogue pose: `t` runs 0 (standing on the step) to 1 (lowest point), as
 * `movementPose` expects. The card itself plays 0 -> 1 -> 0 with holds, so the
 * return follows the lowering path in reverse.
 */
export function stepDownDescentPose(t: number): Pose {
  return stepDownKeyframePose(Math.max(0, Math.min(1, t)) * 0.5);
}

const mirrorPt = ([x, y]: Pt): Pt => [MIRROR_X - x, y];

/** The pose as it appears on screen for the working side. */
export function stepDownWorldPose(t: number, side: 'right' | 'left'): Pose {
  const p = stepDownKeyframePose(t);
  if (side === 'right') return p;
  return {
    head: mirrorPt(p.head),
    neck: mirrorPt(p.neck),
    hip: mirrorPt(p.hip),
    eR: mirrorPt(p.eR),
    hR: mirrorPt(p.hR),
    eL: mirrorPt(p.eL),
    hL: mirrorPt(p.hL),
    kR: mirrorPt(p.kR),
    aR: mirrorPt(p.aR),
    tR: mirrorPt(p.tR),
    kL: mirrorPt(p.kL),
    aL: mirrorPt(p.aL),
    tL: mirrorPt(p.tL),
  };
}

export function mirrorProp(prop: Prop): Prop {
  if (prop.type === 'step') return { ...prop, x: MIRROR_X - prop.x - prop.w };
  if (prop.type === 'wall') return { ...prop, x: MIRROR_X - prop.x };
  if (prop.type === 'rail')
    return { ...prop, x1: MIRROR_X - prop.x2, x2: MIRROR_X - prop.x1 };
  return prop;
}

/** Frames 0..1 inclusive, `count` + 1 samples, for the geometry gate. */
export function stepDownFrames(side: 'right' | 'left', count = 60): Pose[] {
  return Array.from({ length: count + 1 }, (_, i) =>
    stepDownWorldPose(i / count, side),
  );
}

/** Gate settings for a working side, with props mirrored for the left. */
export function stepDownGateOptions(
  side: 'right' | 'left',
  props: readonly Prop[] = STEP_DOWN_PILOT_PROPS,
): GateOptions {
  return {
    floorY: 178,
    viewBox: STEP_DOWN_VIEWBOX,
    props: side === 'right' ? props : props.map(mirrorProp),
    minHeadClearance: 24,
  };
}
