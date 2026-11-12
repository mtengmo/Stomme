import { describe, expect, it } from 'vitest';
import { movementPose } from './Figure';
import { figures } from './poses';

const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('renegade row figure geometry', () => {
  it('keeps the support dumbbell on the floor and limb lengths constant', () => {
    const start = movementPose('renegade-row', 0);
    expect(figures['renegade-row'].held?.hands).toEqual(['hR', 'hL']);
    for (let i = 0; i <= 20; i++) {
      const pose = movementPose('renegade-row', i / 20);
      // Support glyph is +-5 high around the hand: bottom within 175-178.
      const bottom = pose.hL[1] + 5;
      expect(bottom).toBeGreaterThanOrEqual(175);
      expect(bottom).toBeLessThanOrEqual(178);
      expect(pose.neck).toEqual(start.neck);
      expect(pose.hip).toEqual(start.hip);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.aL).toEqual(start.aL);
      for (const [e, h] of [
        [pose.eR, pose.hR],
        [pose.eL, pose.hL],
      ] as const) {
        expect(dist(pose.neck, e)).toBeCloseTo(dist(start.neck, start.eR), 6);
        expect(dist(e, h)).toBeCloseTo(dist(start.neck, start.eR), 6);
      }
    }
  });

  it('rows the near hand to hip height with the elbow above the back', () => {
    const start = movementPose('renegade-row', 0);
    const top = movementPose('renegade-row', 1);
    expect(top.hR[1]).toBeLessThan(start.hR[1] - 20);
    expect(Math.abs(top.hR[1] - top.hip[1])).toBeLessThan(6);
    expect(top.eR[1]).toBeLessThan(top.neck[1] + 1);
    expect(top.hL).toEqual(start.hL);
  });
});
