import type { ExerciseId } from '../domain/types';
import type { Equipment, Working } from './Figure';
import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import { figures } from './poses';
import { FloorLine, Held } from './props';
import { joint } from './rehabPoses';

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
] as const satisfies readonly ExerciseId[];

export const supportedObliqueViews = [
  'split-squat',
  'bench-side-plank-leg-lift',
  'russian-twist',
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
  if (exerciseId === 'side-lunge') return 'front';
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

/** Purpose-drawn frontal geometry for the small set of readable front views. */
export function frontMovementPose(
  exerciseId: FrontViewExercise,
  progress: number,
  working: Working | null = 'right',
): Pose {
  const t = clamp(progress);
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
    const hip = point(100 + 6 * side * depth, mix(106, 133, depth));
    const neck = point(hip[0] + 3 * side * depth, hip[1] - 43);
    const supportX = 100 + 19 * side;
    const freeX = 100 - 21 * side;
    const support = {
      knee: point(
        mix(supportX, supportX + 5 * side, depth),
        mix(148, 156, depth),
      ),
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
    const stride = Math.sin(2 * Math.PI * t);
    const liftR = Math.max(0, stride);
    const liftL = Math.max(0, -stride);
    return skeleton(
      point(100, 46),
      point(100, 60),
      point(100, 104),
      point(78, 83),
      point(78, 111),
      point(122, 83),
      point(122, 111),
      point(82, 141 - 5 * liftR),
      point(80, 174 - 8 * liftR),
      point(70, 177 - 8 * liftR),
      point(118, 141 - 5 * liftL),
      point(120, 174 - 8 * liftL),
      point(130, 177 - 8 * liftL),
    );
  }
  if (exerciseId === 'side-lunge') {
    const side = working === 'left' ? 1 : -1;
    // First step the selected foot out; then sit the hips toward that side
    // while the selected knee bends and the opposite leg stays long.
    const step = clamp(t * 2);
    const depth = clamp((t - 0.5) * 2);
    const selectedAnkleStartX = 100 + side * 10;
    const selectedAnkleEndX = 100 + side * 30;
    const selectedAnkleX = mix(selectedAnkleStartX, selectedAnkleEndX, step);
    const otherAnkleX = 100 - side * 30;
    const hipX = mix(100, 100 + side * 18, depth);
    const hipY = mix(116, 136, depth);
    const neckX = mix(100, 100 + side * 10, depth);
    const neckY = hipY - 44;
    const selectedStraightRatio = (148 - hipY) / (174 - hipY);
    const selected = {
      knee: point(
        mix(
          hipX + (selectedAnkleX - hipX) * selectedStraightRatio,
          selectedAnkleX + side * 2,
          depth,
        ),
        mix(148, 153, depth),
      ),
      ankle: point(selectedAnkleX, 174),
      toe: point(selectedAnkleX + side * 10, 177),
    };
    const otherKneeY = mix(148, 151, depth);
    const other = {
      knee: point(
        hipX + (otherAnkleX - hipX) * ((otherKneeY - hipY) / (174 - hipY)),
        otherKneeY,
      ),
      ankle: point(otherAnkleX, 174),
      toe: point(otherAnkleX - side * 10, 177),
    };
    const right = working === 'left' ? other : selected;
    const left = working === 'left' ? selected : other;
    const hands = point(neckX, neckY + 27);
    return skeleton(
      point(neckX, neckY - 14),
      point(neckX, neckY),
      point(hipX, hipY),
      point(neckX - 18, neckY + 19),
      hands,
      point(neckX + 18, neckY + 19),
      hands,
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
  if (
    exerciseId === 'step-up' ||
    exerciseId === 'step-down' ||
    exerciseId === 'rear-foot-split-squat'
  ) {
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
    const stride = Math.sin(2 * Math.PI * t);
    const rightLift = Math.max(0, stride);
    const leftLift = Math.max(0, -stride);
    return skeleton(
      point(100, 46),
      point(100, 60),
      point(100, 104),
      point(78, 84),
      point(72, 108),
      point(122, 84),
      point(128, 108),
      point(82, 140 - 6 * rightLift),
      point(80, 174 - 9 * rightLift),
      point(70, 177 - 9 * rightLift),
      point(118, 146 - 6 * leftLift),
      point(120, 174 - 9 * leftLift),
      point(130, 177 - 9 * leftLift),
    );
  }
  if (exerciseId === 'goblet-squat') {
    const hipY = mix(118, 136, t);
    const neckY = hipY - 44;
    const kneeDX = mix(18, 31, t);
    const ankleDX = mix(18, 27, t);
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

  const movingRight = working !== 'left';
  const rackX = movingRight ? 78 : 122;
  const oppositeX = movingRight ? 122 : 78;
  const lift = Math.sin(Math.PI * t);
  return skeleton(
    point(100, 46),
    point(100, 60),
    point(100, 104),
    point(rackX + (movingRight ? 9 : -9), 88),
    point(rackX, 65),
    point(oppositeX + (movingRight ? -4 : 4), 88),
    point(oppositeX, 105),
    point(82, 137 - 7 * lift),
    point(80, 174 - 10 * lift),
    point(70, 177 - 10 * lift),
    point(118, 148),
    point(120, 174),
    point(130, 177),
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

/** Three-quarter projections expose front/back support relationships. */
export function obliqueMovementPose(
  exerciseId: ObliqueViewExercise,
  progress: number,
  working: Working | null = 'right',
): Pose {
  const t = clamp(progress);
  if (exerciseId === 'russian-twist') return russianTwistProjection(t).pose;
  if (exerciseId === 'split-squat') {
    const depth = t;
    const rightFront = working !== 'left';
    const hip = point(100, mix(111, 133, depth));
    const neck = point(104, hip[1] - 44);
    const front = rightFront
      ? {
          knee: point(82, mix(145, 153, depth)),
          ankle: point(81, 174),
          toe: point(71, 177),
        }
      : {
          knee: point(118, mix(145, 153, depth)),
          ankle: point(119, 174),
          toe: point(129, 177),
        };
    const rear = rightFront
      ? {
          knee: point(120, mix(136, 146, depth)),
          ankle: point(128, 143),
          toe: point(138, 146),
        }
      : {
          knee: point(80, mix(136, 146, depth)),
          ankle: point(72, 143),
          toe: point(62, 146),
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

  const hip: Pt = [106, 136];
  const supportAnkle: Pt = [163, 122];
  const angle = mix(1.15, -0.42, t);
  const kneeDir: Pt = [32, 10];
  const kneeLen = Math.hypot(kneeDir[0], kneeDir[1]);
  const knee: Pt = [
    hip[0] + (29.35 * kneeDir[0]) / kneeLen,
    hip[1] + (29.35 * kneeDir[1]) / kneeLen,
  ];
  const movingAnkle: Pt = [
    knee[0] + 29.35 * Math.cos(angle),
    knee[1] + 29.35 * Math.sin(angle),
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
  const pose =
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
  const rackSide: 'R' | 'L' = working === 'left' ? 'L' : 'R';
  const heldAt: Pt[] =
    kind === null
      ? []
      : exerciseId === 'goblet-squat'
        ? [[100, pose.neck[1] + 11]]
        : exerciseId === 'farmer-carry'
          ? [pose.hR, pose.hL]
          : exerciseId === 'side-lunge'
            ? [[(pose.hR[0] + pose.hL[0]) / 2, (pose.hR[1] + pose.hL[1]) / 2]]
            : exerciseId === 'russian-twist'
              ? [[(pose.hR[0] + pose.hL[0]) / 2, (pose.hR[1] + pose.hL[1]) / 2]]
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
      {exerciseId === 'split-squat' ? (
        <path
          data-contact-plane="rear-foot"
          d="M54 151h96"
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
            <Held key={at.join(',')} kind={kind} at={at} />
          ))}
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
