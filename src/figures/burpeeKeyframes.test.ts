import { describe, expect, it } from 'vitest';
import { BURPEE_KEYFRAMES, burpeePose } from './burpeeKeyframes';
import { checkPoseGeometry } from './keyframes';
import { figures, POSE_KEYS, type Pose } from './poses';

const frames = (n: number) =>
  Array.from({ length: n + 1 }, (_, i) => burpeePose(i / n));
const mirror = (p: Pose): Pose => {
  const out = { ...p };
  for (const k of POSE_KEYS) out[k] = [192 - p[k][0], p[k][1]];
  return out;
};
const gate = (list: Pose[]) =>
  checkPoseGeometry(list, {
    floorY: 178,
    viewBox: [0, -30, 200, 218],
    props: figures.burpee.props,
    minHeadClearance: 9,
  });

describe('E60 burpee keyframes', () => {
  it('is a named sequence that ends where it starts', () => {
    expect(BURPEE_KEYFRAMES.every((k) => k.name)).toBe(true);
    expect(burpeePose(0)).toEqual(burpeePose(1));
    expect(figures.burpee.motion).toBe('sequence');
  });
  it('passes the geometry gate over 400 frames on both sides', () => {
    expect(gate(frames(400))).toEqual([]);
    expect(gate(frames(400).map(mirror))).toEqual([]);
  });
  it('keeps both hands fixed on the floor from landing in to jumping out', () => {
    const ref = burpeePose(0.12);
    for (let i = 0; i <= 100; i++) {
      const t = 0.12 + (0.51 * i) / 100;
      const p = burpeePose(t);
      expect(p.hR[0]).toBeCloseTo(ref.hR[0], 6);
      expect(p.hR[1]).toBeCloseTo(ref.hR[1], 6);
      expect(p.hL[0]).toBeCloseTo(ref.hL[0], 6);
      expect(p.hL[1]).toBeCloseTo(ref.hL[1], 6);
    }
  });
  it('lowers the chest in the push-up and leaves the ground in the jump', () => {
    expect(burpeePose(0.37).neck[1]).toBeGreaterThan(
      burpeePose(0.25).neck[1] + 15,
    );
    expect(burpeePose(0.84).aR[1]).toBeLessThan(165);
    expect(burpeePose(0.84).hR[1]).toBeLessThan(burpeePose(0.84).head[1]);
  });
});
