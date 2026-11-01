import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exerciseList } from '../content/exercises';
import type { ExerciseId } from '../domain/types';
import { applyEquipmentPose } from './equipmentPose';
import { movementPose } from './Figure';
import {
  frontMovementPose,
  obliqueMovementPose,
  supportedFrontViews,
  supportedObliqueViews,
} from './frontViews';
import { checkPoseGeometry } from './keyframes';
import { figures, type Pose } from './poses';
import { heelSlidePose } from './rehabPoses';

/**
 * Ratchet over every figure. The baseline file holds today's worst value per
 * `id|view|metric`; a figure may never get worse, a new figure must be inside
 * tolerance, and a fixed figure must have its row removed (the test says so).
 * Regenerate with `UPDATE_FIGURE_BASELINE=1 npx vitest run --project unit
 * src/figures/figureGeometry.test.ts` after fixing a figure.
 */
const BASELINE_PATH = new URL(
  './figureGeometry.baseline.json',
  import.meta.url,
);
const TOLERANCE = 0.5;
const STEPS = 100;
const NO_SIDE_VIEW: string[] = [
  'seated-tibial-rotation',
  'single-leg-lateral-hop',
];

type Pair = readonly [keyof Pose, keyof Pose];
const SEGMENTS: readonly Pair[] = [
  ['head', 'neck'],
  ['neck', 'hip'],
  ['neck', 'eR'],
  ['eR', 'hR'],
  ['neck', 'eL'],
  ['eL', 'hL'],
  ['hip', 'kR'],
  ['kR', 'aR'],
  ['aR', 'tR'],
  ['hip', 'kL'],
  ['kL', 'aL'],
  ['aL', 'tL'],
];
const ASYM: readonly [Pair, Pair][] = [
  [SEGMENTS[2] as Pair, SEGMENTS[4] as Pair],
  [SEGMENTS[3] as Pair, SEGMENTS[5] as Pair],
  [SEGMENTS[6] as Pair, SEGMENTS[9] as Pair],
  [SEGMENTS[7] as Pair, SEGMENTS[10] as Pair],
  [SEGMENTS[8] as Pair, SEGMENTS[11] as Pair],
];
const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
const isThigh = ([a, b]: Pair) => a === 'hip' && (b === 'kR' || b === 'kL');

function measure(
  id: string,
  view: 'side' | 'front' | 'oblique',
  frames: Pose[],
  props: Parameters<typeof checkPoseGeometry>[1]['props'],
  out: Record<string, number>,
) {
  const put = (metric: string, value: number, tol = TOLERANCE) => {
    if (value > tol)
      out[`${id}|${view}|${metric}`] = Math.round(value * 10) / 10;
  };
  for (const seg of SEGMENTS) {
    const lengths = frames.map((f) => dist(f[seg[0]], f[seg[1]]));
    const first = lengths[0] as number;
    const spread =
      isThigh(seg) && view === 'front'
        ? Math.max(...lengths) - first
        : Math.max(...lengths) - Math.min(...lengths);
    put(`drift:${seg[0]}-${seg[1]}`, spread);
  }
  if (view !== 'front')
    for (const [a, b] of ASYM) {
      const gap = Math.max(
        ...frames.map((f) =>
          Math.abs(dist(f[a[0]], f[a[1]]) - dist(f[b[0]], f[b[1]])),
        ),
      );
      put(`asym:${a[0]}-${a[1]}`, gap);
    }
  if (view === 'side') {
    const vs = checkPoseGeometry(frames, {
      floorY: 178,
      viewBox: [-1000, -1000, 3000, 3000],
      props,
      minHeadClearance: 9,
      lengthTolerance: 1000,
    });
    for (const type of [
      'below-floor',
      'foot-in-prop',
      'head-clearance',
    ] as const)
      put(`count:${type}`, vs.filter((v) => v.type === type).length, 0);
  }
}

function currentMetrics(): Record<string, number> {
  const out: Record<string, number> = {};
  const sample = (make: (t: number) => Pose) =>
    Array.from({ length: STEPS + 1 }, (_, i) => make(i / STEPS));
  for (const e of exerciseList) {
    const id = e.id as ExerciseId;
    const spec = figures[id];
    const draw = (p: Pose) => applyEquipmentPose(id, p, undefined).p;
    if (!NO_SIDE_VIEW.includes(id)) {
      const frames =
        spec.motion === 'hold'
          ? [draw(spec.end)]
          : id === 'heel-slide'
            ? sample((t) => draw(heelSlidePose(t, 'R')))
            : sample((t) => draw(movementPose(id, t)));
      measure(id, 'side', frames, spec.props, out);
    }
    if ((supportedFrontViews as readonly string[]).includes(id))
      measure(
        id,
        'front',
        sample((t) => frontMovementPose(id as never, t, 'right')),
        [],
        out,
      );
    if ((supportedObliqueViews as readonly string[]).includes(id))
      measure(
        id,
        'oblique',
        sample((t) => obliqueMovementPose(id as never, t, 'right')),
        [],
        out,
      );
  }
  return out;
}

describe('figure geometry ratchet', () => {
  const current = currentMetrics();
  if (process.env.UPDATE_FIGURE_BASELINE) {
    writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(Object.fromEntries(Object.entries(current).sort()), null, 1)}\n`,
    );
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<
    string,
    number
  >;

  it('no figure gets worse and no new figure is outside tolerance', () => {
    const worse = Object.entries(current)
      .filter(([k, v]) => v > (baseline[k] ?? 0) + 0.05)
      .map(([k, v]) => `${k}: ${v} (baseline ${baseline[k] ?? 'none'})`);
    expect(worse).toEqual([]);
  });
  it('fixed figures have their baseline row removed', () => {
    const stale = Object.keys(baseline).filter((k) => !(k in current));
    expect(stale).toEqual([]);
  });
});
