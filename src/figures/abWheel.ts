import type { Pt } from './lerp';
import type { Pose } from './poses';

/**
 * Kneeling ab wheel rollout (side view, facing left). Both knees stay on the
 * floor, the shins lie almost flat behind them (toes on the floor) and both
 * hands hold the wheel, which rolls along the floor. The arms stay straight,
 * so the wheel sits exactly one arm length (64) from the shoulder: it rolls
 * forward as the body stretches out and the hip and shoulder are derived from
 * two angles, never placed freely. Thigh 36, trunk 46 and arm 32+32 are
 * constant; the far limbs coincide with the near ones (the figure is seen in
 * profile with the hands on one handle and the knees together).
 *
 * Start: knees under the hips, trunk leaned forward 42 degrees from vertical,
 * wheel in front of the shoulders. End: the body from knee to shoulder is a
 * long, almost straight line (thigh 36 degrees, trunk 33 degrees above the
 * floor), with the hip a few degrees above the knee-shoulder line, never
 * below it, and the wheel at the far end of the arms.
 */
export const AB_WHEEL = {
  radius: 11,
  /** The axle (and the hands) sit this far above the floor line (y 178). */
  axleY: 167,
  knee: [137, 174] as Pt,
  thigh: 36,
  trunk: 46,
  arm: 32,
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => x * x * (3 - 2 * x);
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Angles above the floor, pointing forward (towards -x), at start and at the full rollout. */
const THIGH_DEG: readonly [number, number] = [80, 36];
const TRUNK_DEG: readonly [number, number] = [48, 33];

/** Shin lies almost flat behind the knee: ankle 3 above the floor so the toe (y + 3) touches it. */
const SHIN_ANGLE = Math.asin(3 / 34);

export function abWheelSidePose(rawT: number): Pose {
  const t = Math.max(0, Math.min(1, rawT));
  const s = smooth(t);
  const { knee, thigh, trunk, arm } = AB_WHEEL;
  const a = rad(mix(THIGH_DEG[0], THIGH_DEG[1], s));
  const b = rad(mix(TRUNK_DEG[0], TRUNK_DEG[1], s));
  const hip: Pt = [
    knee[0] - thigh * Math.cos(a),
    knee[1] - thigh * Math.sin(a),
  ];
  const neck: Pt = [hip[0] - trunk * Math.cos(b), hip[1] - trunk * Math.sin(b)];
  const head: Pt = [neck[0] - 5, neck[1] - 13];
  // Straight arms: the hand is one arm length (2 x 32) from the shoulder, on the axle line.
  const reach = 2 * arm;
  const drop = AB_WHEEL.axleY - neck[1];
  const hand: Pt = [
    neck[0] - Math.sqrt(reach * reach - drop * drop),
    AB_WHEEL.axleY,
  ];
  const elbow: Pt = [(neck[0] + hand[0]) / 2, (neck[1] + hand[1]) / 2];
  const ankle: Pt = [
    knee[0] + 34 * Math.cos(SHIN_ANGLE),
    knee[1] - 34 * Math.sin(SHIN_ANGLE),
  ];
  const toe: Pt = [ankle[0] + 9, ankle[1] + 3];
  return {
    head,
    neck,
    hip,
    eR: elbow,
    hR: hand,
    eL: elbow,
    hL: hand,
    kR: knee,
    aR: ankle,
    tR: toe,
    kL: knee,
    aL: ankle,
    tL: toe,
  };
}
