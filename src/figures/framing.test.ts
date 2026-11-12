import { describe, expect, it } from 'vitest';
import type { ExerciseId } from '../domain/types';
import { FRAMING, movementPose } from './Figure';
import { obliqueMovementPose, supportedObliqueViews } from './frontViews';
import { checkPoseGeometry, type ViewBox } from './keyframes';
import { figures, POSE_KEYS, type Pose } from './poses';
import { heelSlidePose } from './rehabPoses';

/** A left-working figure is drawn with translate(192 0) scale(-1 1). */
const MIRROR_X = 192;
const DEFAULT_FRAMING = '14 20 164 168';
const STEPS = 100;

const mirror = (pose: Pose): Pose => {
  const out = { ...pose };
  for (const key of POSE_KEYS) {
    const [x, y] = pose[key];
    out[key] = [MIRROR_X - x, y];
  }
  return out;
};

const viewBoxOf = (id: ExerciseId): ViewBox =>
  (FRAMING[id] ?? DEFAULT_FRAMING).split(' ').map(Number) as unknown as ViewBox;

const sample = (make: (t: number) => Pose): Pose[] =>
  Array.from({ length: STEPS + 1 }, (_, i) => make(i / STEPS));

/** Ids whose joints once left the framing; guarded for both working sides. */
const GUARDED: ExerciseId[] = [
  'quad-set',
  'dumbbell-pullover',
  'prone-on-forearms',
  'heel-slide',
  'bench-side-plank-leg-lift',
];

const outside = (frames: Pose[], viewBox: ViewBox) =>
  checkPoseGeometry(frames, {
    floorY: 1000,
    viewBox,
    props: [],
    minHeadClearance: 0,
  }).filter((v) => v.type === 'outside-viewbox');

describe('FRAMING keeps every joint in view on both working sides', () => {
  for (const id of GUARDED) {
    it(`${id} side view`, () => {
      const viewBox = viewBoxOf(id);
      const right = sample((t) =>
        id === 'heel-slide' ? heelSlidePose(t, 'R') : movementPose(id, t),
      );
      const left =
        id === 'heel-slide'
          ? sample((t) => heelSlidePose(t, 'L')).map(mirror)
          : right.map(mirror);
      expect(outside(right, viewBox)).toEqual([]);
      expect(outside(left, viewBox)).toEqual([]);
      // Props (a bench, a step, a wall) must fit on both sides too; a mat is a floor strip that may bleed off the edge.
      for (const prop of figures[id].props.filter((p) => p.type !== 'mat')) {
        const xs: number[] =
          'x1' in prop
            ? [prop.x1, prop.x2]
            : 'w' in prop
              ? [prop.x, prop.x + prop.w]
              : 'x' in prop
                ? [prop.x]
                : [];
        for (const x of xs) {
          expect(x).toBeGreaterThanOrEqual(viewBox[0]);
          expect(x).toBeLessThanOrEqual(viewBox[0] + viewBox[2]);
          expect(MIRROR_X - x).toBeGreaterThanOrEqual(viewBox[0]);
          expect(MIRROR_X - x).toBeLessThanOrEqual(viewBox[0] + viewBox[2]);
        }
      }
    });
  }

  it('bench-side-plank-leg-lift oblique view', () => {
    const id = 'bench-side-plank-leg-lift';
    if (!(supportedObliqueViews as readonly string[]).includes(id)) return;
    const viewBox = viewBoxOf(id);
    for (const side of ['right', 'left'] as const) {
      const frames = sample((t) => obliqueMovementPose(id as never, t, side));
      expect(outside(frames, viewBox)).toEqual([]);
    }
  });
});

/** Visible margin (viewBox units) kept around every joint: a rounded line end must not touch the frame edge. */
const EDGE_MARGIN = 8;

const insideWithMargin = (frames: Pose[], [x, y, w, h]: ViewBox) =>
  frames.flatMap((pose, frame) =>
    POSE_KEYS.filter(
      (key) =>
        pose[key][0] < x + EDGE_MARGIN ||
        pose[key][0] > x + w - EDGE_MARGIN ||
        pose[key][1] < y + EDGE_MARGIN ||
        pose[key][1] > y + h - EDGE_MARGIN,
    ).map((key) => `${frame}:${key}`),
  );

describe('FRAMING keeps a visible margin around the feet and hands', () => {
  it('renegade-row, both working sides', () => {
    const viewBox = viewBoxOf('renegade-row');
    const right = sample((t) => movementPose('renegade-row', t));
    expect(insideWithMargin(right, viewBox)).toEqual([]);
    expect(insideWithMargin(right.map(mirror), viewBox)).toEqual([]);
  });

  it('mountain-climber, every phase', () => {
    const frames = sample((t) => movementPose('mountain-climber', t));
    expect(insideWithMargin(frames, viewBoxOf('mountain-climber'))).toEqual([]);
    // Reduced-motion stills.
    for (const pose of [
      figures['mountain-climber'].start,
      figures['mountain-climber'].end,
    ])
      expect(insideWithMargin([pose], viewBoxOf('mountain-climber'))).toEqual(
        [],
      );
  });
});
