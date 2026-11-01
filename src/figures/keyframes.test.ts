import { describe, expect, it } from 'vitest';
import {
  checkPoseGeometry,
  fromAngle,
  type GateOptions,
  type Keyframe,
  sampleKeyframes,
  solveTwoBone,
} from './keyframes';
import type { Pt } from './lerp';
import type { Pose } from './poses';

const frames: Keyframe<{ a: number; b: number }>[] = [
  { t: 0, values: { a: 0, b: 10 } },
  { t: 0.5, values: { a: 10, b: 0 } },
  { t: 1, values: { a: 0, b: 10 } },
];

describe('sampleKeyframes', () => {
  it('returns the keyframe values at their times', () => {
    expect(sampleKeyframes(frames, 0)).toEqual({ a: 0, b: 10 });
    expect(sampleKeyframes(frames, 0.5)).toEqual({ a: 10, b: 0 });
    expect(sampleKeyframes(frames, 1)).toEqual({ a: 0, b: 10 });
  });
  it('eases between frames: halfway is halfway, an eighth is below linear', () => {
    expect(sampleKeyframes(frames, 0.25).a).toBeCloseTo(5);
    expect(sampleKeyframes(frames, 0.125).a).toBeLessThan(2.5);
  });
  it('accepts a custom ease', () => {
    expect(sampleKeyframes(frames, 0.125, true, (x) => x).a).toBeCloseTo(2.5);
  });
  it('wraps when looping and clamps otherwise', () => {
    expect(sampleKeyframes(frames, 1.25).a).toBeCloseTo(
      sampleKeyframes(frames, 0.25).a,
    );
    expect(sampleKeyframes(frames, 2)).toEqual({ a: 0, b: 10 });
    expect(sampleKeyframes(frames, -0.75).a).toBeCloseTo(
      sampleKeyframes(frames, 0.25).a,
    );
    expect(sampleKeyframes(frames, 1.25, false)).toEqual({ a: 0, b: 10 });
    expect(sampleKeyframes(frames, -1, false)).toEqual({ a: 0, b: 10 });
  });
  it('holds the end value when the last frame is before t = 1', () => {
    const short: Keyframe<{ a: number }>[] = [
      { t: 0.2, values: { a: 1 } },
      { t: 0.6, values: { a: 3 } },
    ];
    expect(sampleKeyframes(short, 0.1, false)).toEqual({ a: 1 });
    expect(sampleKeyframes(short, 0.9, false)).toEqual({ a: 3 });
  });
  it('does not return the stored object', () => {
    const out = sampleKeyframes(frames, 0);
    out.a = 99;
    expect(frames[0]?.values.a).toBe(0);
  });
  it('throws without frames', () => {
    expect(() => sampleKeyframes([], 0)).toThrow();
  });
});

const len = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('solveTwoBone', () => {
  it('keeps both segment lengths over a sweep of targets', () => {
    for (let i = 0; i < 200; i++) {
      const angle = (i / 200) * Math.PI * 2;
      const radius = 5 + (i % 50) * 1.6;
      const root: Pt = [100, 80];
      const target: Pt = [
        root[0] + radius * Math.cos(angle),
        root[1] + radius * Math.sin(angle),
      ];
      for (const bend of [1, -1] as const) {
        const r = solveTwoBone(root, target, 34, 33, bend);
        expect(len(root, r.mid)).toBeCloseTo(34, 6);
        expect(len(r.mid, r.end)).toBeCloseTo(33, 6);
      }
    }
  });
  it('reaches a reachable target exactly', () => {
    const r = solveTwoBone([0, 0], [30, 40], 34, 33, -1);
    expect(r.reached).toBe(true);
    expect(r.end[0]).toBeCloseTo(30);
    expect(r.end[1]).toBeCloseTo(40);
  });
  it('bend picks the side of the knee', () => {
    const forward = solveTwoBone([0, 0], [0, 50], 34, 33, -1);
    const back = solveTwoBone([0, 0], [0, 50], 34, 33, 1);
    expect(forward.mid[0]).toBeGreaterThan(0);
    expect(back.mid[0]).toBeLessThan(0);
  });
  it('clamps a too-far target to full extension along the same direction', () => {
    const r = solveTwoBone([0, 0], [0, 200], 34, 33, -1);
    expect(r.reached).toBe(false);
    expect(r.end[0]).toBeCloseTo(0);
    expect(r.end[1]).toBeCloseTo(67);
    expect(r.mid[1]).toBeCloseTo(34);
  });
  it('clamps a too-near target to the folded position', () => {
    const r = solveTwoBone([0, 0], [0, 0.2], 34, 30, -1);
    expect(r.reached).toBe(false);
    expect(len([0, 0], r.end)).toBeCloseTo(4);
    expect(len([0, 0], r.mid)).toBeCloseTo(34);
    expect(len(r.mid, r.end)).toBeCloseTo(30);
  });
  it('survives a zero-length reach', () => {
    const r = solveTwoBone([5, 5], [5, 5], 25, 25, 1);
    for (const v of [...r.mid, ...r.end]) expect(Number.isFinite(v)).toBe(true);
    expect(len([5, 5], r.mid)).toBeCloseTo(25);
    expect(len(r.mid, r.end)).toBeCloseTo(25);
  });
});

describe('fromAngle', () => {
  it('measures clockwise from straight up', () => {
    expect(fromAngle([10, 10], 5, 0)).toEqual([10, 5]);
    const right = fromAngle([10, 10], 5, Math.PI / 2);
    expect(right[0]).toBeCloseTo(15);
    expect(right[1]).toBeCloseTo(10);
  });
});

/** A valid standing pose: segment lengths are fixed, nothing touches anything. */
const standing: Pose = {
  head: [100, 40],
  neck: [100, 55],
  hip: [100, 95],
  eR: [100, 75],
  hR: [100, 95],
  eL: [100, 75],
  hL: [100, 95],
  kR: [100, 125],
  aR: [100, 155],
  tR: [110, 155],
  kL: [100, 125],
  aL: [100, 155],
  tL: [110, 155],
};
const options: GateOptions = {
  floorY: 178,
  viewBox: [0, 0, 200, 188],
  props: [
    { type: 'step', x: 150, y: 160, w: 30 },
    { type: 'wall', x: 20 },
    { type: 'bench', x: 30, y: 140, w: 20 },
    { type: 'mat', x1: 0, x2: 10 },
  ],
  minHeadClearance: 20,
};
const moved = (pose: Pose, patch: Partial<Pose>): Pose => ({
  ...pose,
  ...patch,
});
const types = (list: Pose[], opts = options) =>
  checkPoseGeometry(list, opts).map((v) => v.type);

describe('checkPoseGeometry', () => {
  it('passes a clean loop', () => {
    expect(checkPoseGeometry([standing, standing, standing], options)).toEqual(
      [],
    );
  });
  it('passes an empty list', () => {
    expect(checkPoseGeometry([], options)).toEqual([]);
  });
  it('detects joints below the floor', () => {
    const bad = moved(standing, { tL: [110, 181] });
    expect(types([standing, bad, standing])).toContain('below-floor');
  });
  it('detects joints outside the viewBox on each edge', () => {
    for (const hand of [
      [-1, 95],
      [201, 95],
      [100, -1],
      [100, 189],
    ] as Pt[]) {
      const found = types([standing, moved(standing, { hR: hand }), standing]);
      expect(found).toContain('outside-viewbox');
    }
  });
  it('detects feet inside the step, but not feet resting on it', () => {
    const inside = moved(standing, { aR: [160, 170], tR: [170, 170] });
    expect(types([standing, inside, standing])).toContain('foot-in-prop');
    const resting = moved(standing, { aR: [160, 157], tR: [170, 160] });
    expect(types([resting])).not.toContain('foot-in-prop');
  });
  it('detects feet inside a bench', () => {
    const inside = moved(standing, { aL: [40, 142], tL: [45, 142] });
    expect(types([inside])).toContain('foot-in-prop');
  });
  it('detects a head too close to the floor', () => {
    expect(types([moved(standing, { head: [100, 170] })])).toContain(
      'head-clearance',
    );
  });
  it('detects a head too close to a prop', () => {
    expect(types([moved(standing, { head: [25, 40] })])).toContain(
      'head-clearance',
    );
    expect(types([moved(standing, { head: [100, 40] })])).not.toContain(
      'head-clearance',
    );
  });
  it('detects a segment that changes length over time', () => {
    const longer = moved(standing, { kR: [100, 131] });
    const found = checkPoseGeometry([standing, longer, standing], options);
    expect(found.some((v) => v.type === 'segment-drift')).toBe(true);
  });
  it('allows small length changes within the tolerance', () => {
    const near = moved(standing, { kR: [100, 125.2], kL: [100, 125.2] });
    expect(types([standing, near, standing])).not.toContain('segment-drift');
  });
  it('detects near and far limbs of unequal length', () => {
    const odd = moved(standing, {
      kL: [100, 135],
      aL: [100, 165],
      tL: [110, 165],
    });
    expect(types([odd, odd])).toContain('limb-asymmetry');
  });
  it('detects a last frame that differs from the first', () => {
    const found = checkPoseGeometry(
      [standing, moved(standing, { hip: [101, 95] })],
      options,
    );
    expect(found.some((v) => v.type === 'loop-mismatch')).toBe(true);
  });
  it('reports the frame index of per-frame violations', () => {
    const bad = moved(standing, { tL: [110, 181] });
    const found = checkPoseGeometry([standing, bad, standing], options);
    expect(found.find((v) => v.type === 'below-floor')?.frame).toBe(1);
  });
  it('respects custom tolerances', () => {
    const longer = moved(standing, { kR: [100, 131] });
    const found = checkPoseGeometry([standing, longer, standing], {
      ...options,
      lengthTolerance: 20,
      contactTolerance: 50,
    });
    expect(found.some((v) => v.type === 'segment-drift')).toBe(false);
  });
});
