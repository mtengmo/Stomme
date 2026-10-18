import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatLongDate,
  formatShortDate,
  formatWeekday,
  toLocalDate,
  weekDates,
  weekdayIndex,
  weekStart,
} from './dates';

describe('toLocalDate', () => {
  it('uses local fields with zero padding', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDate(new Date(2026, 9, 25, 0, 10))).toBe('2026-10-25');
  });
});

describe('daysBetween / addDays', () => {
  it('counts whole days across the 2026-10-25 DST change', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-10-25', '2026-11-01')).toBe(7);
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('crosses the year boundary', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('is negative backwards and zero for same day', () => {
    expect(daysBetween('2026-10-20', '2026-10-18')).toBe(-2);
    expect(daysBetween('2026-10-18', '2026-10-18')).toBe(0);
  });

  it('rejects malformed input', () => {
    expect(() => daysBetween('2026-1-1', '2026-01-02')).toThrow();
  });
});

describe('Monday-first weeks', () => {
  it('2026-10-18 is a Sunday (index 6)', () => {
    expect(weekdayIndex('2026-10-18')).toBe(6);
    expect(weekdayIndex('2026-10-19')).toBe(0);
  });

  it('weekStart of a Sunday is six days earlier', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
  });

  it('weekDates spans DST change and year boundary', () => {
    expect(weekDates('2026-10-25')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    expect(weekDates('2027-01-01')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });
});

describe('sv-SE formatting', () => {
  it('formats weekday and dates in Swedish', () => {
    expect(formatWeekday('2026-10-18')).toBe('söndag');
    expect(formatLongDate('2026-10-18')).toBe('söndag 18 oktober');
    expect(formatShortDate('2026-10-18')).toMatch(/^18 okt/);
  });
});
