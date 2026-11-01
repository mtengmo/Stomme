import { describe, expect, it } from 'vitest';
import { checkPoseGeometry } from './keyframes';
import { figures, POSE_KEYS, type Pose, type Prop } from './poses';
import {
  STEP_UP_KEYFRAMES,
  STEP_UP_PROPS,
  stepUpPose,
} from './stepUpKeyframes';

const MIRROR_X = 192;
const mirrorPose = (p: Pose): Pose => {
  const out = { ...p };
  for (const k of POSE_KEYS) out[k] = [MIRROR_X - p[k][0], p[k][1]];
  return out;
};
const mirrorStep = (p: Prop): Prop =>
  p.type === 'step' ? { ...p, x: MIRROR_X - p.x - p.w } : p;
const frames = (n: number) =>
  Array.from({ length: n + 1 }, (_, i) => stepUpPose(i / n));
/** A controlled rep ends where it peaks: the loop is not closed on purpose. */
const openLoop = Object.fromEntries(
  POSE_KEYS.map((k) => [`loop-mismatch:${k}`, 'controlled motion']),
);
const gate = (list: Pose[], props: readonly Prop[]) =>
  checkPoseGeometry(list, {
    floorY: 178,
    viewBox: [14, 20, 164, 168],
    props,
    minHeadClearance: 9,
    allowlist: openLoop,
  });

describe('E02 step-up keyframes', () => {
  it('uses named keyframes from t = 0 to t = 1', () => {
    expect(STEP_UP_KEYFRAMES[0]?.t).toBe(0);
    expect(STEP_UP_KEYFRAMES.at(-1)?.t).toBe(1);
    expect(STEP_UP_KEYFRAMES.every((k) => k.name)).toBe(true);
  });
  it('passes the geometry gate on both sides over 200 frames', () => {
    expect(gate(frames(200), STEP_UP_PROPS)).toEqual([]);
    expect(
      gate(frames(200).map(mirrorPose), STEP_UP_PROPS.map(mirrorStep)),
    ).toEqual([]);
  });
  it('keeps the planted foot flat on the step', () => {
    const first = stepUpPose(0);
    for (const f of frames(100)) {
      expect(f.aR).toEqual(first.aR);
      expect(f.tR[1]).toBeCloseTo(159, 0);
    }
  });
  it('starts with the free foot on the floor and ends it up on the step', () => {
    const start = stepUpPose(0);
    expect(start.tL[1]).toBeGreaterThan(176);
    expect(start.tL[1]).toBeLessThan(180);
    const end = stepUpPose(1);
    expect(end.aL[1]).toBeLessThan(156);
    expect(end.tL[1]).toBeLessThan(156);
  });
  it('uses a stair-like step and a knee bent 95-120 degrees at the start', () => {
    const step = STEP_UP_PROPS[0];
    expect(step?.type === 'step' && 178 - step.y).toBeGreaterThanOrEqual(15);
    expect(step?.type === 'step' && 178 - step.y).toBeLessThanOrEqual(22);
    const p = stepUpPose(0);
    const a = Math.atan2(p.hip[1] - p.kR[1], p.hip[0] - p.kR[0]);
    const b = Math.atan2(p.aR[1] - p.kR[1], p.aR[0] - p.kR[0]);
    let d = Math.abs(a - b);
    if (d > Math.PI) d = 2 * Math.PI - d;
    const deg = (d * 180) / Math.PI;
    expect(deg).toBeGreaterThanOrEqual(95);
    expect(deg).toBeLessThanOrEqual(120);
  });
  it('keeps the free toe out of the step corner while it is still low', () => {
    for (const f of frames(200))
      if (f.tL[1] > 153) expect(f.tL[0]).toBeLessThanOrEqual(105.5);
  });
  it('is the catalogue figure', () => {
    expect(figures['step-up'].start).toEqual(stepUpPose(0));
    expect(figures['step-up'].end).toEqual(stepUpPose(1));
    expect(figures['step-up'].props).toEqual(STEP_UP_PROPS);
  });
});
