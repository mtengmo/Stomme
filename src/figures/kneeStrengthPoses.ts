import type { ExerciseId } from '../domain/types';
import { lerpPt, type Pt } from './lerp';
import type { FigureSpec, Pose } from './poses';

export type KneeStrengthId =
  | 'bosu-squat'
  | 'copenhagen-hold'
  | 'nordic-hamstring-curl'
  | 'bent-knee-calf-hold'
  | 'wall-tibialis-raise';
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const polar = (origin: Pt, length: number, angle: number): Pt => [
  origin[0] + length * Math.cos(angle),
  origin[1] + length * Math.sin(angle),
];
/** Two-link inverse kinematics with explicit contact endpoints. */
function joint(a: Pt, b: Pt, l1: number, l2: number, side = 1): Pt {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  return [
    a[0] + (along * dx) / d - (side * height * dy) / d,
    a[1] + (along * dy) / d + (side * height * dx) / d,
  ];
}
const body = (
  head: Pt,
  neck: Pt,
  hip: Pt,
  eR: Pt,
  hR: Pt,
  eL: Pt,
  hL: Pt,
  kR: Pt,
  aR: Pt,
  tR: Pt,
  kL: Pt,
  aL: Pt,
  tL: Pt,
): Pose => ({ head, neck, hip, eR, hR, eL, hL, kR, aR, tR, kL, aL, tL });

export function bosuSquatPose(t: number): Pose {
  const q = clamp(t),
    hip: Pt = [96 - 15 * q, 96 + 27 * q];
  const neck = polar(hip, 39, -Math.PI / 2 + 0.4 * q),
    head = polar(neck, 16, -1.35);
  const aR: Pt = [102, 148.1],
    tR: Pt = [115, 150.9],
    aL: Pt = [83, 151.2],
    tL: Pt = [96, 148.3];
  const hR: Pt = [neck[0] + 34, neck[1] + 12],
    hL: Pt = [neck[0] + 29, neck[1] + 16];
  return body(
    head,
    neck,
    hip,
    joint(neck, hR, 22, 22),
    hR,
    joint(neck, hL, 22, 22),
    hL,
    joint(hip, aR, 31, 30, -1),
    aR,
    tR,
    joint(hip, aL, 31, 30, -1),
    aL,
    tL,
  );
}
export function copenhagenHoldPose(t: number): Pose {
  const q = clamp(t),
    kR: Pt = [145, 127],
    hip = polar(kR, 38, Math.PI - 0.52 * (1 - q));
  const eL: Pt = [62, 174],
    hL: Pt = [84, 174];
  const neck = joint(hip, eL, 46, 43, 1),
    head = polar(neck, 16, -2.8);
  const aR = polar(kR, 28, -Math.PI / 2),
    tR = polar(aR, 12, -0.9);
  const kL = polar(hip, 36, 0.75),
    aL = polar(kL, 28, 3.2),
    tL = polar(aL, 12, 0.1);
  const eR = polar(neck, 22, -0.7),
    hR = polar(eR, 22, 0.7);
  return body(head, neck, hip, eR, hR, eL, hL, kR, aR, tR, kL, aL, tL);
}
export function nordicHamstringPose(t: number): Pose {
  const q = clamp(t),
    kR: Pt = [70, 174],
    kL: Pt = [64, 174];
  let hip: Pt, neck: Pt, hands: Pt;
  if (q <= 0.55) {
    const angle = -Math.PI / 2 + 1.2 * clamp((q - 0.08) / 0.42);
    hip = polar(kR, 35, angle);
    neck = polar(hip, 38, angle);
    hands = lerpPt([107, 132], [140, 174], clamp((q - 0.32) / 0.18));
  } else if (q <= 0.83) {
    const reset = (q - 0.55) / 0.28;
    hip = polar(kR, 35, -Math.PI / 2 + 1.2 * (1 - reset));
    // Hands stay planted while the hip folds and the arms push the torso up.
    neck = polar(hip, 38, -0.37 + 0.34 * Math.sin(reset * Math.PI));
    hands = [140, 174];
  } else {
    const reset = (q - 0.83) / 0.17;
    hip = [70, 139];
    neck = polar(hip, 38, -0.37 + (-Math.PI / 2 + 0.37) * reset);
    hands = lerpPt([140, 174], [107, 132], reset);
  }
  const head = polar(neck, 17, Math.atan2(neck[1] - hip[1], neck[0] - hip[0]));
  const farHand: Pt = [hands[0] - 5, hands[1]];
  return body(
    head,
    neck,
    hip,
    joint(neck, hands, 30, 30),
    hands,
    joint(neck, farHand, 30, 30),
    farHand,
    kR,
    [43, 174],
    [32, 174],
    kL,
    [37, 174],
    [26, 174],
  );
}
export function bentKneeCalfHoldPose(t: number): Pose {
  const q = clamp(t),
    toe: Pt = [116, 177];
  const ankle = polar(toe, 15, Math.PI + 0.75 * q);
  const knee = polar(ankle, 29, -1.25),
    hip = polar(knee, 32, -1.95);
  const neck = polar(hip, 41, -Math.PI / 2),
    head = polar(neck, 16, -1.3);
  const hand: Pt = [156, 91],
    otherHand: Pt = [156, 104];
  const kL = polar(hip, 32, 1.9),
    aL = polar(kL, 29, -0.1),
    tL = polar(aL, 13, 0.1);
  return body(
    head,
    neck,
    hip,
    joint(neck, hand, 27, 27),
    hand,
    joint(neck, otherHand, 27, 27),
    otherHand,
    knee,
    ankle,
    toe,
    kL,
    aL,
    tL,
  );
}
export function wallTibialisRaisePose(t: number): Pose {
  const q = clamp(t),
    hip: Pt = [65, 117],
    neck: Pt = [65, 74];
  const aR: Pt = [106, 176],
    aL: Pt = [94, 176];
  // aR/aL are heel pivots: only the forefoot rotates, never the heel.
  return body(
    [68, 58],
    neck,
    hip,
    [77, 96],
    [79, 121],
    [57, 96],
    [59, 121],
    joint(hip, aR, 37, 36, -1),
    aR,
    polar(aR, 16, -0.75 * q),
    joint(hip, aL, 35, 36, -1),
    aL,
    polar(aL, 16, -0.75 * q),
  );
}
export function kneeStrengthMovementPose(
  id: ExerciseId,
  t: number,
): Pose | undefined {
  switch (id) {
    case 'bosu-squat':
      return bosuSquatPose(t);
    case 'copenhagen-hold':
      return copenhagenHoldPose(t);
    case 'nordic-hamstring-curl':
      return nordicHamstringPose(t);
    case 'bent-knee-calf-hold':
      return bentKneeCalfHoldPose(t);
    case 'wall-tibialis-raise':
      return wallTibialisRaisePose(t);
    default:
      return undefined;
  }
}
export const kneeStrengthFigures: Record<KneeStrengthId, FigureSpec> = {
  'bosu-squat': {
    start: bosuSquatPose(0),
    end: bosuSquatPose(1),
    props: [{ type: 'bosu', x: 100, y: 178, rx: 35, ry: 30 }],
  },
  'copenhagen-hold': {
    start: copenhagenHoldPose(0),
    end: copenhagenHoldPose(1),
    motion: 'hold',
    props: [{ type: 'bench', x: 137, y: 130, w: 47 }],
  },
  'nordic-hamstring-curl': {
    start: nordicHamstringPose(0),
    end: nordicHamstringPose(0.5),
    motion: 'sequence',
    props: [
      { type: 'mat', x1: 20, x2: 180 },
      { type: 'nordic-anchor', x: 40, y: 174 },
    ],
  },
  'bent-knee-calf-hold': {
    start: bentKneeCalfHoldPose(0),
    end: bentKneeCalfHoldPose(1),
    motion: 'hold',
    props: [{ type: 'wall', x: 159 }],
  },
  'wall-tibialis-raise': {
    start: wallTibialisRaisePose(0),
    end: wallTibialisRaisePose(1),
    props: [{ type: 'wall', x: 61 }],
  },
};
