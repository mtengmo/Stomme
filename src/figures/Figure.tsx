import { useEffect, useRef, useState } from 'react';
import type { ExerciseId } from '../domain/types';
import {
  hamstringCurlPose,
  kettlebellFloorPressPose,
  seatedKneeExtensionPose,
} from './additionalPoses';
import { constrainLegInterpolation } from './constrainedLegs';
import { FrontFigureFrame, supportsFrontView } from './frontViews';
import { CYCLE_MS, cycleProgress, lerpPt, type Pt } from './lerp';
import { MuscleOverlay } from './MuscleOverlay';
import { physioMovementPose } from './physioPoses';
import {
  type FigureSpec,
  figures,
  POSE_KEYS,
  type Pose,
  type PoseKey,
} from './poses';
import { FloorLine, Held, PropShape } from './props';
import { heelSlidePose, rehabMovementPose } from './rehabPoses';

export { supportedFrontViews } from './frontViews';

export type Equipment = 'dumbbell' | 'kettlebell' | 'band' | null;

export type Working = 'right' | 'left';

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of POSE_KEYS) out[k] = lerpPt(a[k], b[k], t);
  return out;
}

export function movementPose(exerciseId: ExerciseId, t: number): Pose {
  const rehabPose = rehabMovementPose(exerciseId, t);
  if (rehabPose) return rehabPose;
  const physioPose = physioMovementPose(exerciseId, t);
  if (physioPose) return physioPose;
  if (exerciseId === 'hamstring-curl') return hamstringCurlPose(t);
  if (exerciseId === 'seated-knee-extension') return seatedKneeExtensionPose(t);
  if (exerciseId === 'kettlebell-floor-press')
    return kettlebellFloorPressPose(t);
  const spec = figures[exerciseId];
  const interpolated = !spec.middle
    ? lerpPose(spec.start, spec.end, t)
    : t < 0.5
      ? lerpPose(spec.start, spec.middle, t * 2)
      : lerpPose(spec.middle, spec.end, (t - 0.5) * 2);
  return constrainLegInterpolation(
    exerciseId,
    interpolated,
    spec.middle ? [spec.start, spec.middle, spec.end] : [spec.start, spec.end],
  );
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Hold at the end of a repetition, where it differs from the default. */
const END_HOLD_MS: Partial<Record<ExerciseId, number>> = {
  'seated-knee-extension': 5000,
  'band-knee-extension': 5000,
  'single-leg-floor-bridge': 2000,
  'quad-set': 3000,
};

/** Both ends of the band for this figure, resolved against the current pose. */
export function bandEndpoints(
  band: NonNullable<FigureSpec['band']>,
  pose: Pose,
): [Pt, Pt] {
  const from: Pt =
    typeof band.from === 'string' ? pose[band.from as PoseKey] : band.from;
  return [from, pose[band.to]];
}

/**
 * DEV only review hook: `?phase=0..1` in the hash (for example
 * `#/ovning/quad-set?phase=0.5`) freezes the figure at that cycle phase.
 */
function forcedPhase(): number | undefined {
  if (!import.meta.env.DEV || typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get(
    'phase',
  );
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : undefined;
}

const W = 6;
const line = (pts: Pt[]) => `M${pts.map((p) => p.join(' ')).join('L')}`;
const limb = {
  fill: 'none',
  strokeWidth: W,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Working limbs are blue; one-sided exercises also carry an H/V marker. */
export function FigureFrame({
  exerciseId,
  pose,
  working = 'right',
  showMuscles = false,
  equipment,
  viewBox = '14 20 164 168',
  view = 'side',
  phase = 0,
}: {
  exerciseId: ExerciseId;
  pose: Pose;
  /** null: both sides work in blue, without an H/V marker. */
  working?: Working | null;
  showMuscles?: boolean;
  equipment?: Equipment;
  viewBox?: string;
  view?: 'side' | 'front';
  /** Current animation progress, used by the authored front geometry. */
  phase?: number;
}) {
  if (view === 'front' && supportsFrontView(exerciseId))
    return (
      <FrontFigureFrame
        exerciseId={exerciseId}
        working={working}
        equipment={equipment}
        phase={phase}
        viewBox={viewBox}
      />
    );
  const spec = figures[exerciseId];
  const rack = exerciseId === 'kettlebell-rack-carry' && equipment !== null;
  let p = pose;
  // With external load, hands carry it rather than resting on the support.
  if (
    equipment &&
    (exerciseId === 'split-squat' || exerciseId === 'single-leg-calf-raise')
  ) {
    p = {
      ...pose,
      eR: [pose.neck[0] + 6, pose.neck[1] + 20],
      hR: [pose.hip[0] + 10, pose.hip[1] + 8],
    };
    if (exerciseId === 'split-squat')
      p = {
        ...p,
        eL: [pose.neck[0] - 8, pose.neck[1] + 20],
        hL: [pose.hip[0] - 12, pose.hip[1] + 8],
      };
  }
  if (
    equipment &&
    (exerciseId === 'single-leg-hip-thrust' || exerciseId === 'glute-bridge')
  ) {
    p = {
      ...p,
      hR: [p.hip[0] + 5, p.hip[1] - 5],
      hL: [p.hip[0] - 5, p.hip[1] - 5],
    };
  }
  const heldKind = equipment === undefined ? spec.held?.kind : equipment;
  const twoHandedBell =
    heldKind === 'kettlebell' &&
    ['dumbbell-rdl', 'reverse-lunge', 'forward-lunge'].includes(exerciseId);
  if (twoHandedBell) {
    if (exerciseId === 'dumbbell-rdl') {
      // The bell hangs below the hands: leave room above the floor at the bottom.
      p = lerpPose(spec.start, p, 0.8);
      const hands: Pt = [(p.hR[0] + p.hL[0]) / 2, (p.hR[1] + p.hL[1]) / 2];
      const elbow: Pt = [
        (p.neck[0] + hands[0]) / 2,
        (p.neck[1] + hands[1]) / 2,
      ];
      p = { ...p, eR: elbow, eL: elbow, hR: hands, hL: hands };
    } else {
      const hands: Pt = [p.neck[0] + 13, p.neck[1] + 9];
      p = {
        ...p,
        eR: [p.neck[0] + 12, p.neck[1] + 26],
        eL: [p.neck[0] + 6, p.neck[1] + 24],
        hR: hands,
        hL: hands,
      };
    }
  }
  const anchors: Pt[] = twoHandedBell
    ? [p.hR]
    : exerciseId === 'single-leg-hip-thrust' || exerciseId === 'glute-bridge'
      ? [[p.hip[0], p.hip[1] - (heldKind === 'kettlebell' ? 16 : 5)]]
      : (
          spec.held?.hands ??
          (exerciseId === 'split-squat'
            ? (['hR', 'hL'] as const)
            : (['hR'] as const))
        ).map((hand) => p[hand]);
  if (equipment === null && exerciseId === 'goblet-squat')
    p = {
      ...p,
      eR: [p.neck[0] + 21, p.neck[1] + 7],
      hR: [p.neck[0] + 43, p.neck[1] + 9],
      eL: [p.neck[0] + 19, p.neck[1] + 10],
      hL: [p.neck[0] + 41, p.neck[1] + 12],
    };
  const accent = !showMuscles ? 'var(--accent)' : 'var(--ink)';
  const farSide =
    working === null && !showMuscles ? 'var(--accent)' : 'var(--edge)';
  // Left sets mirror the whole scene so the working limb keeps its geometry.
  const mirror =
    working === 'left' ? 'translate(192 0) scale(-1 1)' : undefined;
  const arm = (e: Pt, h: Pt) => line([p.neck, e, h]);
  const leg = (k: Pt, a: Pt, t: Pt) => line([p.hip, k, a, t]);
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-hidden="true"
      className="block h-auto w-full"
    >
      <title>{exerciseId}</title>
      <g transform={mirror}>
        {spec.props.map((pr) => (
          <PropShape key={pr.type + JSON.stringify(pr)} prop={pr} />
        ))}
        <FloorLine />
        {exerciseId === 'quad-set' ? (
          // Floor-contact cue under the knee: fades in as the knee presses down.
          <line
            data-testid="press-cue"
            x1={p.kR[0] - 9}
            y1="177"
            x2={p.kR[0] + 9}
            y2="177"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={Math.max(0, Math.min(1, (p.kR[1] - 168.5) / 5))}
          />
        ) : null}
        {showMuscles ? (
          <MuscleOverlay exerciseId={exerciseId} pose={p} />
        ) : null}
        <g data-body-side="far" stroke={farSide} {...limb}>
          <path d={arm(p.eL, p.hL)} />
          <path d={leg(p.kL, p.aL, p.tL)} />
        </g>
        <g stroke="var(--ink)" {...limb}>
          <path d={line([p.neck, p.hip])} />
          <circle cx={p.head[0]} cy={p.head[1]} r="9" fill="var(--paper)" />
        </g>
        {rack ? (
          <g data-equipment="kettlebell" data-grip="rack">
            <Held kind="kettlebell" at={p.hR} rack />
          </g>
        ) : null}
        <g data-body-side="near" stroke={accent} {...limb}>
          <path d={arm(p.eR, p.hR)} />
          <path d={leg(p.kR, p.aR, p.tR)} />
        </g>
        {rack ? (
          <g
            data-rack-hand="true"
            stroke={accent}
            strokeWidth="2"
            fill="var(--paper)"
            transform={`rotate(${(Math.atan2(p.hR[0] - p.eR[0], p.eR[1] - p.hR[1]) * 180) / Math.PI} ${p.hR[0]} ${p.hR[1]})`}
          >
            <rect x={p.hR[0] - 3} y={p.hR[1] - 4} width="6" height="8" rx="2" />
            <path d={`M${p.hR[0] - 3} ${p.hR[1]}h4`} />
          </g>
        ) : null}
        {rack ? null : spec.band && equipment !== null ? (
          <path
            data-equipment="band"
            d={line([...bandEndpoints(spec.band, p)])}
            fill="none"
            stroke="var(--equipment)"
            strokeWidth="3"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />
        ) : heldKind === 'band' ? (
          <path
            data-equipment="band"
            d={`M${p.hR.join(' ')}L${p.aR[0] + 2} ${p.aR[1] - 2}L${p.hL.join(' ')}`}
            fill="none"
            stroke="var(--equipment)"
            strokeWidth="3"
            strokeDasharray="5 3"
          />
        ) : heldKind ? (
          <g data-equipment={heldKind}>
            {anchors.map((at) => (
              <Held
                key={at.join(',')}
                kind={heldKind}
                at={at}
                vertical={exerciseId === 'hammer-curl'}
              />
            ))}
          </g>
        ) : null}
      </g>
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

/** Animated figure; two labelled static frames under reduced motion. */
export function Figure({
  exerciseId,
  working = 'right',
  stillOnly = false,
  paused = false,
  showMuscles = false,
  equipment,
  view = 'side',
}: {
  exerciseId: ExerciseId;
  working?: Working | null;
  /** Show only the start frame (small slots under reduced motion). */
  stillOnly?: boolean;
  paused?: boolean;
  /** Segment-attached anatomy hint, available for the reviewed prototypes. */
  showMuscles?: boolean;
  equipment?: Equipment;
  view?: 'side' | 'front';
}) {
  const forced = forcedPhase();
  const reduced = usePrefersReducedMotion() && forced === undefined;
  const spec = figures[exerciseId];
  const [t, setT] = useState(0);
  const elapsedMs = useRef(0);

  useEffect(() => {
    if (reduced || paused || forced !== undefined) return;
    let raf = 0;
    const t0 = performance.now() - elapsedMs.current;
    const tick = (now: number) => {
      elapsedMs.current = now - t0;
      setT(
        spec.motion === 'ballistic'
          ? (1 - Math.cos((elapsedMs.current / 1100) * Math.PI * 2)) / 2
          : cycleProgress(elapsedMs.current, END_HOLD_MS[exerciseId]),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, paused, forced, spec.motion, exerciseId]);

  if (reduced && !stillOnly) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['Start', spec.start],
            ['Slut', spec.end],
          ] as const
        ).map(([label, pose]) => (
          <figure key={label} className="m-0">
            <FigureFrame
              exerciseId={exerciseId}
              pose={pose}
              working={working}
              equipment={equipment}
              showMuscles={showMuscles}
              view={view}
              phase={label === 'Slut' ? 1 : 0}
            />
            <figcaption className="text-center text-base font-bold">
              {label}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }
  const pose = reduced
    ? spec.start
    : forced !== undefined
      ? movementPose(exerciseId, forced)
      : spec.motion === 'hold'
        ? spec.end
        : movementPose(exerciseId, t);
  const displayedPose =
    exerciseId === 'heel-slide'
      ? heelSlidePose(
          reduced ? 0 : t,
          Math.floor(elapsedMs.current / CYCLE_MS) % 2 === 1 ? 'L' : 'R',
        )
      : pose;
  return (
    <FigureFrame
      exerciseId={exerciseId}
      pose={displayedPose}
      working={working}
      equipment={equipment}
      showMuscles={showMuscles}
      view={view}
      phase={forced ?? (reduced ? 0 : spec.motion === 'hold' ? 1 : t)}
    />
  );
}
