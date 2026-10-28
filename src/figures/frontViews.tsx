import type { ExerciseId } from '../domain/types';
import type { Equipment, Working } from './Figure';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import { figures } from './poses';
import { FloorLine, Held } from './props';

export const supportedFrontViews = [
  'goblet-squat',
  'dumbbell-rdl',
  'kettlebell-rack-carry',
  'step-up',
  'rear-foot-split-squat',
  'suitcase-carry',
  'reverse-lunge',
  'forward-lunge',
  'half-squat',
  'single-leg-chair-squat',
  'farmer-carry',
] as const satisfies readonly ExerciseId[];

export const supportedObliqueViews = [
  'split-squat',
  'bench-side-plank-leg-lift',
] as const satisfies readonly ExerciseId[];

export type FigureAngle = 'side' | 'front' | 'oblique';

export function supportsObliqueView(
  exerciseId: ExerciseId,
): exerciseId is (typeof supportedObliqueViews)[number] {
  return (supportedObliqueViews as readonly ExerciseId[]).includes(exerciseId);
}

export function supportedViewsFor(
  exerciseId: ExerciseId,
): readonly FigureAngle[] {
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

/** Purpose-drawn frontal geometry for the small set of readable front views. */
export function frontMovementPose(
  exerciseId: FrontViewExercise,
  progress: number,
  working: Working | null = 'right',
): Pose {
  const t = clamp(progress);
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
  if (exerciseId === 'step-up' || exerciseId === 'rear-foot-split-squat') {
    const step = exerciseId === 'step-up';
    const hipY = step ? mix(108, 84, t) : mix(112, 140, t);
    const neckY = hipY - 44;
    // Feet occupy distinct depth planes: the support remains fixed while the
    // trailing foot rises (step-up) or rests on the rear bench (split squat).
    const selected = {
      knee: point(82, step ? mix(117, 113, t) : mix(146, 155, t)),
      ankle: point(82, step ? 143 : 174),
      toe: point(72, step ? 146 : 177),
    };
    const other = {
      knee: point(118, step ? mix(140, 113, t) : mix(132, 155, t)),
      ankle: point(120, step ? mix(174, 138, t) : 139),
      toe: point(130, step ? mix(177, 141, t) : 142),
    };
    const right = working === 'left' ? other : selected;
    const left = working === 'left' ? selected : other;
    // Anatomical right is always viewer-left; select geometry before placing it.
    const place = (p: Pt, side: 'R' | 'L'): Pt =>
      point(
        side === 'R' ? 100 - Math.abs(p[0] - 100) : 100 + Math.abs(p[0] - 100),
        p[1],
      );
    return skeleton(
      point(100, neckY - 14),
      point(100, neckY),
      point(100, hipY),
      point(78, neckY + 22),
      point(72, neckY + 44),
      point(122, neckY + 22),
      point(128, neckY + 44),
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

/** Three-quarter projections expose front/back support relationships. */
export function obliqueMovementPose(
  exerciseId: ObliqueViewExercise,
  progress: number,
  working: Working | null = 'right',
): Pose {
  const t = clamp(progress);
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

  const hip: Pt = [106, 128];
  const knee: Pt = [138, 146];
  const angle = mix(0.78, -0.42, t);
  const movingAnkle: Pt = [
    knee[0] + 34 * Math.cos(angle),
    knee[1] + 34 * Math.sin(angle),
  ];
  const supportAnkle: Pt = [163, 122];
  const toe = (ankle: Pt): Pt => [ankle[0] + 10, ankle[1] + 3];
  const moving = { knee, ankle: movingAnkle, toe: toe(movingAnkle) };
  const supported = {
    knee: point(137, 120),
    ankle: supportAnkle,
    toe: toe(supportAnkle),
  };
  const right = working === 'left' ? supported : moving;
  const left = working === 'left' ? moving : supported;
  const lowerArm: [Pt, Pt] = [
    [57, 176],
    [94, 176],
  ];
  const upperArm: [Pt, Pt] = [
    [70, 109],
    [97, 123],
  ];
  const rightArm = working === 'left' ? upperArm : lowerArm;
  const leftArm = working === 'left' ? lowerArm : upperArm;
  return skeleton(
    [34, 120],
    [52, 128],
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
  const arm = (elbow: Pt, hand: Pt) => line([pose.neck, elbow, hand]);
  const leg = (knee: Pt, ankle: Pt, toe: Pt) =>
    line([pose.hip, knee, ankle, toe]);

  return (
    <svg
      viewBox={exerciseId === 'step-up' ? '14 0 164 188' : viewBox}
      role="img"
      aria-hidden="true"
      className="block h-auto w-full"
      data-view={angle}
    >
      <title>{`${exerciseId} – ${angle}`}</title>
      <FloorLine />
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
      {exerciseId === 'step-up' || exerciseId === 'rear-foot-split-squat' ? (
        <g
          data-support={exerciseId === 'step-up' ? 'step' : 'rear-bench'}
          fill="var(--surface)"
          stroke="var(--equipment)"
          strokeWidth="2"
        >
          <rect
            x={(exerciseId === 'step-up') === (working !== 'left') ? 61 : 107}
            y={exerciseId === 'step-up' ? 146 : 142}
            width="34"
            height={exerciseId === 'step-up' ? 31 : 35}
            rx="2"
          />
        </g>
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
      {heldIsRack && kind === 'kettlebell' ? (
        <g data-equipment="kettlebell" data-grip="rack">
          <Held kind="kettlebell" at={heldAt[0] ?? pose.hR} rack />
        </g>
      ) : null}
      <g data-body-side="left" stroke={color('L')} {...limb}>
        <path d={arm(pose.eL, pose.hL)} />
        <path d={leg(pose.kL, pose.aL, pose.tL)} />
      </g>
      <g stroke="var(--ink)" {...limb}>
        <path d={line([pose.neck, pose.hip])} />
        <circle cx={pose.head[0]} cy={pose.head[1]} r="9" fill="var(--paper)" />
      </g>
      <g data-body-side="right" stroke={color('R')} {...limb}>
        <path d={arm(pose.eR, pose.hR)} />
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
