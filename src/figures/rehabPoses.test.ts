import { describe, expect, it } from 'vitest';
import { heelSlidePose, rehabMovementPose } from './rehabPoses';

const pose = (id: Parameters<typeof rehabMovementPose>[0], t: number) => {
  const result = rehabMovementPose(id, t);
  if (!result) throw new Error(`Missing rehabilitation pose for ${id}`);
  return result;
};

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));

describe('rehabilitation movement geometry', () => {
  it('swings the free pendulum foot below the hip instead of overhead during the transition', () => {
    for (let frame = 1; frame <= 9; frame++) {
      const current = pose('balance-pendulum', frame / 10);
      expect(current.aL[1]).toBeGreaterThan(current.hip[1]);
      expect(current.aL[1]).toBeLessThan(174);
    }
  });
  it('hinges forward in the pendulum while the stance leg and limb lengths stay fixed', () => {
    const start = pose('balance-pendulum', 0);
    const hinge = pose('balance-pendulum', 1);
    for (const phase of [0, 0.2, 0.5, 0.8, 1]) {
      const current = pose('balance-pendulum', phase);
      expect(current.kR).toEqual(start.kR);
      expect(current.aR).toEqual(start.aR);
      expect(current.tR).toEqual(start.tR);
      expect(distance(current.hip, current.kL)).toBeCloseTo(32, 8);
      expect(distance(current.kL, current.aL)).toBeCloseTo(29, 8);
      expect(distance(current.neck, current.head)).toBeCloseTo(14, 8);
      expect(distance(current.hip, current.neck)).toBeCloseTo(44, 8);
      expect(distance(current.neck, current.eR)).toBeCloseTo(18, 8);
      expect(distance(current.eR, current.hR)).toBeCloseTo(21, 8);
      expect(distance(current.neck, current.eL)).toBeCloseTo(18, 8);
      expect(distance(current.eL, current.hL)).toBeCloseTo(21, 8);
      expect(current.eR[1]).toBeGreaterThan(current.head[1] + 9);
      expect(current.hR[1]).toBeGreaterThan(current.head[1] + 9);
      expect(current.eL[1]).toBeGreaterThan(current.head[1] + 9);
      expect(current.hL[1]).toBeGreaterThan(current.head[1] + 9);
    }
    expect(start.kL[1]).toBeLessThan(start.hip[1] - 20);
    expect(start.kL[0]).toBeGreaterThan(start.hip[0]);
    expect(hinge.neck[0]).toBeGreaterThan(hinge.hip[0] + 35);
    expect(hinge.aL[0]).toBeLessThan(hinge.hip[0] - 50);
    expect(hinge.hR[0]).toBeGreaterThan(hinge.neck[0]);
    expect(hinge.hL[0]).toBeGreaterThan(hinge.neck[0]);
  });

  it('marks the rear kneeling leg as the hip-flexor stretch side and keeps both contacts fixed', () => {
    const start = pose('kneeling-hip-flexor-stretch', 0);
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      const current = pose('kneeling-hip-flexor-stretch', phase);
      expect(current.kR).toEqual([76, 173]);
      expect(current.aR).toEqual([42, 173]);
      expect(current.tR).toEqual([32, 173]);
      expect(current.aL).toEqual([141, 174]);
      expect(current.tL).toEqual([151, 177]);
      expect(distance(current.hip, current.kR)).toBeCloseTo(
        distance(start.hip, start.kR),
        8,
      );
      expect(distance(current.kL, current.aL)).toBeCloseTo(36, 8);
    }
  });

  it('separates the resting heel while both heel-slide feet stay on the floor', () => {
    const bent = pose('heel-slide', 0);
    expect(bent.aR[0]).not.toBe(bent.aL[0]);
    expect(Math.abs(bent.aR[0] - bent.aL[0])).toBeGreaterThanOrEqual(12);
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      const current = pose('heel-slide', phase);
      expect(current.aR[1]).toBe(174);
      expect(current.aL[1]).toBe(174);
      expect(current.tR[1]).toBe(177);
      expect(current.tL[1]).toBe(177);
      expect(distance(current.hip, current.kR)).toBeCloseTo(42, 8);
      expect(distance(current.kR, current.aR)).toBeCloseTo(42, 8);
    }
  });

  it('alternates the heel-slide leg without moving either ankle at the cycle boundary', () => {
    const rightStart = heelSlidePose(0, 'R');
    const leftStart = heelSlidePose(0, 'L');
    expect(leftStart).toEqual(rightStart);

    const rightMoving = heelSlidePose(0.5, 'R');
    const leftMoving = heelSlidePose(0.5, 'L');
    expect(rightMoving.aR).not.toEqual(rightStart.aR);
    expect(rightMoving.aL).toEqual(rightStart.aL);
    expect(leftMoving.aR).toEqual(rightStart.aR);
    expect(leftMoving.aL).not.toEqual(rightStart.aL);
    expect(leftMoving.aR[1]).toBe(174);
    expect(leftMoving.tR[1]).toBe(177);
  });

  it('keeps the lifting lower leg visibly below the bench-supported leg', () => {
    const supportAnkle = pose('bench-side-plank-leg-lift', 0).aL;
    const supportKnee = pose('bench-side-plank-leg-lift', 0).kL;
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      const current = pose('bench-side-plank-leg-lift', phase);
      expect(current.aL).toEqual(supportAnkle);
      expect(current.kL).toEqual(supportKnee);
      expect(current.aR[1]).toBeGreaterThan(current.aL[1] + 5);
      expect(current.kR[1]).toBeGreaterThan(current.kL[1] + 2);
      expect(current.aR[1]).toBeLessThanOrEqual(174);
      expect(current.tR[1]).toBeGreaterThanOrEqual(current.aR[1]);
    }
  });

  it('keeps the prone-on-forearms still frames in the supported position', () => {
    const start = pose('prone-on-forearms', 0);
    for (const phase of [0.25, 0.5, 0.75, 1]) {
      const current = pose('prone-on-forearms', phase);
      expect(current).toEqual(start);
      expect(distance(current.neck, current.eR)).toBeCloseTo(38, 8);
      expect(distance(current.eR, current.hR)).toBeCloseTo(22, 8);
      expect(distance(current.neck, current.eL)).toBeCloseTo(
        Math.hypot(4, 36),
        8,
      );
    }
  });

  it('raises the bridge hip along a fixed-length torso arc with planted support foot', () => {
    const start = pose('single-leg-floor-bridge', 0);
    const torsoLength = distance(start.neck, start.hip);
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      const current = pose('single-leg-floor-bridge', phase);
      expect(distance(current.neck, current.hip)).toBeCloseTo(torsoLength, 8);
      expect(current.aR).toEqual(start.aR);
      expect(current.tR).toEqual(start.tR);
      expect(current.aL[1]).toBeLessThan(current.hip[1]);
    }
    expect(pose('single-leg-floor-bridge', 1).hip[1]).toBeLessThan(
      start.hip[1],
    );
    expect(pose('single-leg-floor-bridge', 1).hip[0]).toBeLessThan(
      start.hip[0],
    );
  });
});
