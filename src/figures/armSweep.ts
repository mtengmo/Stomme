import type { Pt } from './lerp';

/**
 * Arms that turn about fixed joints. A curl, a press or a raise is a rotation
 * of the upper arm about the shoulder and of the forearm about the elbow, so
 * both segments keep their length by construction (interpolating the joint
 * coordinates shortens them). Angles are in degrees, clockwise on screen from
 * straight down: 0 hangs, 90 points forward (+x), 180 points up, -90 backward.
 */
export const ARM_UPPER = 24.6;
export const ARM_FORE = 22.6;

export const mixAngle = (from: number, to: number, t: number) =>
  from + (to - from) * Math.min(1, Math.max(0, t));

/** Point `length` from `origin` in the direction `deg` (see above). */
export function polar(origin: Pt, length: number, deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return [
    origin[0] + length * Math.sin(rad),
    origin[1] + length * Math.cos(rad),
  ];
}

export type ArmAngles = {
  upper: number;
  fore: number;
};

/** Elbow and hand of one arm from the shoulder (the neck joint). */
export function sweepArm(
  shoulder: Pt,
  angles: ArmAngles,
  upperLength = ARM_UPPER,
  foreLength = ARM_FORE,
): { mid: Pt; end: Pt } {
  const mid = polar(shoulder, upperLength, angles.upper);
  return { mid, end: polar(mid, foreLength, angles.fore) };
}
