import type { ExerciseId } from '../domain/types';
import { seatedKneeExtensionPose } from './additionalPoses';
import type { Pt } from './lerp';
import type { FigureSpec, Pose } from './poses';
import { joint } from './rehabPoses';

/**
 * Own parametric drawings for the knee programme (E49-E53). Side view facing
 * right, near side = R. Bone lengths are constants of each function, so a
 * limb never shrinks between frames; contact points are fixed by construction.
 */
export type PhysioFigureId =
  | 'quad-set'
  | 'seated-knee-flexion'
  | 'band-knee-extension'
  | 'band-hip-extension'
  | 'balance-clock';

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const rad = (deg: number) => (deg * Math.PI) / 180;
const toe = (a: Pt): Pt => [a[0] + 10, a[1] + 3];

function build(
  head: Pt,
  neck: Pt,
  hip: Pt,
  arms: [Pt, Pt, Pt, Pt],
  legs: [Pt, Pt, Pt, Pt, Pt, Pt],
): Pose {
  const [eR, hR, eL, hL] = arms;
  const [kR, aR, tR, kL, aL, tL] = legs;
  return { head, neck, hip, eR, hR, eL, hL, kR, aR, tR, kL, aL, tL };
}

/** Bone lengths per pose, exported so tests and drawings share one source. */
export const QUAD_SET = {
  hip: [99, 171] as Pt,
  heelY: 174,
  thigh: 35,
  shin: 33,
  footLength: 10.4,
  kneeStartY: 168.5,
  /** The knee presses 5 px down, onto the floor. */
  kneeEndY: 173.5,
} as const;

/** Heel fixed on the floor; the knee presses down and the toes pull up. */
export function quadSetPose(progress: number): Pose {
  const t = clamp01(progress);
  const { hip, thigh, shin, heelY, footLength } = QUAD_SET;
  const kneeY = mix(QUAD_SET.kneeStartY, QUAD_SET.kneeEndY, t);
  const knee: Pt = [
    hip[0] + Math.sqrt(thigh ** 2 - (kneeY - hip[1]) ** 2),
    kneeY,
  ];
  // Slide the ankle along the floor only by the sub-pixel the shin needs.
  const ankle: Pt = [
    knee[0] + Math.sqrt(shin ** 2 - (heelY - kneeY) ** 2),
    heelY,
  ];
  const angle = rad(mix(-35, -80, t));
  const toes: Pt = [
    ankle[0] + footLength * Math.cos(angle),
    ankle[1] + footLength * Math.sin(angle),
  ];
  // Far leg: straight and resting a little higher (further from the viewer).
  const farAnkle: Pt = [hip[0] + 67.9, 172];
  const farKnee = joint(hip, farAnkle, thigh, shin, -1);
  const relaxed = rad(-35);
  const farToe: Pt = [
    farAnkle[0] + footLength * Math.cos(relaxed),
    farAnkle[1] + footLength * Math.sin(relaxed),
  ];
  return build(
    [40, 168],
    [54, 171],
    hip,
    [
      [70, 174],
      [88, 174],
      [63, 174],
      [81, 174],
    ],
    [knee, ankle, toes, farKnee, farAnkle, farToe],
  );
}

export const SEATED_FLEXION = {
  hip: [83, 136] as Pt,
  thigh: 32,
  shin: 39,
  floorY: 174,
  startX: 122,
  endX: 97,
  farAnkleX: 130,
} as const;

/**
 * Seated knee bend: the hip stays on the seat and the working ankle slides
 * along the floor from in front of the knee back under the front edge.
 */
export function seatedKneeFlexionPose(progress: number): Pose {
  const t = clamp01(progress);
  const { hip, thigh, shin, floorY } = SEATED_FLEXION;
  const ankle: Pt = [
    mix(SEATED_FLEXION.startX, SEATED_FLEXION.endX, t),
    floorY,
  ];
  const knee = joint(hip, ankle, thigh, shin, -1);
  const farAnkle: Pt = [SEATED_FLEXION.farAnkleX, floorY];
  const farKnee = joint(hip, farAnkle, thigh, shin, -1);
  return build(
    [85, 79],
    [84, 93],
    hip,
    [
      [89, 115],
      [104, 134],
      [80, 115],
      [95, 134],
    ],
    [knee, ankle, toe(ankle), farKnee, farAnkle, toe(farAnkle)],
  );
}

/** Fixed point at the bottom of the front chair leg, behind the working foot. */
export const BAND_KNEE_ANCHOR: Pt = [113.5, 172];

export const BAND_HIP = {
  hip: [98, 117] as Pt,
  thigh: 30,
  shin: 27,
  farThigh: 31,
  farShin: 27,
  // Hip-to-ankle equals thigh + shin: the stance leg is straight.
  farAnkle: [98 + Math.sqrt(58 ** 2 - 57 ** 2), 174] as Pt,
  startAngle: 0,
  /** Degrees behind vertical at the end of the movement. */
  endAngle: 20,
} as const;

/** Standing at the wall; the near leg swings back, straight, trunk upright. */
export function bandHipExtensionPose(progress: number): Pose {
  const t = clamp01(progress);
  const { hip, thigh, shin, farAnkle } = BAND_HIP;
  const a = rad(-mix(BAND_HIP.startAngle, BAND_HIP.endAngle, t));
  const dir: Pt = [Math.sin(a), Math.cos(a)];
  const knee: Pt = [hip[0] + thigh * dir[0], hip[1] + thigh * dir[1]];
  const ankle: Pt = [
    hip[0] + (thigh + shin) * dir[0],
    hip[1] + (thigh + shin) * dir[1],
  ];
  const farKnee = joint(hip, farAnkle, BAND_HIP.farThigh, BAND_HIP.farShin, -1);
  return build(
    [99, 59],
    [98, 73],
    hip,
    [
      [126, 85],
      [155, 98],
      [122, 89],
      [155, 102],
    ],
    [
      knee,
      ankle,
      [ankle[0] + 9, ankle[1] + 4],
      farKnee,
      farAnkle,
      toe(farAnkle),
    ],
  );
}

export const CLOCK = {
  hip: [100, 118] as Pt,
  standAnkle: [100, 174] as Pt,
  thigh: 30,
  shin: 27,
  trunk: 44,
  footLength: 10.44,
  /** Keyframes of the free foot: toe x on the floor and the foot angle. */
  together: { toeX: 118, angle: 16.7 },
  forward: { toeX: 131, angle: 48 },
  back: { toeX: 80, angle: 72 },
  floorToeY: 177,
  handNear: [155, 98] as Pt,
  handFar: [155, 102] as Pt,
  lift: 2,
  /** Degrees the foot flattens mid-swing so the leg stays long and low. */
  flatten: 18,
  leanDeg: 5,
} as const;

/** Smooth 0..1 with a dwell at both ends so the touches read as touches. */
const dwell = (u: number) => {
  const c = clamp01((u - 0.12) / 0.76);
  return c * c * (3 - 2 * c);
};

/**
 * Side view of the balance clock: the near leg stands, the far foot taps the
 * floor in front (middle pose) and behind (end pose), lifting between taps.
 */
export function balanceClockPose(progress: number): Pose {
  const t = clamp01(progress);
  const { hip, standAnkle, thigh, shin, trunk, footLength } = CLOCK;
  // Segment 1 (0..0.5): together -> forward tap. Segment 2: forward -> back.
  const first = t < 0.5;
  const u = dwell(first ? t * 2 : (t - 0.5) * 2);
  const from = first ? CLOCK.together : CLOCK.forward;
  const to = first ? CLOCK.forward : CLOCK.back;
  const toeX = mix(from.toeX, to.toeX, u);
  const angle = rad(
    mix(from.angle, to.angle, u) - CLOCK.flatten * Math.sin(Math.PI * u),
  );
  const lift = CLOCK.lift * Math.sin(Math.PI * u);
  const toeTip: Pt = [toeX, CLOCK.floorToeY - lift];
  const farAnkle: Pt = [
    toeTip[0] - footLength * Math.cos(angle),
    toeTip[1] - footLength * Math.sin(angle),
  ];
  const farKnee = joint(hip, farAnkle, thigh, shin, -1);
  const standKnee = joint(hip, standAnkle, thigh, shin, -1);
  // Counterbalance: the trunk leans slightly away from the reaching foot.
  const lean = rad(
    first ? mix(0, -CLOCK.leanDeg, u) : mix(-CLOCK.leanDeg, CLOCK.leanDeg, u),
  );
  const neck: Pt = [
    hip[0] + trunk * Math.sin(lean),
    hip[1] - trunk * Math.cos(lean),
  ];
  const head: Pt = [
    neck[0] + 14 * Math.sin(lean),
    neck[1] - 14 * Math.cos(lean),
  ];
  return build(
    head,
    neck,
    hip,
    // Both hands rest on the wall the whole time; the elbows follow.
    [
      joint(neck, CLOCK.handNear, 33, 33, 1),
      CLOCK.handNear,
      joint(neck, CLOCK.handFar, 33, 33, 1),
      CLOCK.handFar,
    ],
    [standKnee, standAnkle, toe(standAnkle), farKnee, farAnkle, toeTip],
  );
}

const mat: FigureSpec['props'] = [{ type: 'mat', x1: 14, x2: 186 }];
const wall: FigureSpec['props'] = [{ type: 'wall', x: 157 }];
const kneeChair: FigureSpec['props'] = [
  { type: 'chair', x: 66, y: 139, w: 47 },
];

export const physioFigures: Record<PhysioFigureId, FigureSpec> = {
  'quad-set': {
    start: quadSetPose(0),
    end: quadSetPose(1),
    props: mat,
    motion: 'controlled',
  },
  'seated-knee-flexion': {
    start: seatedKneeFlexionPose(0),
    end: seatedKneeFlexionPose(1),
    // The chair sits behind the figure in the drawing, so the sliding foot
    // passes in front of its far-side legs.
    props: [{ type: 'chair', x: 66, y: 144, w: 47 }],
  },
  'band-knee-extension': {
    start: seatedKneeExtensionPose(0),
    end: seatedKneeExtensionPose(1),
    props: kneeChair,
    band: { from: BAND_KNEE_ANCHOR, to: 'aR', rest: 50 },
  },
  'band-hip-extension': {
    start: bandHipExtensionPose(0),
    end: bandHipExtensionPose(1),
    props: wall,
    band: { from: 'aL', to: 'aR', rest: 28, offset: [0, -7] },
  },
  'balance-clock': {
    start: balanceClockPose(0),
    middle: balanceClockPose(0.5),
    end: balanceClockPose(1),
    props: wall,
  },
};

export function physioMovementPose(
  id: ExerciseId,
  t: number,
): Pose | undefined {
  switch (id) {
    case 'quad-set':
      return quadSetPose(t);
    case 'seated-knee-flexion':
      return seatedKneeFlexionPose(t);
    case 'band-knee-extension':
      return seatedKneeExtensionPose(t);
    case 'band-hip-extension':
      return bandHipExtensionPose(t);
    case 'balance-clock':
      return balanceClockPose(t);
    default:
      return undefined;
  }
}
