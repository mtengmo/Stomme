import type { ExerciseId } from '../domain/types';
import type { Equipment, Working } from './Figure';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import { FloorLine, Held } from './props';

export const supportedFrontViews = [
  'goblet-squat',
  'dumbbell-rdl',
  'kettlebell-rack-carry',
  'step-up',
  'rear-foot-split-squat',
  'suitcase-carry',
] as const satisfies readonly ExerciseId[];

export type FrontViewExercise = (typeof supportedFrontViews)[number];

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
}: {
  exerciseId: FrontViewExercise;
  working?: Working | null;
  equipment?: Equipment;
  phase?: number;
  viewBox?: string;
}) {
  const pose = frontMovementPose(exerciseId, phase, working);
  const kind: 'dumbbell' | 'kettlebell' | null =
    equipment === 'band'
      ? null
      : equipment === undefined
        ? exerciseId === 'rear-foot-split-squat'
          ? null
          : exerciseId === 'kettlebell-rack-carry' ||
              exerciseId === 'suitcase-carry'
            ? 'kettlebell'
            : 'dumbbell'
        : equipment;
  const rackSide: 'R' | 'L' = working === 'left' ? 'L' : 'R';
  const heldAt: Pt[] =
    kind === null
      ? []
      : exerciseId === 'goblet-squat'
        ? [[100, pose.neck[1] + 11]]
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
      data-view="front"
    >
      <title>{`${exerciseId} – front`}</title>
      <FloorLine />
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
