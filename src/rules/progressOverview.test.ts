import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../domain/types';
import {
  exerciseResults,
  progressExerciseIds,
  weeklyProgress,
} from './progressOverview';

const session = (
  id: string,
  date: string,
  status: Session['status'] = 'completed',
  programId?: Session['programId'],
): Session => ({
  id,
  templateId: 'A',
  date,
  startedAt: `${date}T12:00:00Z`,
  status,
  programId,
  programWeek: 1,
  plan: [
    {
      exerciseId: 'supported-row',
      sets: 2,
      target: 8,
      loadIndex: 0,
      weightKg: 10,
      restSec: 30,
      reason: 'first_time',
    },
  ],
  feedback: {},
});
const log = (
  id: string,
  sessionId: string,
  variantId: string,
  side: SetLog['side'],
  amount: number,
): SetLog => ({
  id,
  sessionId,
  exerciseId: 'supported-row',
  setNumber: 1,
  side,
  amount,
  loadIndex: 0,
  weightKg: 10,
  variantId,
  loggedAt: `${sessionId}T12:30:00Z`,
});

describe('progress overview aggregation', () => {
  it('creates Monday-first 4 and 12 week ranges with zero weeks and separates incomplete sessions', () => {
    const rows = weeklyProgress(
      [
        session('a', '2026-10-19', 'completed', 'general'),
        session('b', '2026-10-21', 'aborted', 'rehab'),
        session('c', '2026-10-19', 'completed', 'running'),
        session('future', '2026-10-23', 'completed', 'rehab'),
        session('outside', '2026-09-01'),
      ],
      '2026-10-21',
      4,
    );
    expect(rows.map((row) => row.start)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ]);
    expect(rows[0]?.completed).toBe(0);
    expect(rows[3]).toMatchObject({
      completed: 2,
      incomplete: 1,
      byProgramme: { general: 1, running: 1, rehab: 0, legacy: 0 },
    });
    expect(weeklyProgress([], '2026-10-21', 12)).toHaveLength(12);
  });

  it('keeps logged variants and sides in separate chronological result groups', () => {
    const sessions = [session('s1', '2026-10-19'), session('s2', '2026-10-20')];
    const logs = [
      log('1', 's1', 'dumbbell', 'right', 8),
      log('2', 's1', 'dumbbell', 'right', 10),
      log('3', 's1', 'kettlebell', 'right', 8),
      log('4', 's2', 'dumbbell', 'left', 9),
      log('5', 'missing-session', 'dumbbell', 'right', 50),
    ];
    const results = exerciseResults('supported-row', sessions, logs);
    expect(
      results.map(({ session: s, variant, side, logs: setLogs }) => [
        s.id,
        variant,
        side,
        setLogs.map((item) => item.amount),
      ]),
    ).toEqual([
      ['s1', 'dumbbell', 'right', [8, 10]],
      ['s1', 'kettlebell', 'right', [8]],
      ['s2', 'dumbbell', 'left', [9]],
    ]);
    expect(progressExerciseIds(sessions, logs)).toEqual(['supported-row']);
  });
});
