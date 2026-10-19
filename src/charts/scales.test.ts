import { describe, expect, it } from 'vitest';
import { bandScale, linearScale, niceTicks } from './scales';

describe('linearScale', () => {
  it('maps endpoints and midpoints', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(10)).toBe(0);
    expect(s(5)).toBe(50);
  });
  it('maps a flat domain to the middle', () => {
    expect(linearScale([3, 3], [0, 100])(3)).toBe(50);
  });
});

describe('bandScale', () => {
  it('splits the range into padded bands', () => {
    const b = bandScale(4, [0, 100], 0.2);
    expect(b.bandwidth).toBeCloseTo(20);
    expect(b(0)).toBeCloseTo(2.5);
    expect(b.center(1)).toBeCloseTo(37.5);
  });
  it('handles zero bands', () => {
    expect(bandScale(0, [0, 100]).bandwidth).toBe(0);
  });
});

describe('niceTicks', () => {
  it('rounds to friendly steps', () => {
    const t = niceTicks(0, 14, 5);
    expect(t.ticks).toEqual([0, 5, 10, 15]);
    expect(t.max).toBe(15);
  });
  it('covers 0-10 with step 2', () => {
    expect(niceTicks(0, 10, 6).ticks).toEqual([0, 2, 4, 6, 8, 10]);
  });
  it('handles a flat range', () => {
    expect(niceTicks(4, 4).ticks).toEqual([4, 5]);
  });
  it('handles fractions without float noise', () => {
    expect(niceTicks(0, 0.5, 6).ticks).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });
});
