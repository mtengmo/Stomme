import { describe, expect, it } from 'vitest';
import { movementPose } from './Figure';
import { figures } from './poses';

const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('weighted sit-up figure geometry', () => {
  it('rotates the trunk about the hip from 0 to about 65 degrees', () => {
    for (const [t, deg] of [
      [0, 0],
      [1, 65],
    ] as const) {
      const pose = movementPose('weighted-sit-up', t);
      const rise =
        (Math.atan2(pose.hip[1] - pose.neck[1], pose.hip[0] - pose.neck[0]) *
          180) /
        Math.PI;
      expect(rise).toBeCloseTo(deg, 3);
    }
    expect(movementPose('weighted-sit-up', 1).neck[0]).toBeGreaterThan(
      movementPose('weighted-sit-up', 0).neck[0],
    );
  });

  it('keeps feet, knees and hip fixed and the trunk length constant', () => {
    const start = movementPose('weighted-sit-up', 0);
    for (let i = 0; i <= 20; i++) {
      const pose = movementPose('weighted-sit-up', i / 20);
      for (const k of ['hip', 'kR', 'aR', 'tR', 'kL', 'aL', 'tL'] as const)
        expect(pose[k]).toEqual(start[k]);
      expect(dist(pose.neck, pose.hip)).toBeCloseTo(
        dist(start.neck, start.hip),
        6,
      );
      expect(pose.hR).toEqual(pose.hL);
      expect(dist(pose.neck, pose.eR)).toBeCloseTo(17, 6);
      expect(dist(pose.eR, pose.hR)).toBeCloseTo(17, 6);
    }
  });

  it('holds exactly one dumbbell glyph', () => {
    expect(figures['weighted-sit-up'].held?.hands).toEqual(['hR']);
  });
});
