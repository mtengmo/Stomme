import { describe, expect, it } from 'vitest';
import type { Session } from '../domain/types';
import { addDays } from '../lib/dates';
import {
  completedTrainingDates,
  isWeeklySchedule,
  nextOccurrence,
  nextPlannedDate,
  readWeeklySchedule,
} from './weeklySchedule';

describe('weekly schedule validation', () => {
  it('accepts one to three unique ISO weekdays and a valid move', () => {
    expect(isWeeklySchedule({ days: [1] })).toBe(true);
    expect(isWeeklySchedule({ days: [1, 3, 6] })).toBe(true);
    expect(
      isWeeklySchedule({
        days: [2, 5],
        moved: { from: '2026-10-27', to: '2026-10-30' },
      }),
    ).toBe(true);
  });

  it('rejects malformed days and extra schedule keys', () => {
    for (const value of [
      null,
      undefined,
      1,
      [],
      {},
      { days: '1' },
      { days: [] },
      { days: [1, 2, 3, 4] },
      { days: [1, 1] },
      { days: [1.5] },
      { days: [0] },
      { days: [8] },
      { days: [1], extra: true },
    ]) {
      expect(isWeeklySchedule(value)).toBe(false);
    }
  });

  it('rejects malformed moves, impossible dates, and unselected source weekdays', () => {
    for (const moved of [
      null,
      '2026-10-30',
      [],
      {},
      { from: '2026-10-27', to: '2026-10-30', extra: true },
      { from: '2026-02-30', to: '2026-03-02' },
      { from: '2026-10-27', to: '2026-02-30' },
      { from: '2026-10-27', to: '2026-10-27' },
      { from: '2026-10-28', to: '2026-10-30' },
    ]) {
      expect(isWeeklySchedule({ days: [2, 5], moved })).toBe(false);
    }
  });

  it('copies valid data and treats invalid persisted values as absent', () => {
    const withMove = {
      days: [2, 5],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    };
    const copy = readWeeklySchedule(withMove);
    expect(copy).toEqual(withMove);
    expect(copy).not.toBe(withMove);
    expect(copy?.days).not.toBe(withMove.days);
    expect(copy?.moved).not.toBe(withMove.moved);
    expect(readWeeklySchedule({ days: [1, 1] })).toBeNull();
    expect(readWeeklySchedule({ days: [1] })).toEqual({ days: [1] });
  });
});

describe('weekly schedule dates', () => {
  it('finds today, rolls to next week, and returns null for invalid inputs', () => {
    expect(nextOccurrence('2026-10-26', 1)).toBe('2026-10-26');
    expect(nextOccurrence('2026-10-27', 1)).toBe('2026-11-02');
    expect(nextOccurrence('bad-date', 1)).toBeNull();
    expect(nextOccurrence('2026-10-27', 0)).toBeNull();
    expect(nextOccurrence('2026-10-27', 8)).toBeNull();
    expect(nextOccurrence('2026-10-27', 1.5)).toBeNull();
    expect(nextPlannedDate(null, '2026-10-27')).toBeNull();
    expect(nextPlannedDate({ days: [1] }, 'bad-date')).toBeNull();
    expect(nextPlannedDate({ days: [] } as never, '2026-10-27')).toBeNull();
  });

  it('skips a moved source date and independently considers its destination', () => {
    const schedule = {
      days: [2],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    };
    expect(nextPlannedDate(schedule, '2026-10-27')).toBe('2026-10-30');
    expect(nextPlannedDate(schedule, '2026-10-28')).toBe('2026-10-30');
    expect(nextPlannedDate(schedule, '2026-10-31')).toBe('2026-11-03');
  });

  it('supports moving earlier and crossing calendar weeks', () => {
    const earlier = {
      days: [2, 4],
      moved: { from: '2026-10-29', to: '2026-10-27' },
    };
    expect(nextPlannedDate(earlier, '2026-10-26')).toBe('2026-10-27');
    expect(nextPlannedDate(earlier, '2026-10-28')).toBe('2026-11-03');

    const acrossWeeks = {
      days: [2],
      moved: { from: '2026-11-03', to: '2026-11-06' },
    };
    expect(nextPlannedDate(acrossWeeks, '2026-10-31')).toBe('2026-11-06');
  });

  it('ignores past moves, removes their source, and skips completed standard dates', () => {
    expect(
      nextPlannedDate(
        { days: [2], moved: { from: '2026-10-27', to: '2026-10-26' } },
        '2026-10-27',
      ),
    ).toBe('2026-11-03');
    expect(
      nextPlannedDate(
        { days: [2], moved: { from: '2026-10-20', to: '2026-10-22' } },
        '2026-10-28',
      ),
    ).toBe('2026-11-03');
    expect(
      nextPlannedDate({ days: [2, 4] }, '2026-10-27', ['2026-10-27']),
    ).toBe('2026-10-29');
  });

  it('returns null when every candidate in the search window is complete', () => {
    const completed = Array.from({ length: 366 }, (_, index) =>
      addDays('2026-01-01', index),
    );
    expect(nextPlannedDate({ days: [1] }, '2026-01-01', completed)).toBeNull();
  });
});

describe('completed custom workouts in the weekly plan', () => {
  const session = (extra: Partial<Session>): Session =>
    ({
      id: 'x',
      templateId: 'A',
      date: '2026-10-26',
      startedAt: '2026-10-26T08:00:00Z',
      status: 'completed',
      programId: 'general',
      programWeek: 1,
      ...extra,
    }) as Session;

  it('counts a completed custom workout as that day, not a short one or another programme', () => {
    expect(
      completedTrainingDates(
        [
          session({ customWorkoutId: 'c1', date: '2026-10-26' }),
          session({ workoutMode: 'short', date: '2026-10-27' }),
          session({ programId: 'rehab', date: '2026-10-28' }),
          session({ status: 'aborted', date: '2026-10-29' }),
        ],
        'general',
      ),
    ).toEqual(['2026-10-26']);
  });

  it('moves the planned date past the day of a custom workout', () => {
    const schedule = { days: [1, 3] }; // 2026-10-26 is a Monday
    expect(nextPlannedDate(schedule, '2026-10-26', [])).toBe('2026-10-26');
    expect(
      nextPlannedDate(
        schedule,
        '2026-10-26',
        completedTrainingDates(
          [session({ customWorkoutId: 'c1', date: '2026-10-26' })],
          'general',
        ),
      ),
    ).toBe('2026-10-28');
  });
});
