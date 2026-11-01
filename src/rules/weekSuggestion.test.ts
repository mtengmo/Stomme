import { describe, expect, it } from 'vitest';
import type { ExerciseId, WeeklySchedule } from '../domain/types';
import { musclesForPlan, suggestWeek, weekConflicts } from './weekSuggestion';

const now = new Date('2026-11-02T12:00:00'); // Monday, explicit local anchor
const workout = (
  id: string,
  exerciseIds: ExerciseId[],
  group?: 'push' | 'pull' | 'legs' | 'upper' | 'full' | 'other',
) => ({ id, exerciseIds, group });
const options = { workouts: [], daysPerWeek: 3 as const, recent: {}, now };
describe('weekly suggestions', () => {
  it('uses deterministic templates, fills shortages with complete presets, and never mutates input', () => {
    for (const [count, days] of [
      [2, [1, 4]],
      [3, [1, 3, 5]],
      [4, [1, 2, 4, 5]],
      [5, [1, 2, 3, 5, 6]],
    ] as const) {
      const result = suggestWeek({ ...options, daysPerWeek: count });
      expect(result.schedule.days.map((d) => d.day)).toEqual(days);
      expect(result.schedule.days.every((d) => d.plan.kind === 'focus')).toBe(
        true,
      );
      expect(weekConflicts(result.schedule, [])).toEqual([]);
      expect(result).toEqual(suggestWeek({ ...options, daysPerWeek: count }));
    }
    expect(options.workouts).toEqual([]);
  });
  it('honors valid selected days, adds missing template days, and handles Sunday to Monday', () => {
    const result = suggestWeek({ ...options, preferredDays: [7, 1, 2] });
    expect(result.schedule.days.map((d) => d.day)).toEqual([1, 2, 7]);
    expect(weekConflicts(result.schedule, [])).toEqual([]);
    expect(
      suggestWeek({
        ...options,
        preferredDays: [6, 6, 0, 8, 1.5],
      }).schedule.days.map((d) => d.day),
    ).toEqual([1, 3, 6]);
  });
  it('uses actual muscles regardless of a manual group, keeps full-body separated and treats core-only as empty', () => {
    const workouts = [
      workout('full', ['push-up', 'glute-bridge'], 'push'),
      workout('pull', ['back-extension']),
      workout('core', ['dead-bug']),
    ];
    const result = suggestWeek({
      ...options,
      workouts,
      preferredDays: [1, 2, 7],
    });
    expect(weekConflicts(result.schedule, workouts)).toEqual([]);
    expect(
      musclesForPlan({ kind: 'workout', workoutId: 'full' }, workouts),
    ).toContain('glutes');
    expect(
      musclesForPlan({ kind: 'workout', workoutId: 'core' }, workouts),
    ).toEqual([]);
    expect(
      musclesForPlan({ kind: 'workout', workoutId: 'missing' }, workouts),
    ).toEqual([]);
    expect(musclesForPlan({ kind: 'standard' }, workouts)).toEqual([]);
    const fullResult = suggestWeek({
      ...options,
      daysPerWeek: 2,
      workouts: [workouts[0] as (typeof workouts)[number]],
    });
    expect(fullResult.schedule.days[0]?.plan).toEqual({
      kind: 'workout',
      workoutId: 'full',
    });
  });
  it('moves a first day with recent overlap without losing unique day count or creating calendar-day conflicts', () => {
    const recent = { chest: now.getTime() - 3_600_000 };
    const result = suggestWeek({ ...options, daysPerWeek: 2, recent });
    expect(result.notes.join(' ')).toContain('flyttades');
    expect(new Set(result.schedule.days.map((d) => d.day)).size).toBe(2);
    expect(result.schedule.days.some((d) => d.day === 1)).toBe(false);
    expect(weekConflicts(result.schedule, [])).toEqual([]);
    const expired = suggestWeek({
      ...options,
      recent: { chest: now.getTime() - 49 * 3_600_000 },
    });
    expect(expired.schedule.days[0]?.day).toBe(1);
  });
  it('returns advisory unknown standard assignments if the search budget is exhausted', () => {
    const result = suggestWeek({ ...options, searchLimit: 0 });
    expect(result.schedule.days.every((d) => d.plan.kind === 'standard')).toBe(
      true,
    );
    expect(result.notes.join(' ')).toContain('Kontrollera muskelvilan');
    expect(
      suggestWeek({ ...options, searchLimit: 1 }).notes.join(' '),
    ).toContain('Kontrollera muskelvilan');
  });

  it('prefers the only saved full workout when both sides have rest days', () => {
    const workouts = [workout('full', ['push-up', 'glute-bridge'])];
    const result = suggestWeek({ ...options, workouts, daysPerWeek: 2 });
    expect(result.schedule.days.map((d) => d.plan)).toEqual([
      { kind: 'workout', workoutId: 'full' },
      { kind: 'workout', workoutId: 'full' },
    ]);
  });
  it('rechecks the new first date after a recovery shift', () => {
    const result = suggestWeek({
      ...options,
      preferredDays: [1, 2, 5],
      recent: { chest: now.getTime(), back: now.getTime() },
    });
    const earliestDay = [...result.schedule.days].sort(
      (a, b) => a.day - b.day,
    )[0];
    expect(earliestDay?.day).toBeGreaterThanOrEqual(3);
    expect(new Set(result.schedule.days.map((d) => d.day)).size).toBe(3);
    expect(weekConflicts(result.schedule, [])).toEqual([]);
  });
  it('advises on manual overlapping adjacent days including wrap, but allows intervening rest', () => {
    const schedule: WeeklySchedule = {
      days: [
        { day: 1, plan: { kind: 'focus', focus: 'push' } },
        { day: 2, plan: { kind: 'focus', focus: 'upper' } },
        { day: 7, plan: { kind: 'focus', focus: 'push' } },
        { day: 4, plan: { kind: 'standard' } },
      ],
    };
    expect(weekConflicts(schedule, [])).toHaveLength(2);
    expect(
      weekConflicts(
        {
          days: [
            { day: 1, plan: { kind: 'standard' } },
            { day: 2, plan: { kind: 'focus', focus: 'push' } },
          ],
        },
        [],
      )[0],
    ).toContain('kontrollera');
  });
});
