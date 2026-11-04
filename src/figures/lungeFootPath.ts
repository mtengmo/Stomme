import type { Pt } from './lerp';
import type { Pose } from './poses';

const smooth = (x: number) => x * x * (3 - 2 * x);
const r1 = (n: number) => Math.round(n * 10) / 10;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const REAR_LIFT = 14;

/**
 * Reverse lunge, profile, phases 0-0.5: the rear (left) foot leaves the floor,
 * clears it, travels back and lands on the toe with the heel up. From phase 0.5
 * the toe stays planted while the body lowers. The authored start and middle
 * frames fix both ends of the path, so the seams are exact.
 */
export function withReverseLungeRearFoot(
  pose: Pose,
  start: Pose,
  middle: Pose,
  t: number,
): Pose {
  if (t >= 0.5) return pose;
  const u = Math.max(0, t * 2);
  const s = smooth(u);
  const ankle: Pt = [
    r1(lerp(start.aL[0], middle.aL[0], s)),
    r1(lerp(start.aL[1], middle.aL[1], s) - REAR_LIFT * Math.sin(Math.PI * u)),
  ];
  // The knee always bends forward (+x): constant segment lengths from the
  // authored middle frame, as the constrained-leg solver uses.
  const lower = Math.hypot(
    middle.kL[0] - middle.aL[0],
    middle.kL[1] - middle.aL[1],
  );
  const dx = ankle[0] - pose.hip[0];
  const dy = ankle[1] - pose.hip[1];
  const reach = Math.min(Math.hypot(dx, dy), 66.9);
  const upper = Math.max(
    Math.hypot(middle.kL[0] - middle.hip[0], middle.kL[1] - middle.hip[1]),
    Math.hypot(dx, dy) - lower + 0.01,
  );
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const d = Math.hypot(dx, dy);
  const knee: Pt = [
    r1(pose.hip[0] + (dx / d) * along + (dy / d) * height),
    r1(pose.hip[1] + (dy / d) * along - (dx / d) * height),
  ];
  const off = (a: Pose): Pt => [a.tL[0] - a.aL[0], a.tL[1] - a.aL[1]];
  const o0 = off(start);
  const o1 = off(middle);
  const len = lerp(Math.hypot(...o0), Math.hypot(...o1), s);
  const ang = lerp(Math.atan2(o0[1], o0[0]), Math.atan2(o1[1], o1[0]), s);
  return {
    ...pose,
    kL: knee,
    aL: ankle,
    tL: [
      r1(ankle[0] + len * Math.cos(ang)),
      r1(ankle[1] + len * Math.sin(ang)),
    ],
  };
}
