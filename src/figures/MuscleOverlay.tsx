import { useId } from 'react';
import type { MuscleGroupId } from '../content/muscles';
import { exerciseMuscles } from '../content/muscles';
import type { ExerciseId } from '../domain/types';
import type { Pt } from './lerp';
import { lerpPt } from './lerp';
import type { Pose } from './poses';

type Region = {
  group: MuscleGroupId;
  shape: 'thigh' | 'hip' | 'trunk';
  a: Pt;
  b?: Pt;
  /** 0..1: how hard the muscle works right now (primary fill opacity). */
  strength?: number;
  width?: number;
};

function lowerCore(pose: Pose): Region {
  return {
    group: 'core',
    shape: 'trunk',
    a: lerpPt(pose.neck, pose.hip, 0.45),
    b: lerpPt(pose.neck, pose.hip, 0.9),
  };
}

function segment(
  a: Pt,
  b: Pt,
  width: number,
  group: MuscleGroupId,
  role: 'primary' | 'secondary',
  patternId: string,
  strength = 1,
) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <rect
      key={`${group}-${a.join(',')}-${b.join(',')}`}
      x={a[0]}
      y={a[1] - width / 2}
      width={length}
      height={width}
      rx={width / 2}
      transform={`rotate(${angle} ${a[0]} ${a[1]})`}
      fill={role === 'primary' ? 'var(--accent)' : `url(#${patternId})`}
      fillOpacity={role === 'primary' ? 0.48 - 0.46 * (1 - strength) : 1}
      stroke="var(--accent)"
      strokeWidth="1.5"
    />
  );
}

function circle(
  at: Pt,
  radius: number,
  group: MuscleGroupId,
  role: 'primary' | 'secondary',
  patternId: string,
) {
  return (
    <ellipse
      key={`${group}-${at.join(',')}`}
      cx={at[0]}
      cy={at[1]}
      rx={radius}
      ry={radius * 0.68}
      fill={role === 'primary' ? 'var(--accent)' : `url(#${patternId})`}
      fillOpacity={role === 'primary' ? 0.48 : 1}
      stroke="var(--accent)"
      strokeWidth="1.5"
    />
  );
}

/** Small, deliberately schematic patches attached to interpolated joints. */
export function MuscleOverlay({
  exerciseId,
  pose,
}: {
  exerciseId: ExerciseId;
  pose: Pose;
}) {
  const patternId = `muscle-hatch-${useId().replace(/:/g, '')}`;
  const mapping = exerciseMuscles[exerciseId];
  const roleFor = (group: MuscleGroupId) =>
    mapping.primary.includes(group)
      ? 'primary'
      : mapping.secondary.includes(group)
        ? 'secondary'
        : null;
  const regions: Region[] = [];

  if (exerciseId === 'goblet-chair-squat') {
    for (const group of ['quads', 'hamstrings'] as const) {
      if (roleFor(group)) {
        regions.push({ group, shape: 'thigh', a: pose.hip, b: pose.kR });
        regions.push({ group, shape: 'thigh', a: pose.hip, b: pose.kL });
      }
    }
    if (roleFor('glutes'))
      regions.push({ group: 'glutes', shape: 'hip', a: pose.hip });
    if (roleFor('core')) regions.push(lowerCore(pose));
  }
  if (exerciseId === 'single-leg-rdl') {
    if (roleFor('hamstrings'))
      regions.push({
        group: 'hamstrings',
        shape: 'thigh',
        a: pose.hip,
        b: pose.kR,
      });
    if (roleFor('glutes'))
      regions.push({ group: 'glutes', shape: 'hip', a: pose.hip });
    if (roleFor('core')) regions.push(lowerCore(pose));
  }
  if (exerciseId === 'quad-set' && roleFor('quads')) {
    // The thigh muscle tightens as the knee presses down.
    const pressed = Math.max(0, Math.min(1, (pose.kR[1] - 168.5) / 5));
    regions.push({
      group: 'quads',
      shape: 'thigh',
      a: pose.hip,
      b: pose.kR,
      strength: pressed,
      width: 12 + 10 * pressed,
    });
  }
  if (exerciseId === 'dead-bug' && roleFor('core')) {
    regions.push(lowerCore(pose));
  }

  if (!regions.length) return null;
  return (
    <g>
      <defs>
        <pattern
          id={patternId}
          width="5"
          height="5"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="5" height="5" fill="var(--paper)" fillOpacity="0.8" />
          <path d="M0 0V5" stroke="var(--accent)" strokeWidth="2" />
        </pattern>
      </defs>
      {regions.map(({ group, shape, a, b, strength, width }) => {
        const role = roleFor(group);
        if (!role) return null;
        if (shape === 'hip') return circle(a, 9, group, role, patternId);
        if (!b) return null;
        return segment(
          a,
          b,
          width ?? (shape === 'trunk' ? 13 : 8),
          group,
          role,
          patternId,
          strength,
        );
      })}
    </g>
  );
}
