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
const GUARDED: ExerciseId[] = ['quad-set'];

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
      expect(figures[id]).toBeDefined();
    });
  }

  it.skip('bench-side-plank-leg-lift oblique view', () => {
    const id = 'bench-side-plank-leg-lift';
    if (!(supportedObliqueViews as readonly string[]).includes(id)) return;
    const viewBox = viewBoxOf(id);
    for (const side of ['right', 'left'] as const) {
      const frames = sample((t) => obliqueMovementPose(id as never, t, side));
      expect(outside(frames, viewBox)).toEqual([]);
    }
  });
});
