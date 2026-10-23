import type { ExerciseId } from '../domain/types';
import type { Equipment, Working } from './Figure';
import type { Pt } from './lerp';
import type { Pose } from './poses';
import { FloorLine, Held } from './props';

export const supportedFrontViews = [
  'goblet-squat',
  'dumbbell-rdl',
  'kettlebell-rack-carry',
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
        ? exerciseId === 'kettlebell-rack-carry'
          ? 'kettlebell'
          : 'dumbbell'
        : equipment;
  const rackSide: 'R' | 'L' = working === 'left' ? 'L' : 'R';
  const heldAt: Pt[] =
    kind === null
      ? []
      : exerciseId === 'goblet-squat'
        ? [[100, pose.neck[1] + 11]]
        : exerciseId === 'kettlebell-rack-carry'
          ? [rackSide === 'R' ? pose.hR : pose.hL]
          : kind === 'kettlebell'
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
      viewBox={viewBox}
      role="img"
      aria-hidden="true"
      className="block h-auto w-full"
      data-view="front"
    >
      <title>{`${exerciseId} – front`}</title>
      <FloorLine />
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
