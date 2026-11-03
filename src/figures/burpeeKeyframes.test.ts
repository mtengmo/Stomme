import { describe, expect, it } from 'vitest';
import {
  BURPEE_KEYFRAMES,
  BURPEE_STILL_PHASES,
  burpeePose,
} from './burpeeKeyframes';
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
  it('never jumps a joint more than 8 units in one 1/400 step, on both sides', () => {
    for (const side of [(p: Pose) => p, mirror]) {
      let prev = side(burpeePose(0));
      for (let i = 1; i <= 400; i++) {
        const cur = side(burpeePose(i / 400));
        for (const k of POSE_KEYS)
          expect(
            Math.hypot(cur[k][0] - prev[k][0], cur[k][1] - prev[k][1]),
          ).toBeLessThan(8);
        prev = cur;
      }
    }
  });
  it('keeps the feet low during the jump back and the jump in', () => {
    for (const t of [0.16, 0.19, 0.22, 0.56, 0.6]) {
      const p = burpeePose(t);
      expect(Math.min(p.aR[1], p.aL[1])).toBeGreaterThan(160);
    }
  });
  it('keeps every hand clear of the head in all reduced-motion stills', () => {
    for (const phase of BURPEE_STILL_PHASES) {
      const p = burpeePose(phase);
      for (const hand of [p.hR, p.hL])
        expect(
          Math.hypot(hand[0] - p.head[0], hand[1] - p.head[1]),
        ).toBeGreaterThan(9);
    }
  });
  it('puts both hands on the floor in front of the feet in the hands-down still', () => {
    const p = burpeePose(BURPEE_STILL_PHASES[1]);
    for (const [hand, ankle] of [
      [p.hR, p.aR],
      [p.hL, p.aL],
    ] as const) {
      expect(hand[0]).toBeGreaterThan(ankle[0] + 15);
      expect(hand[1]).toBeGreaterThanOrEqual(ankle[1] - 3);
      expect(hand[1]).toBeLessThanOrEqual(178);
    }
    // Arm lengths stay constant: shoulder to hand is exactly reached.
    expect(Math.hypot(p.hR[0] - p.neck[0], p.hR[1] - p.neck[1])).toBeLessThan(
      46.01,
    );
    expect(
      Math.hypot(p.eR[0] - p.neck[0], p.eR[1] - p.neck[1]) +
        Math.hypot(p.hR[0] - p.eR[0], p.hR[1] - p.eR[1]),
    ).toBeCloseTo(46, 6);
  });
  it('shows a separate landing still with bent hips and knees', () => {
    expect(BURPEE_STILL_PHASES).toHaveLength(5);
    const jump = burpeePose(BURPEE_STILL_PHASES[3]);
    const land = burpeePose(BURPEE_STILL_PHASES[4]);
    expect(Math.min(land.aR[1], land.aL[1])).toBeGreaterThan(165);
    expect(jump.aR[1]).toBeLessThan(165);
    // Knee in front of hip and ankle: flexed rather than a straight leg.
    expect(land.kR[0]).toBeGreaterThan(land.hip[0] + 10);
    expect(land.hip[1]).toBeGreaterThan(jump.hip[1] + 20);
  });
});
