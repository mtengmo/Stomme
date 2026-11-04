import type { Pt } from './lerp';
import type { Pose } from './poses';

/** Constant limb lengths for the profile gait; they never change. */
const THIGH = 30;
const SHIN = 29;
const FLOOR_ANKLE_Y = 174;
const STRIDE_HALF = 16;
const FOOT_CLEARANCE = 10;
const HIP: Pt = [100, 118];

/** Knee of a two-segment leg that bends forward (toward +x). */
function forwardKnee(hip: Pt, ankle: Pt): Pt {
  const dx = ankle[0] - hip[0];
  const dy = ankle[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.001);
  const along = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, THIGH * THIGH - along * along));
  const ux = dx / Math.hypot(dx, dy);
  const uy = dy / Math.hypot(dx, dy);
  const a: Pt = [
    hip[0] + ux * along - uy * height,
    hip[1] + uy * along + ux * height,
  ];
  const b: Pt = [
    hip[0] + ux * along + uy * height,
    hip[1] + uy * along - ux * height,
  ];
  return a[0] >= b[0] ? a : b;
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (x: number, y: number): Pt => [r1(x), r1(y)];

/**
 * One whole two-step walking cycle in profile, camera following the walker
 * (t=1 equals t=0). The stance foot stays on the floor and travels backward
 * under the hip; the swing foot lifts, clears the floor and lands ahead. The
 * right foot is ahead at t=0, the left at t=0.5. The torso stays upright and
 * the right hand keeps hanging at the side; the left arm swings opposite the
 * left leg.
 */
export function suitcaseCarryPose(progress: number): Pose {
  const t = ((progress % 1) + 1) % 1;
  const rightStance = t < 0.5;
  const h = rightStance ? t * 2 : (t - 0.5) * 2;
  const stanceAnkle = pt(
    HIP[0] + STRIDE_HALF - 2 * STRIDE_HALF * h,
    FLOOR_ANKLE_Y,
  );
  const lift = Math.sin(Math.PI * h);
  const swingAnkle = pt(
    HIP[0] - STRIDE_HALF + 2 * STRIDE_HALF * smooth(h),
    FLOOR_ANKLE_Y - FOOT_CLEARANCE * lift,
  );
  const toe = (ankle: Pt, tilt: number): Pt =>
    pt(ankle[0] + 10, ankle[1] + 3 - tilt);
  const aR = rightStance ? stanceAnkle : swingAnkle;
  const aL = rightStance ? swingAnkle : stanceAnkle;
  const tiltR = rightStance ? 0 : 4 * lift;
  const tiltL = rightStance ? 4 * lift : 0;

  // Free arm swings opposite the left leg: forward when the right foot leads.
  const swing = Math.cos(2 * Math.PI * t);
  const eL = pt(HIP[0] + 4 * swing, 98);
  const hL = pt(
    HIP[0] + 12 * swing,
    98 + Math.sqrt(16.1 * 16.1 - (8 * swing) ** 2),
  );

  return {
    head: [102, 64],
    neck: [100, 78],
    hip: HIP,
    eR: [100, 98],
    hR: [100, 118],
    eL,
    hL,
    kR: pt(...forwardKnee(HIP, aR)),
    aR,
    tR: toe(aR, tiltR),
    kL: pt(...forwardKnee(HIP, aL)),
    aL,
    tL: toe(aL, tiltL),
  };
}

/**
 * Two-handed farmer carry in profile: the same planted-stance / lifted-swing
 * walking cycle as the suitcase carry (t=1 equals t=0), with both weights
 * hanging at the sides and the torso upright. The hands only sway a few units
 * opposite each other at a constant forearm length.
 */
export function farmerCarryPose(progress: number): Pose {
  const t = ((progress % 1) + 1) % 1;
  const legs = suitcaseCarryPose(t);
  const sway = 3 * Math.cos(2 * Math.PI * t);
  const forearm = (dx: number) =>
    pt(HIP[0] + dx, 98 + Math.sqrt(400 - dx * dx));
  return {
    ...legs,
    eR: [100, 98],
    hR: forearm(-sway),
    eL: [100, 98],
    hL: forearm(sway),
  };
}
