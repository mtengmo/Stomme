import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import { joint } from './rehabPoses';

/**
 * Squat walk (side view, facing right): the figure stays in a half squat and
 * takes two small steps forward (right foot, then left), then the same two
 * steps back (left foot, then right). Forward and back is one repetition and
 * the cycle ends where it starts. The hip travels with the feet (it sits above
 * their mean), the hip height and trunk lean stay constant, both feet are
 * either planted on the floor (y 174) or on a small arc above it. Thigh 36,
 * shin 34, upper arm and forearm 25, trunk 43 throughout.
 */
const THIGH = 36;
const SHIN = 34;
const ARM = 25;
const TRUNK = 43;
const STEP = 22;
const R0 = 102;
const L0 = 92;
const HIP_Y = 124;
const LEAN = 9;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const phase = (t: number, from: number) => smooth(clamp((t - from) / 0.25));

/** How far each foot has advanced (0 to STEP) at progress t, and its lift. */
export function squatWalkFeet(t: number): { right: Pt; left: Pt } {
  // Right foot: forward 0 to 0.25, back 0.75 to 1. Left: forward 0.25 to 0.5, back 0.5 to 0.75.
  const rForward = phase(t, 0);
  const rBack = phase(t, 0.75);
  const lForward = phase(t, 0.25);
  const lBack = phase(t, 0.5);
  const right = rForward - rBack;
  const left = lForward - lBack;
  // An arc while a foot moves, flat while it is planted.
  const arc = (a: number) => 7 * Math.sin(Math.PI * clamp(a));
  const rLift =
    t < 0.25 ? arc(t / 0.25) : t >= 0.75 ? arc((t - 0.75) / 0.25) : 0;
  const lLift =
    t >= 0.25 && t < 0.5
      ? arc((t - 0.25) / 0.25)
      : t >= 0.5 && t < 0.75
        ? arc((t - 0.5) / 0.25)
        : 0;
  return {
    right: [R0 + STEP * right, 174 - rLift],
    left: [L0 + STEP * left, 174 - lLift],
  };
}

export function squatWalkSidePose(rawT: number): Pose {
  const t = clamp(rawT);
  const { right, left } = squatWalkFeet(t);
  const hip: Pt = [(right[0] + left[0]) / 2 - 2, HIP_Y];
  const neck: Pt = [
    hip[0] + LEAN,
    hip[1] - Math.sqrt(TRUNK * TRUNK - LEAN * LEAN),
  ];
  const head: Pt = [neck[0] + 2, neck[1] - 14];
  const hand: Pt = [neck[0] + 24, neck[1] + 14];
  const arm = solveTwoBone(neck, hand, ARM, ARM, -1);
  const toe = (a: Pt): Pt => [a[0] + 9, a[1] + 3];
  return {
    head,
    neck,
    hip,
    eR: arm.mid,
    hR: arm.end,
    eL: arm.mid,
    hL: arm.end,
    kR: joint(hip, right, THIGH, SHIN, -1),
    aR: right,
    tR: toe(right),
    kL: joint(hip, left, THIGH, SHIN, -1),
    aL: left,
    tL: toe(left),
  };
}
