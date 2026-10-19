import { describe, expect, it } from 'vitest';
import {
  CYCLE_MS,
  cycleProgress,
  easeInOut,
  HOLD_MS,
  lerp,
  lerpPt,
  TWEEN_MS,
} from './lerp';

describe('lerp', () => {
  it('interpolates numbers and points', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerpPt([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });
  it('eases symmetrically with fixed ends', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe('cycleProgress', () => {
  it('holds at start, tweens, holds at end, tweens back', () => {
    expect(cycleProgress(0)).toBe(0);
    expect(cycleProgress(HOLD_MS - 1)).toBe(0);
    expect(cycleProgress(HOLD_MS + TWEEN_MS / 2)).toBeCloseTo(0.5);
    expect(cycleProgress(HOLD_MS + TWEEN_MS + 10)).toBe(1);
    expect(cycleProgress(2 * HOLD_MS + TWEEN_MS + TWEEN_MS / 2)).toBeCloseTo(
      0.5,
    );
    expect(cycleProgress(CYCLE_MS - 1)).toBeLessThan(0.01);
  });
  it('loops and tolerates negative time', () => {
    expect(cycleProgress(CYCLE_MS + 5)).toBe(0);
    expect(cycleProgress(-1)).toBeGreaterThanOrEqual(0);
  });
});
