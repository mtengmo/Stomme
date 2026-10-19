import { useEffect, useState } from 'react';
import type { ExerciseId } from '../domain/types';
import { cycleProgress, lerpPt, type Pt } from './lerp';
import { figures, POSE_KEYS, type Pose } from './poses';
import { FloorLine, Held, PropShape } from './props';

export type Working = 'right' | 'left';

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of POSE_KEYS) out[k] = lerpPt(a[k], b[k], t);
  return out;
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

const W = 6;
const line = (pts: Pt[]) => `M${pts.map((p) => p.join(' ')).join('L')}`;
const limb = {
  fill: 'none',
  strokeWidth: W,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** One frame. The working side is blue and carries a letter marker. */
export function FigureFrame({
  exerciseId,
  pose,
  working = 'right',
}: {
  exerciseId: ExerciseId;
  pose: Pose;
  /** null: two-sided exercise, no marker and no accent colour. */
  working?: Working | null;
}) {
  const spec = figures[exerciseId];
  const p = pose;
  const accent = working ? 'var(--blue)' : 'var(--ink)';
  // Left sets mirror the whole scene so the working limb keeps its geometry.
  const mirror =
    working === 'left' ? 'translate(192 0) scale(-1 1)' : undefined;
  const arm = (e: Pt, h: Pt) => line([p.neck, e, h]);
  const leg = (k: Pt, a: Pt, t: Pt) => line([p.hip, k, a, t]);
  return (
    <svg
      viewBox="14 20 164 168"
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
        <g stroke="var(--edge)" {...limb}>
          <path d={arm(p.eL, p.hL)} />
          <path d={leg(p.kL, p.aL, p.tL)} />
        </g>
        <g stroke="var(--ink)" {...limb}>
          <path d={line([p.neck, p.hip])} />
          <circle cx={p.head[0]} cy={p.head[1]} r="9" fill="var(--paper)" />
        </g>
        <g stroke={accent} {...limb}>
          <path d={arm(p.eR, p.hR)} />
          <path d={leg(p.kR, p.aR, p.tR)} />
        </g>
        {spec.held
          ? spec.held.hands.map((h) => (
              <Held key={h} kind={spec.held?.kind ?? 'dumbbell'} at={p[h]} />
            ))
          : null}
      </g>
      {working ? (
        <text
          x="20"
          y="58"
          fontSize="28"
          fontWeight="800"
          fill="var(--blue)"
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
}: {
  exerciseId: ExerciseId;
  working?: Working | null;
  /** Show only the start frame (small slots under reduced motion). */
  stillOnly?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const spec = figures[exerciseId];
  const [t, setT] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setT(cycleProgress(now - t0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

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
            />
            <figcaption className="text-center text-base font-bold">
              {label}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <FigureFrame
      exerciseId={exerciseId}
      pose={reduced ? spec.start : lerpPose(spec.start, spec.end, t)}
      working={working}
    />
  );
}
