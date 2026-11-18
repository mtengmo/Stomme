import type { ExerciseId } from '../domain/types';
import { movementPose } from './movementPose';
import {
  type Body3,
  fromProfile,
  type ObliqueSpec,
  type ObliqueSurface3,
  type P3,
} from './obliqueBody';
import type { PoseKey } from './poses';

/**
 * Lying and standing exercises that get a "Sned vinkel" second view from the
 * shared yaw-only body model (`obliqueBody.ts`). Add an id here, give it a
 * spec below, append it to `supportedObliqueViews` in `frontViews.tsx` and pin
 * it in `frontViews.test.tsx`.
 */
export const LYING_OBLIQUE_IDS = [
  'prone-leg-raise',
  'side-lying-hip-abduction',
  'side-lying-hip-adduction',
  'single-leg-floor-bridge',
  'kettlebell-floor-press',
  'quadriceps-stretch',
  'balance-clock',
] as const satisfies readonly ExerciseId[];

export type LyingObliqueId = (typeof LYING_OBLIQUE_IDS)[number];

/** The mat is a flat 36 px deep quad at the floor height. */
const MAT_Y = 177;

const matSurface = (): ObliqueSurface3[] => [
  {
    kind: 'mat',
    corners: [
      [16, MAT_Y, -18],
      [184, MAT_Y, -18],
      [184, MAT_Y, 18],
      [16, MAT_Y, 18],
    ],
  },
];

/** The profile draws the far leg 4 px above the mat; in 3D it rests on it. */
const FAR_LIMB_DROP = 4;

/**
 * Prone leg raise. The camera yaws 35 degrees towards the feet end, the
 * working (right) side faces it. Arms and legs are free, so the lifted leg
 * swings along its raw projected direction at constant length, the far leg
 * stays flat on the mat and both legs are separated sideways. The pelvis bar
 * is horizontal (the pelvis stays level on the mat).
 */
const PRONE_LEG_RAISE: ObliqueSpec = {
  profile: 'prone-leg-raise',
  yawDeg: 35,
  elevDeg: 25,
  // Tight frame, symmetric about x = 96 so the left side (mirrored) fits too.
  viewBox: '20 108 152 86',
  near: 'working',
  body: (t: number): Body3 => {
    const profile = movementPose('prone-leg-raise', t);
    const base = fromProfile(profile, 1);
    // Legs sit +-15 in depth so the far leg clears the near one; the bars
    // are long enough to read as about 12 and 16 px half widths when drawn.
    const legs = (side: 'R' | 'L', z: number, drop: number) => ({
      [`k${side}`]: [base[`k${side}`][0], base[`k${side}`][1] + drop, z] as P3,
      [`a${side}`]: [base[`a${side}`][0], base[`a${side}`][1] + drop, z] as P3,
      [`t${side}`]: [base[`t${side}`][0], base[`t${side}`][1] + drop, z] as P3,
    });
    return fromProfile(
      profile,
      1,
      { ...legs('R', 15, 0), ...legs('L', -15, FAR_LIMB_DROP) },
      19,
      25,
    );
  },
  limbs: { armR: 'free', armL: 'free', legR: 'straight', legL: 'straight' },
  props: () => [],
  surfaces: matSurface,
};

/**
 * Side-lying hip abduction / adduction. The spine runs along x, the body's
 * left-right axis is vertical, so the pelvis and shoulder bars are vertical
 * (stacked) and only depth (front of the body) separates the legs. The lifted
 * working leg is straight; the support foot rests on the mat in front, pinned
 * to its projected contact so it does not slide.
 */
const sideLyingSpec = (profile: LyingObliqueId): ObliqueSpec => ({
  profile,
  yawDeg: 35,
  elevDeg: 25,
  viewBox: '20 108 152 86',
  near: 'working',
  body: (t: number): Body3 => ({
    ...fromProfile(movementPose(profile, t), 1),
    pelvisAxis: [0, 1, 0],
    shoulderAxis: [0, 1, 0],
  }),
  limbs: { armR: 'free', armL: 'free', legR: 'straight', legL: 'pinned' },
  props: () => [],
  surfaces: matSurface,
});

/**
 * Supine on the mat (floor bridge, floor press): feet planted and pinned to
 * their projected contact, arms free; `legs` overrides the leg modes.
 */
const supineSpec = (
  profile: LyingObliqueId,
  legs: Pick<ObliqueSpec['limbs'], 'legR' | 'legL'>,
  held?: ObliqueSpec['held'],
): ObliqueSpec => ({
  profile,
  yawDeg: 35,
  elevDeg: 25,
  viewBox: '20 108 152 86',
  near: 'working',
  body: (t: number): Body3 =>
    fromProfile(movementPose(profile, t), 1, {}, 19, 25),
  limbs: { armR: 'free', armL: 'free', ...legs },
  props: () => [],
  surfaces: matSurface,
  held,
});

const FLOOR_Y = 178;
const floorSurface = (): ObliqueSurface3[] => [
  {
    kind: 'floor',
    corners: [
      [16, FLOOR_Y, -18],
      [184, FLOOR_Y, -18],
      [184, FLOOR_Y, 18],
      [16, FLOOR_Y, 18],
    ],
  },
];
const wallSurface = (x: number) => (): ObliqueSurface3[] => [
  ...floorSurface(),
  {
    kind: 'wall',
    corners: [
      [x, 40, -18],
      [x, 40, 18],
      [x, FLOOR_Y, 18],
      [x, FLOOR_Y, -18],
    ],
  },
];

/**
 * Standing exercises: a floor slab (and optionally the wall of the profile),
 * the stance foot pinned to its projected contact. Legs sit at +-`legZ` in
 * depth: a larger offset separates the legs but lowers the near foot, so the
 * stance leg must stay reachable (the pinned ankle is tested).
 */
const standingSpec = (
  profile: LyingObliqueId,
  limbs: ObliqueSpec['limbs'],
  options: {
    wallX?: number;
    legZ?: number;
    viewBox?: string;
    handHoldsAnkle?: boolean;
  } = {},
): ObliqueSpec => ({
  profile,
  yawDeg: 35,
  elevDeg: 25,
  viewBox: options.viewBox ?? '20 36 152 156',
  near: 'working',
  body: (t: number): Body3 => {
    const base = fromProfile(movementPose(profile, t), 1, {}, 19, 25);
    const z = options.legZ ?? 3;
    const legs = {} as Partial<Record<PoseKey, P3>>;
    for (const k of ['kR', 'aR', 'tR'] as const)
      legs[k] = [base[k][0], base[k][1], z];
    for (const k of ['kL', 'aL', 'tL'] as const)
      legs[k] = [base[k][0], base[k][1], -z];
    if (options.handHoldsAnkle) legs.hR = [base.hR[0], base.hR[1], z];
    return fromProfile(movementPose(profile, t), 1, legs, 19, 25);
  },
  limbs,
  props: () => [],
  surfaces:
    options.wallX === undefined ? floorSurface : wallSurface(options.wallX),
});

export const LYING_OBLIQUE: Record<LyingObliqueId, ObliqueSpec> = {
  'prone-leg-raise': PRONE_LEG_RAISE,
  'side-lying-hip-abduction': sideLyingSpec('side-lying-hip-abduction'),
  'side-lying-hip-adduction': sideLyingSpec('side-lying-hip-adduction'),
  // Calibrated at the upper third of the lift so the shoulders stay within 1 unit
  // of the mat at both ends (the projected trunk length varies with the tilt).
  'single-leg-floor-bridge': {
    ...supineSpec('single-leg-floor-bridge', {
      legR: 'pinned',
      legL: 'straight',
    }),
    calibrateAt: 0.75,
    // A lower yaw steepens the bars (about 51 degrees) so they stay clear of the
    // trunk, which tilts about 35 degrees at the top of the bridge.
    yawDeg: 20,
    // The free leg reaches up to y 85.
    viewBox: '20 72 152 122',
  },
  // The right hand holds the right ankle (same depth, both pinned to the same
  // projected point); the left hand rests on the wall. Lengths come from the
  // straight left side so the bent right leg does not shorten the reach.
  'quadriceps-stretch': {
    ...standingSpec(
      'quadriceps-stretch',
      { armR: 'pinned', armL: 'pinned', legR: 'pinned', legL: 'pinned' },
      { wallX: 157, handHoldsAnkle: true },
    ),
    lengthsFrom: { arm: 'L', leg: 'L' },
  },
  // Both hands rest on the wall and the stance foot is planted (all pinned);
  // the moving foot is free. Lengths come from the straight stance leg.
  'balance-clock': {
    ...standingSpec(
      'balance-clock',
      { armR: 'pinned', armL: 'pinned', legR: 'pinned', legL: 'pinned' },
      { wallX: 157 },
    ),
    lengthsFrom: { leg: 'L' },
  },
  'kettlebell-floor-press': supineSpec(
    'kettlebell-floor-press',
    { legR: 'pinned', legL: 'pinned' },
    { kind: 'kettlebell', pressGrip: true },
  ),
};

export function isLyingOblique(id: ExerciseId): id is LyingObliqueId {
  return (LYING_OBLIQUE_IDS as readonly ExerciseId[]).includes(id);
}
