import type { ExerciseId } from '../domain/types';
import { CARRY_SHIN, CARRY_THIGH } from './carryPoses';
import type { Equipment, Working } from './Figure';
import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import { mirrorAbout, obliqueFrame } from './obliqueBody';
import {
  isLyingOblique,
  LYING_OBLIQUE,
  type LYING_OBLIQUE_IDS,
} from './obliqueSpecs';
import type { Pose } from './poses';
import { figures } from './poses';
import { FloorLine, Held, PropShape, pressGripAngle } from './props';
import { joint } from './rehabPoses';
import {
  SQUAT_FAMILY_SHIN as SQUAT_SHIN,
  SQUAT_FAMILY_THIGH as SQUAT_THIGH,
} from './squatFamilyKeyframes';

export const supportedFrontViews = [
  'seated-tibial-rotation',
  'single-leg-lateral-hop',
  'in-and-out-jump',
  'lateral-shuffle',
  'goblet-squat',
  'dumbbell-rdl',
  'kettlebell-rack-carry',
  'step-up',
  'step-down',
  'rear-foot-split-squat',
  'suitcase-carry',
  'reverse-lunge',
  'forward-lunge',
  'half-squat',
  'single-leg-chair-squat',
  'side-lunge',
  'farmer-carry',
  'woodchop',
  'kettlebell-goblet-squat',
] as const satisfies readonly ExerciseId[];

export const supportedObliqueViews = [
  'goblet-chair-squat',
  'split-squat',
  'bench-side-plank-leg-lift',
  'russian-twist',
  'prone-leg-raise',
  'side-lying-hip-abduction',
  'side-lying-hip-adduction',
  'single-leg-floor-bridge',
  'kettlebell-floor-press',
  'quadriceps-stretch',
  'balance-clock',
  'balance-pendulum',
] as const satisfies readonly ExerciseId[];

/** Front-only demonstrations: the movement cannot be read from the side. */
export const FRONT_ONLY: readonly ExerciseId[] = [
  'seated-tibial-rotation',
  'single-leg-lateral-hop',
  'in-and-out-jump',
  'lateral-shuffle',
];

export type FigureAngle = 'side' | 'front' | 'oblique';

/** Start with the angle that explains each movement most clearly. */
export function defaultViewFor(exerciseId: ExerciseId): FigureAngle {
  if (FRONT_ONLY.includes(exerciseId)) return 'front';
  if (
    exerciseId === 'side-lunge' ||
    exerciseId === 'woodchop' ||
    exerciseId === 'kettlebell-goblet-squat'
  )
    return 'front';
  if (exerciseId === 'russian-twist') return 'oblique';
  return 'side';
}

export function supportsObliqueView(
  exerciseId: ExerciseId,
): exerciseId is (typeof supportedObliqueViews)[number] {
  return (supportedObliqueViews as readonly ExerciseId[]).includes(exerciseId);
}

export function supportedViewsFor(
  exerciseId: ExerciseId,
): readonly FigureAngle[] {
  if (FRONT_ONLY.includes(exerciseId)) return ['front'];
  if (supportsFrontView(exerciseId)) return ['side', 'front'];
  if (supportsObliqueView(exerciseId)) return ['side', 'oblique'];
  return ['side'];
}

export function alternateView(
  exerciseId: ExerciseId,
): 'front' | 'oblique' | undefined {
  const views = supportedViewsFor(exerciseId);
  return views.length === 1 ? undefined : (views[1] as 'front' | 'oblique');
}

export type FrontViewExercise = (typeof supportedFrontViews)[number];
export type ObliqueViewExercise = (typeof supportedObliqueViews)[number];

export function supportsFrontView(
  exerciseId: ExerciseId,
): exerciseId is FrontViewExercise {
  return (supportedFrontViews as readonly ExerciseId[]).includes(exerciseId);
}

const clamp = (t: number) => Math.max(0, Math.min(1, t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const point = (x: number, y: number): Pt => [x, y];

/** Step-down front view: the upright railing the support hand holds. */
export const STEP_DOWN_FRONT_RAIL_X = 136;
export const STEP_DOWN_FRONT_GRIP_Y = 90;
const FRONT_UPPER_ARM = Math.hypot(22, 22);
const FRONT_FOREARM = Math.hypot(6, 22);

function skeleton(
  head: Pt,
  neck: Pt,
  hip: Pt,
  eR: Pt,
  hR: Pt,
  eL: Pt,
  hL: Pt,
  kR: Pt,
  aR: Pt,
  tR: Pt,
  kL: Pt,
  aL: Pt,
  tL: Pt,
): Pose {
  return { head, neck, hip, eR, hR, eL, hL, kR, aR, tR, kL, aL, tL };
}

/** A hair under the 36 px side-view thigh so rounding never exceeds the front-view limit. */
const FRONT_THIGH = 35.9;
/** Thigh and shin of the standing profile figure (`stand` in additionalPoses.ts): the front caps. */
const FRONT_STAND_THIGH = 30.6;
const FRONT_STAND_SHIN = 26.3;
/** Front stance from the hip and both ankles; the legs are solved so thigh and shin keep their length. */
function frontStance(hip: Pt, aR: Pt, aL: Pt, toeDx: number): Pose {
  const neck = point(hip[0], hip[1] - 43);
  return skeleton(
    point(hip[0], neck[1] - 14),
    neck,
    hip,
    point(hip[0] - 18, neck[1] + 19),
    point(hip[0] - 23, neck[1] + 41),
    point(hip[0] + 18, neck[1] + 19),
    point(hip[0] + 23, neck[1] + 41),
    joint(hip, aR, FRONT_THIGH, 34, 1),
    aR,
    point(aR[0] - toeDx, aR[1] + 3),
    joint(hip, aL, FRONT_THIGH, 34, -1),
    aL,
    point(aL[0] + toeDx, aL[1] + 3),
  );
}
const smooth = (x: number) => x * x * (3 - 2 * x);
/** Oblique bodyweight split squat: the wall in front of a right / left front leg. */
const SPLIT_WALL_X_LEFT = 56;
const SPLIT_WALL_X_RIGHT = 144;

/** Floor markers of the in-and-out jump sit this far from the body's centre line. */
export const IN_OUT_MARKER_DX = 25;
/**
 * Feet together between the markers (t=0), a light jump, feet wide outside
 * them (t=1). The knees follow the toes outwards and the landing is deeper.
 */
function inAndOutPose(t: number): Pose {
  const s = smooth(t);
  const lift = 10 * Math.sin(Math.PI * t);
  const half = mix(5, 36, s);
  const reach = mix(66, 56, s);
  const hip = point(100, 174 - lift - reach);
  return frontStance(
    hip,
    point(100 - half, 174 - lift),
    point(100 + half, 174 - lift),
    9,
  );
}

/** The line of the lateral shuffle (a tick in the front view). */
export const SHUFFLE_LINE_X = 100;
/**
 * Two side steps to the right: the left (leading) foot steps over the line
 * and the right foot follows, then the same again. The legs move one at a
 * time, so one foot is always on the floor; the ankles stay 32-60 px apart
 * and never cross. At t=0 both feet are left of the line and at t=1 both are
 * right of it; the hip travels from x 72 to 128. Invariant: a foot that is on
 * the floor (less than 1 px up) has ankle and toe more than 4 px from the
 * line, so a foot only passes the line while it is in the air. The knees stay
 * slightly bent throughout.
 */
function lateralShufflePose(t: number): Pose {
  const p1 = clamp(4 * t),
    p2 = clamp(4 * t - 1),
    p3 = clamp(4 * t - 2),
    p4 = clamp(4 * t - 3);
  const xL = 88 + 28 * smooth(p1) + 28 * smooth(p3),
    xR = 56 + 28 * smooth(p2) + 28 * smooth(p4);
  const liftL = 10 * (Math.sin(Math.PI * p1) + Math.sin(Math.PI * p3));
  const liftR = 10 * (Math.sin(Math.PI * p2) + Math.sin(Math.PI * p4));
  const hip = point((xL + xR) / 2, 116);
  return frontStance(hip, point(xR, 174 - liftR), point(xL, 174 - liftL), 6);
}

/**
 * Hop from side to side on the working leg: the foot leaves the floor
 * mid-hop, the free foot stays beside the calf, and every segment keeps its
 * length. Authored for the right leg; the left is its mirror image.
 */
function lateralHopPose(t: number, working: Working | null): Pose {
  const lift = 12 * Math.sin(Math.PI * t);
  // The knee bends further at each landing and is longest mid-hop.
  const reach = 66 + 3.5 * Math.sin(Math.PI * t);
  const hx = mix(85, 115, t);
  const hip = point(hx, 174 - lift - reach);
  const neck = point(hx, hip[1] - 43);
  const supportAnkle = point(hx, 174 - lift);
  const freeAnkle = point(hx + 9, supportAnkle[1] - 24);
  const right = {
    knee: joint(hip, supportAnkle, 36, 34, 1),
    ankle: supportAnkle,
    toe: point(supportAnkle[0] - 10, supportAnkle[1] + 3),
  };
  const left = {
    knee: joint(hip, freeAnkle, 36, 34, -1),
    ankle: freeAnkle,
    toe: point(freeAnkle[0] + 9, freeAnkle[1] + 3),
  };
  const pose = skeleton(
    point(hx, neck[1] - 14),
    neck,
    hip,
    point(hx - 18, neck[1] + 19),
    point(hx - 23, neck[1] + 41),
    point(hx + 18, neck[1] + 19),
    point(hx + 23, neck[1] + 41),
    right.knee,
    right.ankle,
    right.toe,
    left.knee,
    left.ankle,
    left.toe,
  );
  if (working !== 'left') return pose;
  const flip = (pt: Pt): Pt => point(200 - pt[0], pt[1]);
  return {
    head: flip(pose.head),
    neck: flip(pose.neck),
    hip: flip(pose.hip),
    eR: flip(pose.eL),
    hR: flip(pose.hL),
    eL: flip(pose.eR),
    hL: flip(pose.hR),
    kR: flip(pose.kL),
    aR: flip(pose.aL),
    tR: flip(pose.tL),
    kL: flip(pose.kR),
    aL: flip(pose.aR),
    tL: flip(pose.tR),
  };
}

/** Mirrors a pose authored for the right side about the body's centre line (x = 100). */
function mirrorPose(pose: Pose): Pose {
  return mirrorAbout(pose, 200);
}

/**
 * Woodchop from the front, authored for the right start side (viewer's left):
 * both hands share one grip and travel the straight diagonal from the right
 * hip, across the chest, to above the left shoulder. The trunk and hips turn
 * with it (hip and neck shift towards the finish side), and the right foot
 * turns on the floor: the toe swings from pointing out to pointing across
 * while the heel rises, with the knee following. The left foot stays planted. Thigh, shin and arm segments keep their lengths (IK).
 */
export const WOODCHOP_FRONT_FIXED_FOOT_X = 118;

/**
 * Knee of a leg whose lower leg turns with the foot. `bend` is the sideways
 * bend of the knee off the hip-ankle line: 1 = fully outward, -1 = fully
 * inward, 0 = straight in line (the knee points at the viewer). In between the
 * knee swings about the hip-ankle axis, so the segments shorten a little in
 * this frontal projection, the way a turned knee foreshortens.
 */
function turnedKnee(
  hip: Pt,
  ankle: Pt,
  bend: number,
  thigh: number,
  shin: number,
): Pt {
  const dx = ankle[0] - hip[0];
  const dy = ankle[1] - hip[1];
  const d = Math.hypot(dx, dy);
  const along = (thigh * thigh - shin * shin + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, thigh * thigh - along * along));
  return point(
    hip[0] + (dx / d) * along - (dy / d) * height * bend,
    hip[1] + (dy / d) * along + (dx / d) * height * bend,
  );
}
/**
 * Front legs of the three carries: the profile gait's thigh and shin (30, 29),
 * hip at the profile height, the left foot swinging first (t < 0.5) and the
 * right second, as in `suitcaseCarryPose`.
 */
function carryFrontLegs(t: number): {
  hip: Pt;
  limbs: [Pt, Pt, Pt, Pt, Pt, Pt];
} {
  const stride = Math.sin(2 * Math.PI * t);
  const liftL = Math.max(0, stride);
  const liftR = Math.max(0, -stride);
  const hip = point(100, 118);
  const aR = point(82, 174 - 9 * liftR);
  const aL = point(118, 174 - 9 * liftL);
  return {
    hip,
    limbs: [
      joint(hip, aR, CARRY_THIGH, CARRY_SHIN, 1),
      aR,
      point(72, 177 - 9 * liftR),
      joint(hip, aL, CARRY_THIGH, CARRY_SHIN, -1),
      aL,
      point(128, 177 - 9 * liftL),
    ],
  };
}
function woodchopFrontPose(t: number): Pose {
  const s = smooth(t);
  // The hip stays within reach of the planted foot (thigh 30.6 + shin 26.3 as in
  // the profile).
  const hip = point(mix(96, 104, s), mix(122, 119.5, s));
  const neck = point(mix(93, 107, s), hip[1] - 43);
  const head = point(neck[0] + mix(-1, 2, s), neck[1] - 14);
  // The shared grip: right hip, up across the chest, over the left shoulder.
  // The arc bows out and down in the middle, as the arms reach forward.
  const bow = Math.sin(Math.PI * s);
  const grip = point(mix(86, 122, s) + 10 * bow, mix(120, 36, s) + 20 * bow);
  // Both hands hold one weight, so both arms follow the same chain.
  const arm = solveTwoBone(neck, grip, 24.6, 22.6, -1);
  // Right (pivot) foot: the toe stays on the floor and the foot turns about
  // it, from pointing outwards to pointing across; as it turns the heel rises
  // (ankle y = 177 - foot length * sin) with the foot length constant.
  const footLength = Math.hypot(9, 3);
  const angle = mix(Math.atan2(3, -9), Math.atan2(6.5, 6.9), s);
  const aR = point(82, 177 - footLength * Math.sin(angle));
  const tR = point(aR[0] + footLength * Math.cos(angle), 177);
  const aL = point(WOODCHOP_FRONT_FIXED_FOOT_X, 174);
  const tL = point(aL[0] + 9, 177);
  return skeleton(
    head,
    neck,
    hip,
    arm.mid,
    arm.end,
    arm.mid,
    arm.end,
    // The knee follows the foot: outward while the toe points out, over the
    // inward-pointing toe at the finish (not outward of a toe that points in).
    turnedKnee(hip, aR, mix(1, -0.8, s), FRONT_STAND_THIGH, FRONT_STAND_SHIN),
    aR,
    tR,
    joint(hip, aL, FRONT_STAND_THIGH, FRONT_STAND_SHIN, -1),
    aL,
    tL,
  );
}

/** Purpose-drawn frontal geometry for the small set of readable front views. */
export function frontMovementPose(
  exerciseId: FrontViewExercise,
  progress: number,
  working: Working | null = 'right',
): Pose {
  const t = clamp(progress);
  if (exerciseId === 'woodchop')
    return working === 'left'
      ? mirrorPose(woodchopFrontPose(t))
      : woodchopFrontPose(t);
  if (exerciseId === 'in-and-out-jump') return inAndOutPose(t);
  if (exerciseId === 'lateral-shuffle') return lateralShufflePose(t);
  if (exerciseId === 'single-leg-lateral-hop')
    return lateralHopPose(t, working);
  if (exerciseId === 'seated-tibial-rotation') {
    // Feet rotate in the horizontal plane; the shins and knees stay still.
    const angle = mix(0.65, -0.65, t);
    const dx = 13 * Math.sin(angle),
      dy = 8 * Math.cos(angle);
    return skeleton(
      [100, 61],
      [100, 76],
      [100, 116],
      [78, 99],
      [88, 121],
      [122, 99],
      [112, 121],
      [92, 132],
      [90, 164],
      [90 + dx, 164 + dy],
      [108, 132],
      [110, 164],
      [110 - dx, 164 + dy],
    );
  }
  if (exerciseId === 'half-squat') {
    const depth = t;
    const hipY = mix(112, 131, depth);
    const kneeY = mix(148, 151, depth);
    const kneeDX = mix(19, 27, depth);
    const ankleDX = 18;
    const neckY = hipY - 44;
    return skeleton(
      point(100, neckY - 14),
      point(100, neckY),
      point(100, hipY),
      point(82, mix(neckY + 20, neckY + 26, depth)),
      point(72, 92),
      point(118, mix(neckY + 20, neckY + 26, depth)),
      point(128, 92),
      point(100 - kneeDX, kneeY),
      point(100 - ankleDX, 174),
      point(90 - ankleDX, 177),
      point(100 + kneeDX, kneeY),
      point(100 + ankleDX, 174),
      point(110 + ankleDX, 177),
    );
  }
  if (exerciseId === 'single-leg-chair-squat') {
    const depth = t;
    const side = working === 'left' ? 1 : -1;
    // Start lower than before: the thighs only foreshorten from FRONT_THIGH
    // (no longer than the profile) and the shins stay under the profile's 36.
    const hip = point(100 + 6 * side * depth, mix(118, 133, depth));
    const neck = point(hip[0] + 3 * side * depth, hip[1] - 43);
    const supportX = 100 + 19 * side;
    const freeX = 100 - 21 * side;
    const supportKneeX = mix(supportX, supportX + 5 * side, depth);
    const supportKneeY = Math.min(
      mix(148, 156, depth),
      hip[1] + Math.sqrt(FRONT_THIGH ** 2 - (supportKneeX - hip[0]) ** 2),
    );
    const support = {
      knee: point(supportKneeX, supportKneeY),
      ankle: point(supportX, 174),
      toe: point(supportX + 10 * side, 177),
    };
    const free = {
      knee: point(freeX, mix(138, 143, depth)),
      ankle: point(freeX - 10 * side, 136),
      toe: point(freeX - 20 * side, 139),
    };
    const right = working === 'left' ? free : support;
    const left = working === 'left' ? support : free;
    return skeleton(
      point(neck[0], neck[1] - 14),
      neck,
      hip,
      point(neck[0] - 18, neck[1] + 18),
      point(neck[0] - 23, neck[1] + 41),
      point(neck[0] + 18, neck[1] + 18),
      point(neck[0] + 23, neck[1] + 41),
      right.knee,
      right.ankle,
      right.toe,
      left.knee,
      left.ankle,
      left.toe,
    );
  }
  if (exerciseId === 'farmer-carry') {
    // The profile gait's legs (thigh 30, shin 29, left foot swings first) and
    // both weights hanging at the sides.
    const legs = carryFrontLegs(t);
    return skeleton(
      point(100, 60),
      point(100, 74),
      legs.hip,
      point(78, 97),
      point(78, 125),
      point(122, 97),
      point(122, 125),
      ...legs.limbs,
    );
  }
  if (exerciseId === 'side-lunge') {
    const side = working === 'left' ? 1 : -1;
    // Legs and arms keep the profile's standing lengths (thigh 30.6, shin 26.3;
    // arm 24.6 + 22.6), so the stance is narrower than a long-legged figure
    // would take: first the selected foot steps out (the hips settle a little to
    // stay in reach), then the hips sit toward that side over the bent knee
    // while the opposite leg stays planted and nearly straight.
    const step = clamp(t * 2);
    const depth = clamp((t - 0.5) * 2);
    // The stepping foot leaves the floor on its way out (and in on the return)
    // and is planted again before the knee bends.
    const stepLift = 9 * Math.sin(Math.PI * step);
    const selectedAnkleX = 100 + side * mix(9, 24, step);
    const otherAnkleX = 100 - side * 9;
    const hipX = 100 + side * 20 * depth;
    const hipY = mix(mix(118, 123, step), 136, depth);
    const hip = point(hipX, hipY);
    // The trunk (43) leans a little back toward the middle as the hips shift.
    const lean = -side * 10 * depth;
    const neckX = hipX + lean;
    const neckY = hipY - Math.sqrt(43 * 43 - lean * lean);
    const neck = point(neckX, neckY);
    // Knees travel outward over the toes (away from the middle line).
    const selected = {
      ankle: point(selectedAnkleX, 174 - stepLift),
      toe: point(selectedAnkleX + side * 10, 177 - stepLift),
    };
    const other = {
      ankle: point(otherAnkleX, 174),
      toe: point(otherAnkleX - side * 10, 177),
    };
    const sel = {
      ...selected,
      knee: joint(
        hip,
        selected.ankle,
        FRONT_STAND_THIGH,
        FRONT_STAND_SHIN,
        -side,
      ),
    };
    const oth = {
      ...other,
      knee: joint(hip, other.ankle, FRONT_STAND_THIGH, FRONT_STAND_SHIN, side),
    };
    const right = working === 'left' ? oth : sel;
    const left = working === 'left' ? sel : oth;
    // Hands hold the weight near the chest, as the profile does.
    const hands = point(neckX, neckY + 18);
    const armR = solveTwoBone(neck, hands, 24.6, 22.6, 1);
    const armL = solveTwoBone(neck, hands, 24.6, 22.6, -1);
    return skeleton(
      point(neckX, neckY - 14),
      neck,
      hip,
      armR.mid,
      armR.end,
      armL.mid,
      armL.end,
      right.knee,
      right.ankle,
      right.toe,
      left.knee,
      left.ankle,
      left.toe,
    );
  }
  if (exerciseId === 'reverse-lunge' || exerciseId === 'forward-lunge') {
    const depth = t;
    const rightIsFront = working !== 'left';
    const frontX = rightIsFront ? 82 : 118;
    const backX = rightIsFront ? 118 : 82;
    const hipY = mix(111, 127, depth);
    const neckY = hipY - 44;
    const frontKneeY = mix(143, 151, depth);
    const backKneeY = mix(143, 149, depth);
    const forward = exerciseId === 'forward-lunge';
    const frontFootY = forward ? mix(161, 174, depth) : 174;
    const backFootY = forward ? 161 : mix(174, 161, depth);
    const frontAnkleX = frontX;
    const backDelta = forward ? 2 : mix(2, 11, depth);
    const backAnkleX = backX + (rightIsFront ? 1 : -1) * backDelta;
    const right = rightIsFront
      ? {
          knee: point(frontX, frontKneeY),
          ankle: point(frontAnkleX, frontFootY),
          toe: point(frontAnkleX - 9, frontFootY + 3),
        }
      : {
          knee: point(backX, backKneeY),
          ankle: point(backAnkleX, backFootY),
          toe: point(backAnkleX - 9, backFootY + 3),
        };
    const left = rightIsFront
      ? {
          knee: point(backX, backKneeY),
          ankle: point(backAnkleX, backFootY),
          toe: point(backAnkleX + 9, backFootY + 3),
        }
      : {
          knee: point(frontX, frontKneeY),
          ankle: point(frontAnkleX, frontFootY),
          toe: point(frontAnkleX + 9, frontFootY + 3),
        };
    return skeleton(
      point(100, neckY - 14),
      point(100, neckY),
      point(100, hipY),
      point(78, neckY + 20),
      point(78, neckY + 43),
      point(122, neckY + 20),
      point(122, neckY + 43),
      right.knee,
      right.ankle,
      right.toe,
      left.knee,
      left.ankle,
      left.toe,
    );
  }
  if (exerciseId === 'rear-foot-split-squat') {
    // Front leg: knee over the planted foot, thigh at most 35.9 (it only
    // foreshortens). Rear leg: the foot rests on the bench behind; its thigh
    // (30) and projected shin (18) keep their length instead of collapsing.
    // Arms are folded at the chest with the profile's 25.5 / 12.8.
    const hipY = mix(117, 140, t);
    const neckY = hipY - 44;
    const hip = point(100, hipY);
    const rearAnkle = point(120, 139);
    const [kneeA, kneeB] = [1, -1].map((bend) =>
      joint(hip, rearAnkle, 30, 18, bend),
    ) as [Pt, Pt];
    const selected = {
      knee: point(82, mix(148, 155, t)),
      ankle: point(82, 174),
      toe: point(72, 177),
    };
    const other = {
      knee: kneeA[1] >= kneeB[1] ? kneeA : kneeB,
      ankle: rearAnkle,
      toe: point(130, 142),
    };
    const right = working === 'left' ? other : selected;
    const left = working === 'left' ? selected : other;
    const place = (p: Pt, side: 'R' | 'L'): Pt =>
      point(
        side === 'R' ? 100 - Math.abs(p[0] - 100) : 100 + Math.abs(p[0] - 100),
        p[1],
      );
    return skeleton(
      point(100, neckY - 14),
      point(100, neckY),
      hip,
      point(83, neckY + 19),
      point(91.5, neckY + 9.5),
      point(117, neckY + 19),
      point(108.5, neckY + 9.5),
      place(right.knee, 'R'),
      place(right.ankle, 'R'),
      place(right.toe, 'R'),
      place(left.knee, 'L'),
      place(left.ankle, 'L'),
      place(left.toe, 'L'),
    );
  }
  if (exerciseId === 'step-up' || exerciseId === 'step-down') {
    const step = exerciseId === 'step-up' || exerciseId === 'step-down';
    const down = exerciseId === 'step-down';
    // Step-up keeps both shins vertical at a fixed 33 and only foreshortens
    // the thighs (a front view cannot show a longer thigh).
    const up = exerciseId === 'step-up';
    // Step-down: 14 unit stair step, vertical 33 shins, the free ankle only
    // 0-3 units below the step top (the heel stops 5-8 cm under the step).
    const freeAnkleY = mix(161, 168.5, t);
    const hipY = down
      ? mix(100, 108, t)
      : up
        ? mix(110, 92, t)
        : step
          ? mix(108, 84, t)
          : mix(112, 140, t);
    const otherAnkleY = mix(174, 150, t);
    const neckY = hipY - 44;
    // Feet occupy distinct depth planes: the support remains fixed while the
    // trailing foot rises (step-up) or rests on the rear bench (split squat).
    const selected = {
      knee: point(
        82,
        up ? 123 : down ? 128 : step ? mix(117, 113, t) : mix(146, 155, t),
      ),
      ankle: point(82, up ? 156 : down ? 161 : step ? 143 : 174),
      toe: point(72, up ? 159 : down ? 164 : step ? 146 : 177),
    };
    const other = down
      ? {
          knee: point(118, freeAnkleY - 33),
          ankle: point(118, freeAnkleY),
          toe: point(128, freeAnkleY + 3),
        }
      : up
        ? {
            knee: point(118, otherAnkleY - 33),
            ankle: point(118, otherAnkleY),
            toe: point(128, otherAnkleY + 3),
          }
        : {
            knee: point(
              118,
              down
                ? mix(113, 132, t)
                : step
                  ? mix(140, 113, t)
                  : mix(132, 155, t),
            ),
            ankle: point(
              120,
              down ? mix(143, 156, t) : step ? mix(174, 138, t) : 139,
            ),
            toe: point(
              130,
              down ? mix(146, 159, t) : step ? mix(177, 141, t) : 142,
            ),
          };
    const right = working === 'left' ? other : selected;
    const left = working === 'left' ? selected : other;
    // Anatomical right is always viewer-left; select geometry before placing it.
    const place = (p: Pt, side: 'R' | 'L'): Pt =>
      point(
        side === 'R' ? 100 - Math.abs(p[0] - 100) : 100 + Math.abs(p[0] - 100),
        p[1],
      );
    // Step-down: the hand opposite the working leg keeps hold of the upright
    // railing through the whole lowering and return (two-bone arm, constant
    // lengths); the other hand hangs free as before.
    const neckPt = point(100, neckY);
    const grip = down
      ? solveTwoBone(
          neckPt,
          point(STEP_DOWN_FRONT_RAIL_X, STEP_DOWN_FRONT_GRIP_Y),
          FRONT_UPPER_ARM,
          FRONT_FOREARM,
          1,
        )
      : undefined;
    const gripElbow = grip
      ? place(grip.mid, working === 'left' ? 'R' : 'L')
      : [0, 0];
    const gripHand = grip
      ? place(grip.end, working === 'left' ? 'R' : 'L')
      : [0, 0];
    const freeElbow = (side: 'R' | 'L'): Pt =>
      side === 'R' ? point(78, neckY + 22) : point(122, neckY + 22);
    const freeHand = (side: 'R' | 'L'): Pt =>
      side === 'R' ? point(72, neckY + 44) : point(128, neckY + 44);
    const gripSide = working === 'left' ? 'R' : 'L';
    const armR = down && gripSide === 'R';
    const armL = down && gripSide === 'L';
    return skeleton(
      point(100, neckY - 14),
      neckPt,
      point(100, hipY),
      armR ? (gripElbow as Pt) : freeElbow('R'),
      armR ? (gripHand as Pt) : freeHand('R'),
      armL ? (gripElbow as Pt) : freeElbow('L'),
      armL ? (gripHand as Pt) : freeHand('L'),
      place(right.knee, 'R'),
      place(right.ankle, 'R'),
      place(right.toe, 'R'),
      place(left.knee, 'L'),
      place(left.ankle, 'L'),
      place(left.toe, 'L'),
    );
  }
  if (exerciseId === 'suitcase-carry') {
    const legs = carryFrontLegs(t);
    return skeleton(
      point(100, 60),
      point(100, 74),
      legs.hip,
      point(78, 98),
      point(72, 122),
      point(122, 98),
      point(128, 122),
      ...legs.limbs,
    );
  }
  if (exerciseId === 'kettlebell-goblet-squat') {
    // Same legs and arms as the profile (thigh 30.8, shin 26.5, arm 24 + 20, the
    // squat family constants): upright standing at the start, the knees travel
    // out over the toes while the feet stay planted. Both hands sit on the
    // bell's horns at chest height (hands at 94/106 = the handle width of Held),
    // so the grip survives the whole squat.
    const hipY = mix(118, 136, t);
    const neckY = hipY - 44;
    const hip = point(100, hipY);
    const aR = point(88, 174);
    const aL = point(112, 174);
    const neck = point(100, neckY);
    const gripY = neckY + 13;
    const armR = solveTwoBone(neck, [94, gripY], 24, 20, -1);
    const armL = solveTwoBone(neck, [106, gripY], 24, 20, 1);
    return skeleton(
      point(100, neckY - 14),
      neck,
      hip,
      armR.mid,
      armR.end,
      armL.mid,
      armL.end,
      joint(hip, aR, SQUAT_THIGH, SQUAT_SHIN, 1),
      aR,
      point(77, 177),
      joint(hip, aL, SQUAT_THIGH, SQUAT_SHIN, -1),
      aL,
      point(123, 177),
    );
  }
  if (exerciseId === 'goblet-squat') {
    const hipY = mix(118, 136, t);
    const neckY = hipY - 44;
    const kneeDX = mix(18, 31, t);
    const ankleDX = 18; // feet stay planted; only the knees travel outward
    const kneeY = mix(148, 150, t);
    return skeleton(
      point(100, neckY - 14),
      point(100, neckY),
      point(100, hipY),
      point(77, neckY + 20),
      point(94, neckY + 10),
      point(123, neckY + 20),
      point(106, neckY + 10),
      point(100 - kneeDX, kneeY),
      point(100 - ankleDX, 174),
      point(90 - ankleDX, 177),
      point(100 + kneeDX, kneeY),
      point(100 + ankleDX, 174),
      point(110 + ankleDX, 177),
    );
  }

  if (exerciseId === 'dumbbell-rdl') {
    const neckY = mix(74, 84, t);
    const hipY = mix(118, 126, t);
    const handY = mix(121, 158, t);
    const kneeY = mix(149, 151, t);
    return skeleton(
      point(100, neckY - 14),
      point(100, neckY),
      point(100, hipY),
      point(78, mix(99, 117, t)),
      point(70, handY),
      point(122, mix(99, 117, t)),
      point(130, handY),
      point(82, kneeY),
      point(80, 174),
      point(70, 177),
      point(118, kneeY),
      point(120, 174),
      point(130, 177),
    );
  }

  // Kettlebell rack carry: the profile gait's legs; the selected arm holds the
  // bell at the shoulder (upper arm 29.8, forearm 25.2, as in profile), the
  // other arm hangs with the same lengths.
  const movingRight = working !== 'left';
  const legs = carryFrontLegs(t);
  const neck = point(100, 74);
  const rackArm = solveTwoBone(
    neck,
    point(movingRight ? 78 : 122, 79),
    29.8,
    25.2,
    movingRight ? 1 : -1,
  );
  const hangArm = solveTwoBone(
    neck,
    point(movingRight ? 120 : 80, 122),
    29.8,
    25.2,
    movingRight ? 1 : -1,
  );
  return skeleton(
    point(100, 60),
    neck,
    legs.hip,
    // The person's right arm is on the viewer's left, so a left selection
    // puts the grip in the L slot.
    movingRight ? rackArm.mid : hangArm.mid,
    movingRight ? rackArm.end : hangArm.end,
    movingRight ? hangArm.mid : rackArm.mid,
    movingRight ? hangArm.end : rackArm.end,
    ...legs.limbs,
  );
}

function russianTwistProjection(progress: number): {
  pose: Pose;
  yaw: number;
  shoulderR: Pt;
  shoulderL: Pt;
  chestCenter: Pt;
  noseDirection: Pt;
} {
  const t = clamp(progress);
  const yaw = -Math.sin(2 * Math.PI * t);
  const angle = (yaw * 25 * Math.PI) / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const chestX = 87 + 15 * sin;
  const chestY = 126;
  const halfWidth = 20 * cos;
  const shoulderR = point(chestX - halfWidth, chestY + 5 * sin);
  const shoulderL = point(chestX + halfWidth, chestY - 5 * sin);
  const chestCenter = point(chestX, chestY);
  const weightCenter = point(chestX, chestY + 12);
  const hR = point(weightCenter[0] - 4, weightCenter[1]);
  const hL = point(weightCenter[0] + 4, weightCenter[1]);
  const eR = point(shoulderR[0] + 14, chestY + 7 + 3 * sin);
  const eL = point(shoulderL[0] - 14, chestY + 7 - 3 * sin);
  return {
    yaw,
    shoulderR,
    shoulderL,
    chestCenter,
    noseDirection: point(88 + 9 * sin, 111),
    pose: skeleton(
      point(80, 113),
      point(84, 127),
      point(100, 171),
      eR,
      hR,
      eL,
      hL,
      point(80, 146),
      point(79, 173),
      point(68, 176),
      point(120, 146),
      point(121, 173),
      point(132, 176),
    ),
  };
}

/** Height of the dashed rear contact line in the oblique split squat. */
export const SPLIT_REAR_LINE_Y = 146;
/**
 * Projected leg segments of the oblique split squat: the front leg keeps the
 * profile thigh and shin (33.1, 28.1); the rear leg points away from the viewer
 * and is foreshortened to about 80 % (27, 20). Both are constant, so the
 * knees are solved from the hip and the planted ankles in every phase.
 */
const SPLIT_FRONT_THIGH = 33.1;
const SPLIT_FRONT_SHIN = 28.1;
const SPLIT_REAR_THIGH = 27;
const SPLIT_REAR_SHIN = 20;

/** Thigh and shin of the oblique chair squat: those of the profile figure. */
const CHAIR_THIGH = 31;
const CHAIR_SHIN = 29;
/** Upper arm and forearm of the profile figure (see its authored poses). */
const CHAIR_UPPER_ARM = 18;
const CHAIR_FOREARM = 17;
const CHAIR_TRUNK = 39.1;
/**
 * The person faces forward-right, turned this far from the profile towards
 * the viewer: forward distances shrink by cos, sideways ones show by sin.
 */
const CHAIR_YAW = (35 * Math.PI) / 180;
/** Half the distance between the feet, and between the hands on the weight. */
const CHAIR_FOOT_HALF = 12;
const CHAIR_HAND_HALF = 3;
const CHAIR_FOOT_FORWARD = 6;
/** Seat of the chair in the oblique view; the hips reach it at t = 1. */
export const CHAIR_OBLIQUE_SEAT_Y = 146;

/**
 * Oblique chair squat. The hips, trunk and planted feet come from the profile
 * poses, projected with a forward-right turn. The two legs stand shoulder
 * width apart and each knee is solved from the hip and its own ankle with the
 * profile segment lengths, bending forward over the toes (never towards the
 * other leg). Both hands rest on the weight at the chest; the arms keep their
 * lengths through the whole movement.
 */
function chairSquatObliquePose(t: number): Pose {
  const { start, end } = figures['goblet-chair-squat'];
  const cos = Math.cos(CHAIR_YAW);
  const sin = Math.sin(CHAIR_YAW);
  const proj = (x: number, y: number, lateral = 0): Pt =>
    point(100 + (x - 100) * cos + lateral * sin, y);
  const at = (a: Pt, b: Pt): Pt =>
    point(mix(a[0], b[0], t), mix(a[1], b[1], t));
  const hipSide = at(start.hip, end.hip);
  const neckSide = at(start.neck, end.neck);
  const hip = proj(hipSide[0], hipSide[1]);
  const lean = proj(neckSide[0], neckSide[1]);
  const run = Math.hypot(lean[0] - hip[0], lean[1] - hip[1]);
  const neck = point(
    hip[0] + ((lean[0] - hip[0]) / run) * CHAIR_TRUNK,
    hip[1] + ((lean[1] - hip[1]) / run) * CHAIR_TRUNK,
  );
  const head = point(neck[0] + 4, neck[1] - 14.3);
  const leg = (side: 1 | -1) => {
    // Right foot towards the viewer's left; both feet point straight ahead.
    const ankle = proj(
      start.aR[0] + CHAIR_FOOT_FORWARD,
      174,
      side * CHAIR_FOOT_HALF,
    );
    const toe = proj(
      start.tR[0] + CHAIR_FOOT_FORWARD,
      177,
      side * CHAIR_FOOT_HALF,
    );
    return {
      knee: joint(hip, ankle, CHAIR_THIGH, CHAIR_SHIN, -1),
      ankle,
      toe,
    };
  };
  const right = leg(-1);
  const left = leg(1);
  const grip = (side: 1 | -1): Pt =>
    point(neck[0] + 16 + side * CHAIR_HAND_HALF * sin, neck[1] + 12);
  const armR = solveTwoBone(neck, grip(-1), CHAIR_UPPER_ARM, CHAIR_FOREARM, 1);
  const armL = solveTwoBone(neck, grip(1), CHAIR_UPPER_ARM, CHAIR_FOREARM, 1);
  return skeleton(
    head,
    neck,
    hip,
    armR.mid,
    armR.end,
    armL.mid,
    armL.end,
    right.knee,
    right.ankle,
    right.toe,
    left.knee,
    left.ankle,
    left.toe,
  );
}

/** Three-quarter projections expose front/back support relationships. */
export function obliqueMovementPose(
  exerciseId: ObliqueViewExercise,
  progress: number,
  working: Working | null = 'right',
): Pose {
  const t = clamp(progress);
  if (isLyingOblique(exerciseId))
    return obliqueFrame(LYING_OBLIQUE[exerciseId], t, working).pose;
  if (exerciseId === 'russian-twist') return russianTwistProjection(t).pose;
  if (exerciseId === 'goblet-chair-squat') return chairSquatObliquePose(t);
  if (exerciseId === 'split-squat') {
    const depth = t;
    const rightFront = working !== 'left';
    // Standing the front leg is nearly straight (hip 60.6 above reach 61.2).
    const hip = point(100, mix(116.5, 138.5, depth));
    // Trunk 38, as in the profile figure.
    const neck = point(104, hip[1] - 38);
    // Feet stay planted; the knees are solved with constant segment lengths.
    // The front knee glides forward over the toes as the hip drops. Rear
    // toe stays on the rear contact line (SPLIT_REAR_LINE_Y) in every phase.
    const frontAnkle = rightFront ? point(81, 174) : point(119, 174);
    const rearAnkle = rightFront
      ? point(128, SPLIT_REAR_LINE_Y - 3)
      : point(72, SPLIT_REAR_LINE_Y - 3);
    const bend = rightFront ? 1 : -1;
    const front = {
      knee: joint(hip, frontAnkle, SPLIT_FRONT_THIGH, SPLIT_FRONT_SHIN, bend),
      ankle: frontAnkle,
      toe: rightFront ? point(71, 177) : point(129, 177),
    };
    const rear = {
      knee: joint(hip, rearAnkle, SPLIT_REAR_THIGH, SPLIT_REAR_SHIN, bend),
      ankle: rearAnkle,
      toe: rightFront
        ? point(138, SPLIT_REAR_LINE_Y)
        : point(62, SPLIT_REAR_LINE_Y),
    };
    const right = rightFront ? front : rear;
    const left = rightFront ? rear : front;
    return skeleton(
      point(106, neck[1] - 14),
      neck,
      hip,
      point(83, neck[1] + 21),
      point(77, neck[1] + 44),
      point(120, neck[1] + 17),
      point(123, neck[1] + 40),
      right.knee,
      right.ankle,
      right.toe,
      left.knee,
      left.ankle,
      left.toe,
    );
  }

  // Every other oblique id has its own branch above; fail loudly instead of
  // drawing the bench side plank for an id that has no oblique pose yet.
  if (exerciseId !== 'bench-side-plank-leg-lift')
    throw new Error(`No oblique pose for ${exerciseId}`);
  const hip: Pt = [106, 136];
  const supportAnkle: Pt = [163, 122];
  // The lifting leg is one straight 58.7 long leg swinging from the hip, as in
  // the profile view; the knee is the midpoint so thigh and shin follow the lift.
  const angle = mix(0.6, 0, t);
  const movingAnkle: Pt = [
    hip[0] + 58.7 * Math.cos(angle),
    hip[1] + 58.7 * Math.sin(angle),
  ];
  const knee: Pt = [
    (hip[0] + movingAnkle[0]) / 2,
    (hip[1] + movingAnkle[1]) / 2,
  ];
  const toe = (ankle: Pt): Pt => [ankle[0] + 10, ankle[1] + 3];
  const moving = { knee, ankle: movingAnkle, toe: toe(movingAnkle) };
  const supported = {
    knee: point((hip[0] + supportAnkle[0]) / 2, (hip[1] + supportAnkle[1]) / 2),
    ankle: supportAnkle,
    toe: toe(supportAnkle),
  };
  const right = working === 'left' ? supported : moving;
  const left = working === 'left' ? moving : supported;
  const lowerArm: [Pt, Pt] = [
    [56, 176],
    [86.4, 176],
  ];
  const upperArm: [Pt, Pt] = [
    [70, 131],
    [97, 145],
  ];
  const rightArm = working === 'left' ? upperArm : lowerArm;
  const leftArm = working === 'left' ? lowerArm : upperArm;
  return skeleton(
    [34, 142],
    [52, 150],
    hip,
    ...rightArm,
    ...leftArm,
    right.knee,
    right.ankle,
    right.toe,
    left.knee,
    left.ankle,
    left.toe,
  );
}

const W = 6;
const limb = {
  fill: 'none',
  strokeWidth: W,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const line = (pts: Pt[]) => `M${pts.map((p) => p.join(' ')).join('L')}`;

/**
 * Lying/standing oblique view from the shared body model: props, pelvis and
 * shoulder bars as overlay, the camera-near side drawn last.
 */
function LyingObliqueFigure({
  exerciseId,
  working,
  phase,
  viewBox,
  equipment,
}: {
  exerciseId: (typeof LYING_OBLIQUE_IDS)[number];
  working: Working | null;
  phase: number;
  viewBox: string;
  equipment?: Equipment;
}) {
  const frame = obliqueFrame(LYING_OBLIQUE[exerciseId], clamp(phase), working);
  const { pose } = frame;
  const [vbX = 14, vbY = 20] = viewBox.split(' ').map(Number);
  const color = (side: 'R' | 'L') =>
    working === null || (working === 'right' ? side === 'R' : side === 'L')
      ? 'var(--accent)'
      : 'var(--edge)';
  const group = (side: 'R' | 'L') => (
    <g
      data-body-side={side === 'R' ? 'right' : 'left'}
      stroke={color(side)}
      {...limb}
    >
      <path d={line([pose.neck, pose[`e${side}`], pose[`h${side}`]])} />
      <path
        d={line([
          pose.hip,
          pose[`k${side}`],
          pose[`a${side}`],
          pose[`t${side}`],
        ])}
      />
    </g>
  );
  // A weight in the working hand. A left-working frame is a mirror image, so
  // the press-grip angle is measured on the un-mirrored hand and negated.
  const heldSpec = LYING_OBLIQUE[exerciseId].held;
  const handKey = working === 'left' ? 'L' : 'R';
  const heldBell =
    heldSpec && equipment !== null ? (
      <g data-equipment={heldSpec.kind}>
        <Held
          kind={heldSpec.kind}
          at={pose[`h${handKey}`]}
          angle={
            heldSpec.pressGrip
              ? (handKey === 'L' ? -1 : 1) *
                pressGripAngle(
                  handKey === 'L' ? [192 - pose.eL[0], pose.eL[1]] : pose.eR,
                  handKey === 'L' ? [192 - pose.hL[0], pose.hL[1]] : pose.hR,
                )
              : undefined
          }
        />
      </g>
    ) : null;
  const trunk = (
    <g stroke="var(--ink)" {...limb}>
      <path d={line([pose.neck, pose.hip])} />
      <path
        data-pelvis=""
        d={line(frame.pelvis)}
        stroke="var(--equipment)"
        strokeWidth="5"
      />
      <path
        data-shoulders=""
        d={line(frame.shoulders)}
        stroke="var(--equipment)"
        strokeWidth="5"
      />
      <circle cx={pose.head[0]} cy={pose.head[1]} r="9" fill="var(--paper)" />
    </g>
  );
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-hidden="true"
      className="block h-auto w-full"
      data-view="oblique"
    >
      <title>{`${exerciseId} – oblique`}</title>
      {frame.surfaces.length === 0 ? <FloorLine /> : null}
      {frame.surfaces.map((surface) => (
        <polygon
          key={surface.kind + surface.pts.join(',')}
          data-surface={surface.kind}
          points={surface.pts.map((p) => p.join(' ')).join(' ')}
          fill="var(--edge)"
          fillOpacity="0.18"
          stroke="var(--edge)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ))}
      {frame.props.map((prop) => (
        <PropShape key={JSON.stringify(prop)} prop={prop} />
      ))}
      {frame.near === 'R' ? group('L') : group('R')}
      {trunk}
      {frame.near === 'R' ? group('R') : group('L')}
      {heldBell}
      {working ? (
        <text
          x={vbX + 6}
          y={vbY + 22}
          fontSize="22"
          fontWeight="800"
          fill="var(--accent)"
          fontFamily="system-ui, sans-serif"
        >
          {working === 'right' ? 'H' : 'V'}
        </text>
      ) : null}
    </svg>
  );
}

/** A frontal skeleton: blue follows the person's H/V side, not the viewer. */
export function FrontFigureFrame({
  exerciseId,
  working = 'right',
  equipment,
  phase = 0,
  viewBox = '14 20 164 168',
  angle = 'front',
}: {
  exerciseId: FrontViewExercise | ObliqueViewExercise;
  working?: Working | null;
  equipment?: Equipment;
  phase?: number;
  viewBox?: string;
  angle?: 'front' | 'oblique';
}) {
  if (angle === 'oblique' && isLyingOblique(exerciseId))
    return (
      <LyingObliqueFigure
        exerciseId={exerciseId}
        working={working}
        phase={phase}
        viewBox={viewBox}
        equipment={equipment}
      />
    );
  const basePose =
    angle === 'oblique'
      ? obliqueMovementPose(exerciseId as ObliqueViewExercise, phase, working)
      : frontMovementPose(exerciseId as FrontViewExercise, phase, working);
  const twist =
    exerciseId === 'russian-twist' ? russianTwistProjection(phase) : undefined;
  const kind: 'dumbbell' | 'kettlebell' | null =
    equipment === 'band'
      ? null
      : equipment === undefined
        ? (figures[exerciseId].held?.kind ?? null)
        : equipment;
  // Bodyweight split squat: both hands rest on a wall in front of the
  // person, as in the profile view; with a weight the hands carry it instead.
  const splitSupportX =
    working === 'left' ? SPLIT_WALL_X_RIGHT : SPLIT_WALL_X_LEFT;
  const splitSupported =
    angle === 'oblique' && exerciseId === 'split-squat' && kind === null;
  const pose: Pose = (() => {
    if (
      kind === 'kettlebell' &&
      (exerciseId === 'reverse-lunge' || exerciseId === 'forward-lunge')
    ) {
      // Both hands share the kettlebell handle at the chest, as the variant
      // says (goblet hold); the arm lengths stay those of the hanging arms.
      const upper = Math.hypot(
        basePose.eR[0] - basePose.neck[0],
        basePose.eR[1] - basePose.neck[1],
      );
      const fore = Math.hypot(
        basePose.hR[0] - basePose.eR[0],
        basePose.hR[1] - basePose.eR[1],
      );
      const gripY = basePose.neck[1] + 10;
      const armR = solveTwoBone(basePose.neck, [95, gripY], upper, fore, 1);
      const armL = solveTwoBone(basePose.neck, [105, gripY], upper, fore, -1);
      return {
        ...basePose,
        eR: armR.mid,
        hR: armR.end,
        eL: armL.mid,
        hL: armL.end,
      };
    }
    if (kind === 'kettlebell' && exerciseId === 'dumbbell-rdl') {
      // Both hands share the kettlebell handle (hands at 96/104 = the handle
      // width of Held) through the whole hinge; the arm lengths stay those of
      // the hanging dumbbell arms, the elbows bow outward.
      const upper = Math.hypot(
        basePose.eR[0] - basePose.neck[0],
        basePose.eR[1] - basePose.neck[1],
      );
      const fore = Math.hypot(
        basePose.hR[0] - basePose.eR[0],
        basePose.hR[1] - basePose.eR[1],
      );
      const gripY = basePose.hR[1];
      const armR = solveTwoBone(basePose.neck, [96, gripY], upper, fore, 1);
      const armL = solveTwoBone(basePose.neck, [104, gripY], upper, fore, -1);
      return {
        ...basePose,
        eR: armR.mid,
        hR: armR.end,
        eL: armL.mid,
        hL: armL.end,
      };
    }
    if (!splitSupported) return basePose;
    const handAt = point(
      splitSupportX + (working === 'left' ? -4 : 4),
      basePose.neck[1] + 30,
    );
    const arm = solveTwoBone(
      basePose.neck,
      handAt,
      31,
      27,
      working === 'left' ? 1 : -1,
    );
    return {
      ...basePose,
      eR: arm.mid,
      hR: arm.end,
      eL: arm.mid,
      hL: arm.end,
    };
  })();
  const rackSide: 'R' | 'L' = working === 'left' ? 'L' : 'R';
  const heldAt: Pt[] =
    kind === null
      ? []
      : exerciseId === 'goblet-squat' ||
          exerciseId === 'kettlebell-goblet-squat'
        ? [[100, pose.neck[1] + 11]]
        : exerciseId === 'goblet-chair-squat'
          ? [[(pose.hR[0] + pose.hL[0]) / 2, (pose.hR[1] + pose.hL[1]) / 2 + 6]]
          : exerciseId === 'farmer-carry'
            ? [pose.hR, pose.hL]
            : exerciseId === 'side-lunge'
              ? [[(pose.hR[0] + pose.hL[0]) / 2, (pose.hR[1] + pose.hL[1]) / 2]]
              : exerciseId === 'russian-twist' || exerciseId === 'woodchop'
                ? [
                    [
                      (pose.hR[0] + pose.hL[0]) / 2,
                      (pose.hR[1] + pose.hL[1]) / 2,
                    ],
                  ]
                : exerciseId === 'kettlebell-rack-carry' ||
                    exerciseId === 'suitcase-carry'
                  ? [rackSide === 'R' ? pose.hR : pose.hL]
                  : kind === 'kettlebell' && exerciseId !== 'step-up'
                    ? [[100, (pose.hR[1] + pose.hL[1]) / 2]]
                    : [pose.hR, pose.hL];
  const heldIsRack = exerciseId === 'kettlebell-rack-carry' && kind !== null;
  const color = (side: 'R' | 'L') =>
    working === null || (working === 'right' ? side === 'R' : side === 'L')
      ? 'var(--accent)'
      : 'var(--edge)';
  const arm = (elbow: Pt, hand: Pt, origin?: Pt) =>
    line([origin ?? pose.neck, elbow, hand]);
  const leg = (knee: Pt, ankle: Pt, toe: Pt) =>
    line([pose.hip, knee, ankle, toe]);

  return (
    <svg
      viewBox={
        exerciseId === 'step-up' || exerciseId === 'step-down'
          ? '14 0 164 188'
          : viewBox
      }
      role="img"
      aria-hidden="true"
      className="block h-auto w-full"
      data-view={angle}
    >
      <title>{`${exerciseId} – ${angle}`}</title>
      <FloorLine />
      {exerciseId === 'seated-tibial-rotation' ? (
        <g
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path data-support="chair" d="M75 83v39h50V83M78 124v51M122 124v51" />
          <circle
            data-support="knee-cushion"
            cx="100"
            cy="132"
            r="5"
            fill="var(--surface)"
          />
          <path
            data-equipment="band"
            d={`M${pose.tR[0] - 3} ${pose.tR[1] - 3} Q100 ${pose.tR[1] - 9} ${pose.tL[0] + 3} ${pose.tL[1] - 3} Q${pose.tL[0] + 8} ${pose.tL[1] + 5} ${pose.tL[0]} ${pose.tL[1] + 6} Q100 ${pose.tR[1] + 10} ${pose.tR[0]} ${pose.tR[1] + 6} Q${pose.tR[0] - 8} ${pose.tR[1] + 3} ${pose.tR[0] - 3} ${pose.tR[1] - 3}Z`}
          />
        </g>
      ) : null}
      {exerciseId === 'single-leg-lateral-hop' ? (
        <path
          data-contact-plane="hop-line"
          d="M97 171v8M103 171v8"
          fill="none"
          stroke="var(--edge)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
      {exerciseId === 'in-and-out-jump' ? (
        <g
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path
            data-support="floor-marker"
            d={`M${100 - IN_OUT_MARKER_DX} 164v15`}
          />
          <path
            data-support="floor-marker"
            d={`M${100 + IN_OUT_MARKER_DX} 164v15`}
          />
        </g>
      ) : null}
      {exerciseId === 'lateral-shuffle' ? (
        <path
          data-contact-plane="shuffle-line"
          d={`M${SHUFFLE_LINE_X} 164v15`}
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
      {splitSupported ? (
        <path
          data-support="wall"
          d={`M${splitSupportX} 40V176`}
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
      {exerciseId === 'split-squat' ? (
        <path
          data-contact-plane="rear-foot"
          d={`M54 ${SPLIT_REAR_LINE_Y}h96`}
          fill="none"
          stroke="var(--edge)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      ) : null}
      {exerciseId === 'reverse-lunge' || exerciseId === 'forward-lunge' ? (
        <path
          data-contact-plane="receding-foot"
          d="M48 164h104"
          fill="none"
          stroke="var(--edge)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      ) : null}
      {exerciseId === 'step-up' ||
      exerciseId === 'step-down' ||
      exerciseId === 'rear-foot-split-squat' ? (
        <g
          data-support={
            exerciseId === 'step-up' || exerciseId === 'step-down'
              ? 'step'
              : 'rear-bench'
          }
          fill="var(--surface)"
          stroke="var(--equipment)"
          strokeWidth="2"
        >
          <rect
            x={
              (exerciseId === 'step-up' || exerciseId === 'step-down') ===
              (working !== 'left')
                ? 61
                : 107
            }
            y={
              exerciseId === 'step-up'
                ? 159
                : exerciseId === 'step-down'
                  ? 164
                  : 142
            }
            width="34"
            height={
              exerciseId === 'step-up'
                ? 18
                : exerciseId === 'step-down'
                  ? 14
                  : 35
            }
            rx="2"
          />
        </g>
      ) : null}
      {exerciseId === 'step-down' ? (
        <path
          data-support="rail"
          d={`M${working === 'left' ? 200 - STEP_DOWN_FRONT_RAIL_X : STEP_DOWN_FRONT_RAIL_X} 60V164`}
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
      {exerciseId === 'half-squat' ? (
        <g
          data-support="stable-support"
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M142 42v132M68 92h74" />
        </g>
      ) : null}
      {exerciseId === 'single-leg-chair-squat' ? (
        <g
          data-support="chair"
          fill="none"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M79 137h42M83 139v34M117 139v34" />
        </g>
      ) : null}
      {exerciseId === 'goblet-chair-squat' ? (
        <g
          data-support="chair"
          fill="var(--surface)"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={`M52 ${CHAIR_OBLIQUE_SEAT_Y}H90L98 ${CHAIR_OBLIQUE_SEAT_Y - 6}H60Z`}
          />
          <path
            d={`M55 ${CHAIR_OBLIQUE_SEAT_Y + 2}V175M87 ${CHAIR_OBLIQUE_SEAT_Y + 2}V175M96 ${CHAIR_OBLIQUE_SEAT_Y - 4}V170`}
          />
        </g>
      ) : null}
      {exerciseId === 'bench-side-plank-leg-lift' ? (
        <g
          data-support="bench"
          fill="var(--surface)"
          stroke="var(--equipment)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M150 125h34M154 128v45M180 128v45" />
        </g>
      ) : null}
      {exerciseId === 'russian-twist' ? (
        <path
          data-contact-plane="seated-base"
          d="M89 175h22"
          fill="none"
          stroke="var(--edge)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
      {heldIsRack && kind === 'kettlebell' ? (
        <g data-equipment="kettlebell" data-grip="rack">
          <Held kind="kettlebell" at={heldAt[0] ?? pose.hR} rack />
        </g>
      ) : null}
      <g data-body-side="left" stroke={color('L')} {...limb}>
        <path d={arm(pose.eL, pose.hL, twist?.shoulderL)} />
        <path d={leg(pose.kL, pose.aL, pose.tL)} />
      </g>
      <g stroke="var(--ink)" {...limb}>
        <path d={line([pose.neck, pose.hip])} />
        <circle cx={pose.head[0]} cy={pose.head[1]} r="9" fill="var(--paper)" />
      </g>
      {twist ? (
        <g
          data-torso-yaw={twist.yaw.toFixed(2)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
        >
          <path d={line([twist.shoulderR, twist.shoulderL])} />
          <path
            d={line([
              twist.chestCenter,
              point(
                twist.chestCenter[0] + twist.yaw * 8,
                twist.chestCenter[1] + 14,
              ),
            ])}
            strokeWidth="3"
          />
          <path d={line([pose.head, twist.noseDirection])} strokeWidth="3" />
        </g>
      ) : null}
      <g data-body-side="right" stroke={color('R')} {...limb}>
        <path d={arm(pose.eR, pose.hR, twist?.shoulderR)} />
        <path d={leg(pose.kR, pose.aR, pose.tR)} />
      </g>
      {heldIsRack && kind === 'kettlebell' ? (
        <g
          data-rack-hand="true"
          stroke={color(rackSide)}
          strokeWidth="2"
          fill="var(--paper)"
          transform={`rotate(-55 ${heldAt[0]?.[0] ?? 100} ${heldAt[0]?.[1] ?? 65})`}
        >
          <rect
            x={(heldAt[0]?.[0] ?? 100) - 3}
            y={(heldAt[0]?.[1] ?? 65) - 4}
            width="6"
            height="8"
            rx="2"
          />
          <path
            d={`M${(heldAt[0]?.[0] ?? 100) - 3} ${heldAt[0]?.[1] ?? 65}h4`}
          />
        </g>
      ) : null}
      {!heldIsRack && kind ? (
        <g data-equipment={kind}>
          {heldAt.map((at) => (
            <Held
              key={at.join(',')}
              kind={kind}
              at={at}
              vertical={exerciseId === 'goblet-chair-squat'}
            />
          ))}
        </g>
      ) : null}
      {exerciseId === 'kettlebell-goblet-squat' && kind === 'kettlebell' ? (
        <g
          data-grip="goblet-horns"
          stroke="var(--accent)"
          strokeWidth="2"
          fill="var(--paper)"
        >
          <circle cx={pose.hR[0]} cy={pose.hR[1]} r="3.5" />
          <circle cx={pose.hL[0]} cy={pose.hL[1]} r="3.5" />
        </g>
      ) : null}
      {exerciseId === 'dumbbell-rdl' && kind === 'kettlebell' ? (
        <g
          data-grip="rdl-handle"
          stroke="var(--accent)"
          strokeWidth="2"
          fill="var(--paper)"
        >
          <circle cx={pose.hR[0]} cy={pose.hR[1]} r="3" />
          <circle cx={pose.hL[0]} cy={pose.hL[1]} r="3" />
        </g>
      ) : null}
      {heldIsRack && kind === 'dumbbell' ? (
        <g data-equipment="dumbbell">
          <Held kind="dumbbell" at={heldAt[0] ?? pose.hR} />
        </g>
      ) : null}
      {working ? (
        <text
          x="20"
          y="58"
          fontSize="28"
          fontWeight="800"
          fill="var(--accent)"
          fontFamily="system-ui, sans-serif"
        >
          {working === 'right' ? 'H' : 'V'}
        </text>
      ) : null}
    </svg>
  );
}
