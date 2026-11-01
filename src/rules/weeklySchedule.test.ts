import { describe, expect, it } from 'vitest';
import type { Session } from '../domain/types';
import { addDays } from '../lib/dates';
import {
  completedTrainingDates,
  isWeeklyDayPlan,
  isWeeklySchedule,
  nextOccurrence,
  nextPlannedDate,
  planForDate,
  readWeeklySchedule,
} from './weeklySchedule';

describe('weekly schedule validation', () => {
  it('accepts one to five unique ISO weekdays and a valid move', () => {
    for (const count of [4, 5])
      expect(
        isWeeklySchedule({
          days: Array.from({ length: count }, (_, index) => ({
            day: index + 1,
            plan: { kind: 'standard' },
          })),
        }),
      ).toBe(true);
    expect(
      isWeeklySchedule({
        days: [{ day: 1, plan: { kind: 'standard' as const } }],
      }),
    ).toBe(true);
    expect(
      isWeeklySchedule({
        days: [
          { day: 1, plan: { kind: 'standard' as const } },
          { day: 3, plan: { kind: 'standard' as const } },
          { day: 6, plan: { kind: 'standard' as const } },
        ],
      }),
    ).toBe(true);
    expect(
      isWeeklySchedule({
        days: [
          { day: 2, plan: { kind: 'standard' as const } },
          { day: 5, plan: { kind: 'standard' as const } },
        ],
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
      {
        days: Array.from({ length: 6 }, (_, index) => ({
          day: index + 1,
          plan: { kind: 'standard' },
        })),
      },
      {
        days: [
          { day: 1, plan: { kind: 'standard' as const } },
          { day: 1, plan: { kind: 'standard' as const } },
        ],
      },
      { days: [1.5] },
      { days: [{ day: 0, plan: { kind: 'standard' as const } }] },
      { days: [{ day: 8, plan: { kind: 'standard' as const } }] },
      { days: [{ day: 1, plan: { kind: 'standard' as const } }], extra: true },
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
      expect(
        isWeeklySchedule({
          days: [
            { day: 2, plan: { kind: 'standard' as const } },
            { day: 5, plan: { kind: 'standard' as const } },
          ],
          moved,
        }),
      ).toBe(false);
    }
  });

  it('copies valid data and treats invalid persisted values as absent', () => {
    const withMove = {
      days: [
        { day: 2, plan: { kind: 'standard' as const } },
        { day: 5, plan: { kind: 'standard' as const } },
      ],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    };
    const copy = readWeeklySchedule(withMove);
    expect(copy).toEqual(withMove);
    expect(copy).not.toBe(withMove);
    expect(copy?.days).not.toBe(withMove.days);
    expect(copy?.moved).not.toBe(withMove.moved);
    expect(
      readWeeklySchedule({
        days: [
          { day: 1, plan: { kind: 'standard' as const } },
          { day: 1, plan: { kind: 'standard' as const } },
        ],
      }),
    ).toBeNull();
    expect(
      readWeeklySchedule({
        days: [{ day: 1, plan: { kind: 'standard' as const } }],
      }),
    ).toEqual({ days: [{ day: 1, plan: { kind: 'standard' as const } }] });
  });
});

describe('weekly assignments', () => {
  it('validates every plan kind and refuses daily custom focus or unknown fields', () => {
    for (const plan of [
      null,
      [],
      3,
      {},
      { kind: 'bad' },
      { kind: 'standard', extra: true },
      { kind: 'focus', focus: 'custom' },
      { kind: 'focus', focus: 'push', extra: true },
      { kind: 'workout', workoutId: '' },
      { kind: 'workout', workoutId: 4 },
      { kind: 'workout', workoutId: 'a'.repeat(101) },
      { kind: 'workout' },
    ])
      expect(isWeeklyDayPlan(plan)).toBe(false);
    for (const plan of [
      { kind: 'standard' },
      { kind: 'focus', focus: 'push' },
      { kind: 'workout', workoutId: 'one' },
    ])
      expect(isWeeklyDayPlan(plan)).toBe(true);
    for (const item of [
      null,
      [],
      1,
      { day: 1 },
      { day: 1, plan: { kind: 'bad' } },
      { day: 1, plan: { kind: 'standard' }, extra: 1 },
    ])
      expect(isWeeklySchedule({ days: [item] })).toBe(false);
  });
  it('resolves moved assignment, absent days, and a missing saved workout conservatively', () => {
    const schedule = {
      days: [{ day: 2, plan: { kind: 'workout' as const, workoutId: 'one' } }],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    };
    expect(planForDate(schedule, '2026-10-27')).toBeNull();
    expect(planForDate(schedule, '2026-10-30')).toEqual({
      kind: 'workout',
      workoutId: 'one',
    });
    expect(planForDate(schedule, '2026-10-30', [])).toEqual({
      kind: 'standard',
    });
    expect(planForDate(schedule, '2026-10-30', ['one'])).toEqual({
      kind: 'workout',
      workoutId: 'one',
    });
    expect(planForDate(schedule, '2026-10-28')).toBeNull();
    expect(planForDate(schedule, '2026-11-03')).toEqual({
      kind: 'workout',
      workoutId: 'one',
    });
    expect(planForDate(schedule, 'invalid')).toBeNull();
    expect(planForDate(null, '2026-10-30')).toBeNull();
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
    expect(
      nextPlannedDate(
        { days: [{ day: 1, plan: { kind: 'standard' as const } }] },
        'bad-date',
      ),
    ).toBeNull();
    expect(nextPlannedDate({ days: [] } as never, '2026-10-27')).toBeNull();
  });

  it('skips a moved source date and independently considers its destination', () => {
    const schedule = {
      days: [{ day: 2, plan: { kind: 'standard' as const } }],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    };
    expect(nextPlannedDate(schedule, '2026-10-27')).toBe('2026-10-30');
    expect(nextPlannedDate(schedule, '2026-10-28')).toBe('2026-10-30');
    expect(nextPlannedDate(schedule, '2026-10-31')).toBe('2026-11-03');
  });

  it('supports moving earlier and crossing calendar weeks', () => {
    const earlier = {
      days: [
        { day: 2, plan: { kind: 'standard' as const } },
        { day: 4, plan: { kind: 'standard' as const } },
      ],
      moved: { from: '2026-10-29', to: '2026-10-27' },
    };
    expect(nextPlannedDate(earlier, '2026-10-26')).toBe('2026-10-27');
    expect(nextPlannedDate(earlier, '2026-10-28')).toBe('2026-11-03');

    const acrossWeeks = {
      days: [{ day: 2, plan: { kind: 'standard' as const } }],
      moved: { from: '2026-11-03', to: '2026-11-06' },
    };
    expect(nextPlannedDate(acrossWeeks, '2026-10-31')).toBe('2026-11-06');
  });

  it('ignores past moves, removes their source, and skips completed standard dates', () => {
    expect(
      nextPlannedDate(
        {
          days: [{ day: 2, plan: { kind: 'standard' as const } }],
          moved: { from: '2026-10-27', to: '2026-10-26' },
        },
        '2026-10-27',
      ),
    ).toBe('2026-11-03');
    expect(
      nextPlannedDate(
        {
          days: [{ day: 2, plan: { kind: 'standard' as const } }],
          moved: { from: '2026-10-20', to: '2026-10-22' },
        },
        '2026-10-28',
      ),
    ).toBe('2026-11-03');
    expect(
      nextPlannedDate(
        {
          days: [
            { day: 2, plan: { kind: 'standard' as const } },
            { day: 4, plan: { kind: 'standard' as const } },
          ],
        },
        '2026-10-27',
        ['2026-10-27'],
      ),
    ).toBe('2026-10-29');
  });

  it('returns null when every candidate in the search window is complete', () => {
    const completed = Array.from({ length: 366 }, (_, index) =>
      addDays('2026-01-01', index),
    );
    expect(
      nextPlannedDate(
        { days: [{ day: 1, plan: { kind: 'standard' as const } }] },
        '2026-01-01',
        completed,
      ),
    ).toBeNull();
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
    const schedule = {
      days: [
        { day: 1, plan: { kind: 'standard' as const } },
        { day: 3, plan: { kind: 'standard' as const } },
      ],
    }; // 2026-10-26 is a Monday
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
