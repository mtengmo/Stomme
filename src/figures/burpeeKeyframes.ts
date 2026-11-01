import {
  fromAngle,
  type Keyframe,
  sampleKeyframes,
  solveTwoBone,
} from './keyframes';
import type { Pt } from './lerp';
import type { Pose } from './poses';

/**
 * E60 burpee as keyframes plus two-bone IK (a `sequence`: one whole rep per
 * cycle, ending where it starts). Facing right, floor at y = 178; the plank
 * has the feet to the left and the hands at x = 134. Every segment keeps one
 * length because the limbs come from IK, never from interpolated joints.
 */
const THIGH = 34;
const SHIN = 33;
const TORSO = 44;
const UPPER_ARM = 23;
const FOREARM = 23;
const NECK_TO_HEAD = 14;
const FOOT_DX = 9;
const FOOT_DY = 3;
/** Where both hands rest on the floor in the plank and the squat thrust. */
const FLOOR_HAND: Pt = [134, 174];
/** The far hand and foot sit slightly behind the near ones. */
const FAR_OFFSET: Pt = [3, -3];

export interface BurpeeValues extends Record<string, number> {
  hipX: number;
  hipY: number;
  lean: number;
  ankleX: number;
  ankleY: number;
  /** 0: hands relative to the neck, 1: hands on the floor. */
  floorW: number;
  handDX: number;
  handDY: number;
}

const v = (
  hipX: number,
  hipY: number,
  lean: number,
  ankleX: number,
  ankleY: number,
  floorW: number,
  handDX = 0,
  handDY = 0,
): BurpeeValues => ({
  hipX,
  hipY,
  lean,
  ankleX,
  ankleY,
  floorW,
  handDX,
  handDY,
});

const STAND = v(100, 108, 0.05, 108, 174, 0, 4, 44);
const HANDS_DOWN = v(92, 150, 1.1, 108, 174, 1);
const KICK = v(92, 132, 1.9, 60, 170, 1);
const PLANK = v(93.8, 146.9, 1.152, 33.1, 174, 1);

export const BURPEE_KEYFRAMES: readonly Keyframe<BurpeeValues>[] = [
  { t: 0, name: 'Stå', values: { ...STAND } },
  { t: 0.12, name: 'Händer i golvet', values: { ...HANDS_DOWN } },
  { t: 0.19, name: 'Hoppar bak', values: { ...KICK } },
  { t: 0.25, name: 'Plankläge', values: { ...PLANK } },
  {
    t: 0.37,
    name: 'Armhävning nere',
    values: v(98.5, 162, 1.388, 33.1, 174, 1),
  },
  { t: 0.5, name: 'Plankläge', values: { ...PLANK } },
  { t: 0.56, name: 'Hoppar in', values: { ...KICK } },
  { t: 0.63, name: 'Händer i golvet', values: { ...HANDS_DOWN } },
  { t: 0.75, name: 'Stå', values: { ...STAND } },
  {
    t: 0.8,
    name: 'Armarna lyfter',
    values: v(100, 102, 0.05, 108, 168, 0, 26, -2),
  },
  {
    t: 0.84,
    name: 'Upphopp',
    values: v(100, 88, 0.05, 108, 154, 0, 6, -44),
  },
  {
    t: 0.88,
    name: 'Armarna sänks',
    values: v(100, 100, 0.1, 108, 164, 0, 26, -4),
  },
  {
    t: 0.92,
    name: 'Landning',
    values: v(100, 114, 0.15, 108, 174, 0, 4, 20),
  },
  { t: 1, name: 'Stå', values: { ...STAND } },
];

const toe = (a: Pt): Pt => [a[0] + FOOT_DX, a[1] + FOOT_DY];

export function burpeePose(t: number): Pose {
  const k = sampleKeyframes(BURPEE_KEYFRAMES, t, false);
  const hip: Pt = [k.hipX, k.hipY];
  const neck = fromAngle(hip, TORSO, k.lean);
  const head = fromAngle(neck, NECK_TO_HEAD, k.lean + 0.1);
  const handFor = (offset: Pt): Pt => [
    (neck[0] + k.handDX) * (1 - k.floorW) +
      FLOOR_HAND[0] * k.floorW +
      offset[0],
    (neck[1] + k.handDY) * (1 - k.floorW) +
      FLOOR_HAND[1] * k.floorW +
      offset[1],
  ];
  const nearHand = handFor([0, 0]);
  const farHand = handFor(FAR_OFFSET);
  const near = solveTwoBone(hip, [k.ankleX, k.ankleY], THIGH, SHIN, -1);
  const far = solveTwoBone(
    hip,
    [k.ankleX + FAR_OFFSET[0], k.ankleY + FAR_OFFSET[1]],
    THIGH,
    SHIN,
    -1,
  );
  const armR = solveTwoBone(neck, nearHand, UPPER_ARM, FOREARM, 1);
  const armL = solveTwoBone(neck, farHand, UPPER_ARM, FOREARM, 1);
  return {
    head,
    neck,
    hip,
    eR: armR.mid,
    hR: armR.end,
    eL: armL.mid,
    hL: armL.end,
    kR: near.mid,
    aR: near.end,
    tR: toe(near.end),
    kL: far.mid,
    aL: far.end,
    tL: toe(far.end),
  };
}

/** Phases of the four reduced-motion stills, in order. */
export const BURPEE_STILL_PHASES = [0, 0.125, 0.375, 0.84] as const;
