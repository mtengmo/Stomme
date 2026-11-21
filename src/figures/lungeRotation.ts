import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import { joint } from './rehabPoses';

/**
 * Lunge with rotation (side view, facing right). The right (working) leg is the
 * front leg and stays planted; the left foot steps back and returns (a reverse
 * lunge). The progress runs 0 = standing, 1 = bottom of the lunge with the
 * chest turned over the front leg; the demonstration goes there and back.
 *
 * The hands are held together in front of the chest at a constant distance
 * from the neck, so a rotation of the shoulders about the vertical axis only
 * moves them towards the camera (side view: towards the neck). The hips stay
 * square. Thigh 36, shin 34, upper arm and forearm 25, trunk 43 throughout.
 */
const THIGH = 36;
const SHIN = 34;
export const LUNGE_ARM = 25;
const TRUNK = 43;
const FRONT_FOOT: Pt = [108, 174];
const REAR_START: Pt = [92, 174];
const REAR_END: Pt = [50, 168];
const FOOT = Math.hypot(9, 3);
/** Hand position relative to the neck: a forward reach and a drop. */
export const LUNGE_HAND_REACH = 30;
const HAND_DROP = 14;
/** Chest rotation at the bottom of the lunge, radians (about 45 degrees, from the upper back). */
export const LUNGE_ROTATION_MAX = 0.8;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Depth of the lunge: 0 standing, 1 at the bottom (done by progress 0.6). */
export function lungeDepth(t: number): number {
  return smooth(clamp(t / 0.6));
}

/** Chest rotation towards the front leg: only once the lunge is low (0.55 to 0.95). */
export function lungeRotationAngle(t: number): number {
  return LUNGE_ROTATION_MAX * smooth(clamp((t - 0.55) / 0.4));
}

/** How far the rear foot has stepped back (0 to 1): done at depth 0.8, shared by every view. */
export function lungeStride(t: number): number {
  return smooth(clamp(lungeDepth(t) / 0.8));
}

export function lungeRotationSidePose(rawT: number): Pose {
  const t = clamp(rawT);
  const depth = lungeDepth(t);
  const theta = lungeRotationAngle(t);
  const hip: Pt = [mix(100, 84, depth), mix(105, 134, depth)];
  // The rear foot steps back with a small arc and lands on its toes.
  const stride = lungeStride(t);
  const rear: Pt = [
    mix(REAR_START[0], REAR_END[0], stride),
    mix(REAR_START[1], REAR_END[1], stride) - 8 * Math.sin(Math.PI * stride),
  ];
  // The trunk keeps its length and leans a little forward in the lunge.
  const lean = mix(0, 4, depth);
  const neck: Pt = [
    hip[0] + lean,
    hip[1] - Math.sqrt(TRUNK * TRUNK - lean * lean),
  ];
  const head: Pt = [neck[0] + 2, neck[1] - 14];
  const hand: Pt = [
    neck[0] + LUNGE_HAND_REACH * Math.cos(theta),
    neck[1] + HAND_DROP,
  ];
  const arm = solveTwoBone(neck, hand, LUNGE_ARM, LUNGE_ARM, -1);
  // The rear foot rolls onto its toes (constant foot length, toe on the floor).
  const rollAngle = Math.asin(Math.min(1, (177 - REAR_END[1]) / FOOT));
  const angle = mix(Math.atan2(3, 9), rollAngle, stride);
  const rearToe: Pt = [
    rear[0] + FOOT * Math.cos(angle),
    rear[1] + FOOT * Math.sin(angle),
  ];
  return {
    head,
    neck,
    hip,
    eR: arm.mid,
    hR: arm.end,
    eL: arm.mid,
    hL: arm.end,
    kR: joint(hip, FRONT_FOOT, THIGH, SHIN, -1),
    aR: FRONT_FOOT,
    tR: [FRONT_FOOT[0] + 9, FRONT_FOOT[1] + 3],
    kL: joint(hip, rear, THIGH, SHIN, -1),
    aL: rear,
    tL: rearToe,
  };
}

/**
 * Front view ("Framifrån") of the lunge with rotation, authored for the right
 * (working) leg in front, which is the viewer's left. The front foot is
 * planted at x 88 with the toes turned a little out (towards the viewer's
 * left), so the knee can be read against the toe direction in every phase: it
 * tracks over the foot (x 93.5 standing, 84 at the bottom, the foot spans x 78
 * to 88). The shin is a constant 34, the thigh only foreshortens (it points at
 * the camera as the knee bends, never longer than 35.9). The rear foot steps
 * straight back, so it rises up the picture and ends behind the front leg
 * (drawn first, its knee folds in behind the front thigh); its limb lengths
 * are the front leg's. The pelvis bar stays square; the shoulder bar narrows
 * and tilts as the chest turns over the front leg, and the clasped hands,
 * held a constant reach in front of the chest, swing towards the front leg.
 * Timing is that of the side view (`lungeDepth`, `lungeRotationAngle`,
 * `lungeStride`).
 */
export const LUNGE_FRONT_FOOT_X = 88;
const FRONT_THIGH = 35.9;
const FRONT_SHIN = 34;
/** Front-foot toe stub: 10 outward, 3 down (the toes turn a little out). */
const FRONT_TOE_DX = 10;
const SHOULDER_HALF = 15;
const PELVIS_HALF = 9;

export type LungeFrontFrame = {
  pose: Pose;
  /** Shoulder and pelvis bars as [viewer-left end, viewer-right end]. */
  shoulders: [Pt, Pt];
  pelvis: [Pt, Pt];
  /** x of the plumb line through the middle of the planted front foot. */
  footLineX: number;
};

export function lungeRotationFrontFrame(
  rawT: number,
  working: 'right' | 'left' = 'right',
): LungeFrontFrame {
  const t = clamp(rawT);
  const depth = lungeDepth(t);
  const theta = lungeRotationAngle(t);
  const stride = lungeStride(t);
  const hip: Pt = [mix(100, 95, depth), mix(108.5, 126, depth)];
  const lean = mix(0, 2, depth);
  const neck: Pt = [
    hip[0] + lean,
    hip[1] - Math.sqrt(TRUNK * TRUNK - lean * lean),
  ];
  const head: Pt = [neck[0], neck[1] - 14];
  // Front (right) leg: the foot stays put; the knee glides out over the toes.
  const aR: Pt = [LUNGE_FRONT_FOOT_X, 174];
  const kneeX = mix(93.5, 84, depth);
  const kR: Pt = [
    kneeX,
    aR[1] - Math.sqrt(FRONT_SHIN * FRONT_SHIN - (kneeX - aR[0]) ** 2),
  ];
  // Rear (left) leg: steps back (up the picture) in a small arc, toes down.
  const aL: Pt = [
    mix(112, 126, stride),
    mix(174, 162, stride) - 6 * Math.sin(Math.PI * stride),
  ];
  const kL = joint(hip, aL, FRONT_THIGH, FRONT_SHIN, 1);
  // The clasped hands keep a reach of 30 in front of the chest; turning the
  // chest by theta towards the front leg swings them 30 sin(theta) across.
  const hand: Pt = [neck[0] - LUNGE_HAND_REACH * Math.sin(theta), neck[1] + 18];
  const armR = solveTwoBone(neck, hand, LUNGE_ARM, LUNGE_ARM, 1);
  const armL = solveTwoBone(neck, hand, LUNGE_ARM, LUNGE_ARM, -1);
  // The chest turns about the spine: the bar narrows by cos(theta) and the
  // left shoulder (the one turning towards the camera) sits lower than the
  // right one. The pelvis bar stays square.
  const half = SHOULDER_HALF * Math.cos(theta);
  const tilt = 4 * Math.sin(theta);
  const right: Pose = {
    head,
    neck,
    hip,
    eR: armR.mid,
    hR: armR.end,
    eL: armL.mid,
    hL: armL.end,
    kR,
    aR,
    tR: [aR[0] - FRONT_TOE_DX, aR[1] + 3],
    kL,
    aL,
    tL: [aL[0] + FRONT_TOE_DX, Math.min(177, aL[1] + 3)],
  };
  const frame: LungeFrontFrame = {
    pose: right,
    shoulders: [
      [neck[0] - half, neck[1] - tilt],
      [neck[0] + half, neck[1] + tilt],
    ],
    pelvis: [
      [hip[0] - PELVIS_HALF, hip[1]],
      [hip[0] + PELVIS_HALF, hip[1]],
    ],
    footLineX: aR[0] - FRONT_TOE_DX / 2,
  };
  if (working !== 'left') return frame;
  const flip = (pt: Pt): Pt => [200 - pt[0], pt[1]];
  return {
    // Mirror about x = 100 and swap the sides: the person's right stays on the
    // viewer's left, so a left working leg is the viewer's right.
    pose: {
      head: flip(right.head),
      neck: flip(right.neck),
      hip: flip(right.hip),
      eR: flip(right.eL),
      hR: flip(right.hL),
      eL: flip(right.eR),
      hL: flip(right.hR),
      kR: flip(right.kL),
      aR: flip(right.aL),
      tR: flip(right.tL),
      kL: flip(right.kR),
      aL: flip(right.aR),
      tL: flip(right.tR),
    },
    shoulders: [flip(frame.shoulders[0]), flip(frame.shoulders[1])],
    pelvis: [flip(frame.pelvis[0]), flip(frame.pelvis[1])],
    footLineX: 200 - frame.footLineX,
  };
}
