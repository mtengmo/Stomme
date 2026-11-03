import { fromAngle, solveTwoBone } from './keyframes';
import { lerpPt, type Pt } from './lerp';
import type { Pose } from './poses';

/**
 * One body for the squat family (squat-curl, thrusters, goblet squats): fixed
 * ankles, hip sliding back and down, torso leaning forward, legs and arms from
 * two-bone IK so no segment changes length. Facing right, floor at y = 178.
 */
export type SquatFamilyId =
  | 'squat-curl'
  | 'thruster'
  | 'single-arm-thruster'
  | 'goblet-squat'
  | 'kettlebell-goblet-squat';

export const SQUAT_FAMILY_IDS: readonly SquatFamilyId[] = [
  'squat-curl',
  'thruster',
  'single-arm-thruster',
  'goblet-squat',
  'kettlebell-goblet-squat',
];

const STAND_HIP: Pt = [98, 118];
const BOTTOM_HIP: Pt = [81, 140];
const TORSO = 44;
const NECK_TO_HEAD = 14;
const THIGH = 30.8;
const SHIN = 26.5;
const ANKLE_R: Pt = [108, 174];
const ANKLE_L: Pt = [86, 174];
const TOE = (a: Pt): Pt => [a[0] + 11, a[1] + 3];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const polar = (o: Pt, len: number, angle: number): Pt => [
  o[0] + len * Math.cos(angle),
  o[1] + len * Math.sin(angle),
];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const smooth = (u: number) => u * u * (3 - 2 * u);

/**
 * Squat-curl is a one-way sequence: stand with hanging arms, squat down with
 * the arms hanging, rise while curling, then lower the dumbbells standing. The
 * last frame equals the first so the loop has no seam.
 */
export const SQUAT_CURL_BOTTOM = 0.3;
export const SQUAT_CURL_TOP = 0.65;
export function squatCurlPhase(t: number): { depth: number; curl: number } {
  if (t <= SQUAT_CURL_BOTTOM)
    return { depth: smooth(t / SQUAT_CURL_BOTTOM), curl: 0 };
  if (t <= SQUAT_CURL_TOP) {
    const u = smooth(
      (t - SQUAT_CURL_BOTTOM) / (SQUAT_CURL_TOP - SQUAT_CURL_BOTTOM),
    );
    return { depth: 1 - u, curl: u };
  }
  if (t <= 0.75) return { depth: 0, curl: 1 };
  if (t <= 0.9) return { depth: 0, curl: 1 - smooth((t - 0.75) / 0.15) };
  return { depth: 0, curl: 0 };
}

/** Labelled stills for reduced motion; the loop itself starts standing. */
export function squatFamilyStills(
  id: SquatFamilyId,
): readonly (readonly [string, number])[] | undefined {
  if (id === 'squat-curl')
    return [
      ['Start', 0],
      ['Botten', SQUAT_CURL_BOTTOM],
      ['Upp med curl', SQUAT_CURL_TOP],
    ];
  if (id === 'thruster' || id === 'single-arm-thruster')
    return [
      ['Start', 0.5],
      ['Botten', 0],
      ['Slut', 1],
    ];
  return undefined;
}

/** `depth` 0 = standing, 1 = bottom of the squat. */
function body(depth: number) {
  const hip = lerpPt(STAND_HIP, BOTTOM_HIP, depth);
  const neck = fromAngle(hip, TORSO, mix(0, 0.6, depth));
  const head = fromAngle(neck, NECK_TO_HEAD, mix(0, 0.6, depth) + 0.05);
  const legR = solveTwoBone(hip, ANKLE_R, THIGH, SHIN, -1);
  const legL = solveTwoBone(hip, ANKLE_L, THIGH, SHIN, -1);
  return { hip, neck, head, legR, legL };
}

function assemble(
  depth: number,
  arms: { eR: Pt; hR: Pt; eL: Pt; hL: Pt },
): Pose {
  const { hip, neck, head, legR, legL } = body(depth);
  return {
    head,
    neck,
    hip,
    ...arms,
    kR: legR.mid,
    aR: legR.end,
    tR: TOE(legR.end),
    kL: legL.mid,
    aL: legL.end,
    tL: TOE(legL.end),
  };
}

function arm(
  neck: Pt,
  target: Pt,
  upper: number,
  lower: number,
): { e: Pt; h: Pt } {
  const r = solveTwoBone(neck, target, upper, lower, 1);
  return { e: r.mid, h: r.end };
}

/** Pose for a squat family exercise; `t` is the catalogue progress 0..1. */
export function squatFamilyPose(id: SquatFamilyId, progress: number): Pose {
  const t = clamp(progress);
  if (id === 'squat-curl') {
    const { depth, curl } = squatCurlPhase(t);
    const { neck } = body(depth);
    const angle = mix(1.52, -0.95, curl);
    const eR = polar(neck, 24, Math.PI / 2 - 0.1);
    const eL = polar(neck, 24, Math.PI / 2 + 0.05);
    return assemble(depth, {
      eR,
      hR: polar(eR, 23, angle),
      eL,
      hL: polar(eL, 23, angle),
    });
  }
  if (id === 'thruster' || id === 'single-arm-thruster') {
    const depth = t <= 0.5 ? 1 - t / 0.5 : 0;
    const press = t <= 0.5 ? 0 : (t - 0.5) / 0.5;
    const { neck } = body(depth);
    const reach = lerpPt([13, -2], [8, -43], press);
    const near = arm(neck, add(neck, reach), 23, 22);
    const far =
      id === 'thruster'
        ? arm(neck, add(neck, [reach[0] - 2, reach[1] + 1]), 23, 22)
        : arm(neck, add(neck, [-3, 44]), 23, 22);
    return assemble(depth, { eR: near.e, hR: near.h, eL: far.e, hL: far.h });
  }
  // Goblet squats: t = 0 standing, t = 1 bottom.
  const { neck } = body(t);
  const a = arm(neck, add(neck, [13, 6]), 24, 20);
  if (id === 'kettlebell-goblet-squat')
    return assemble(t, { eR: a.e, hR: a.h, eL: a.e, hL: a.h });
  const b = arm(neck, add(neck, [11, 9]), 24, 20);
  return assemble(t, { eR: a.e, hR: a.h, eL: b.e, hL: b.h });
}

export const isSquatFamily = (id: string): id is SquatFamilyId =>
  (SQUAT_FAMILY_IDS as readonly string[]).includes(id);
