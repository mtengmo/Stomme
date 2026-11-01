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
  it('lowers the hip, taps the floor with the free heel, and returns', () => {
    const top = stepDownKeyframePose(0);
    const tap = stepDownKeyframePose(0.54);
    expect(tap.hip[1]).toBeGreaterThan(top.hip[1] + 10);
    expect(tap.aL[1]).toBeGreaterThan(170);
    expect(tap.aL[1]).toBeLessThanOrEqual(176);
    // The planted foot never leaves the step.
    expect(tap.aR).toEqual(top.aR);
    expect(tap.tR[1]).toBeCloseTo(164, 0);
  });
  it('holds the tap between the two middle keyframes', () => {
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
  it('mirrors the step and wall, and leaves other props alone', () => {
    const [step, wall] = STEP_DOWN_PILOT_PROPS;
    expect(step && mirrorProp(step)).toEqual({
      type: 'step',
      x: 192 - 84 - 34,
      y: 164,
      w: 34,
    });
    expect(wall && mirrorProp(wall)).toEqual({ type: 'wall', x: 192 - 62 });
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
