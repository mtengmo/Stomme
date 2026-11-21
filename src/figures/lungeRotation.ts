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

export function lungeRotationSidePose(rawT: number): Pose {
  const t = clamp(rawT);
  const depth = lungeDepth(t);
  const theta = lungeRotationAngle(t);
  const hip: Pt = [mix(100, 84, depth), mix(112, 134, depth)];
  // The rear foot steps back with a small arc and lands on its toes.
  const stride = smooth(clamp(depth / 0.8));
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
