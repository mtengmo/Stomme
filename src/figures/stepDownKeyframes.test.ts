import { describe, expect, it } from 'vitest';
import { checkPoseGeometry } from './keyframes';
import { POSE_KEYS } from './poses';
import {
  mirrorProp,
  STEP_DOWN_KEYFRAMES,
  STEP_DOWN_PILOT_PROPS,
  stepDownFrames,
  stepDownGateOptions,
  stepDownKeyframePose,
  stepDownWorldPose,
} from './stepDownKeyframes';

describe('E96 step-down keyframes', () => {
  it('uses four to six named keyframes that start and end on the same pose', () => {
    expect(STEP_DOWN_KEYFRAMES.length).toBeGreaterThanOrEqual(4);
    expect(STEP_DOWN_KEYFRAMES.length).toBeLessThanOrEqual(6);
    expect(STEP_DOWN_KEYFRAMES.every((k) => k.name)).toBe(true);
    expect(STEP_DOWN_KEYFRAMES[0]?.values).toEqual(
      STEP_DOWN_KEYFRAMES.at(-1)?.values,
    );
  });
  it.each(['right', 'left'] as const)(
    'passes the geometry gate across the whole loop (%s)',
    (side) => {
      expect(
        checkPoseGeometry(stepDownFrames(side, 200), stepDownGateOptions(side)),
      ).toEqual([]);
    },
  );
  it('loops: t = 0 and t = 1 are the same pose', () => {
    expect(stepDownKeyframePose(0)).toEqual(stepDownKeyframePose(1));
  });
  it('lowers the free heel 5-8 cm below the step, never to the floor', () => {
    const top = stepDownKeyframePose(0);
    const low = stepDownKeyframePose(0.54);
    expect(low.hip[1]).toBeGreaterThan(top.hip[1] + 8);
    // Step top is y = 164 (about 19 cm): 5-8 cm is roughly 4-6 units below it.
    expect(low.aL[1]).toBeGreaterThan(165);
    expect(low.aL[1]).toBeLessThan(168);
    // Floor is y = 178; the lowest foot point keeps at least 6 units of air.
    for (let i = 0; i <= 100; i++) {
      const p = stepDownKeyframePose(i / 100);
      expect(178 - Math.max(p.aL[1], p.tL[1])).toBeGreaterThanOrEqual(6);
    }
    // The planted foot never leaves the step.
    expect(low.aR).toEqual(top.aR);
    expect(low.tR[1]).toBeCloseTo(164, 0);
  });
  it('keeps the far hand on the rail at the lowest point', () => {
    for (const t of [0.5, 0.54, 0.58])
      expect(Math.abs(stepDownKeyframePose(t).hL[1] - 106)).toBeLessThan(0.5);
  });
  it.each(['right', 'left'] as const)(
    'bends both elbows backwards with a consistent sign (%s)',
    (side) => {
      const sign = side === 'right' ? 1 : -1;
      let bent = 0;
      for (let i = 0; i <= 100; i++) {
        const p = stepDownWorldPose(i / 100, side);
        for (const [e, h] of [
          [p.eR, p.hR],
          [p.eL, p.hL],
        ] as const) {
          const dx = h[0] - p.neck[0];
          const dy = h[1] - p.neck[1];
          const cross = dx * (e[1] - p.neck[1]) - dy * (e[0] - p.neck[0]);
          expect(cross * sign).toBeGreaterThanOrEqual(-1e-6);
          if (cross * sign > 1) bent++;
        }
      }
      expect(bent).toBeGreaterThan(100);
    },
  );
  it('holds the lowest point between the two middle keyframes', () => {
    expect(stepDownKeyframePose(0.5)).toEqual(stepDownKeyframePose(0.58));
  });
  it('mirrors the left side around the centre of the 192 wide scene', () => {
    const right = stepDownWorldPose(0.3, 'right');
    const left = stepDownWorldPose(0.3, 'left');
    for (const key of POSE_KEYS) {
      expect(left[key][0]).toBeCloseTo(192 - right[key][0]);
      expect(left[key][1]).toBeCloseTo(right[key][1]);
    }
  });
  it('mirrors the step and rail, and leaves other props alone', () => {
    const [step, rail] = STEP_DOWN_PILOT_PROPS;
    expect(step && mirrorProp(step)).toEqual({
      type: 'step',
      x: 192 - 84 - 34,
      y: 164,
      w: 34,
    });
    expect(rail && mirrorProp(rail)).toEqual({
      type: 'rail',
      x1: 192 - 132,
      x2: 192 - 70,
      y: 106,
    });
    const mat = { type: 'mat', x1: 0, x2: 5 } as const;
    expect(mirrorProp(mat)).toBe(mat);
  });
  it('gate options mirror props only for the left side', () => {
    expect(stepDownGateOptions('right').props).toEqual(STEP_DOWN_PILOT_PROPS);
    expect(stepDownGateOptions('left').props).not.toEqual(
      STEP_DOWN_PILOT_PROPS,
    );
  });
  it('samples the requested number of frames, inclusive of both ends', () => {
    expect(stepDownFrames('right')).toHaveLength(61);
    expect(stepDownFrames('left', 4)).toHaveLength(5);
  });
});
