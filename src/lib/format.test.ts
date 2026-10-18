import { describe, expect, it } from 'vitest';
import { formatClock, formatMinutes } from './format';

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(1500)).toBe('25:00');
  });
  it('adds hours past 60 minutes and clamps negatives', () => {
    expect(formatClock(3729)).toBe('1:02:09');
    expect(formatClock(-4)).toBe('0:00');
  });
});

describe('formatMinutes', () => {
  it('rounds and shows at least one minute', () => {
    expect(formatMinutes(10)).toBe('1 min');
    expect(formatMinutes(1680)).toBe('28 min');
  });
});
