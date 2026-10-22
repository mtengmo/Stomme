import { describe, expect, it } from 'vitest';
import type { ExerciseId, PainLog, Session, SetLog } from '../domain/types';
import {
  loadPerExercise,
  loggedExerciseIds,
  painSeries,
  weeklyVolume,
} from './stats';

function session(id: string, date: string): Session {
  return {
    id,
    templateId: 'A',
    date,
    startedAt: `${date}T10:00:00.000Z`,
    status: 'completed',
    programWeek: 1,
    plan: [],
    feedback: {},
  };
}

let n = 0;
function log(
  sessionId: string,
  exerciseId: ExerciseId,
  setNumber: number,
  over: Partial<SetLog> = {},
): SetLog {
  n += 1;
  return {
    id: `l${n}`,
    sessionId,
    exerciseId,
    setNumber,
    side: 'both',
    amount: 10,
    loadIndex: 0,
    weightKg: 10,
    loggedAt: `2026-10-12T10:${String(n % 60).padStart(2, '0')}:00.000Z`,
    ...over,
  };
}

describe('weeklyVolume', () => {
  it('is empty without data', () => {
    expect(weeklyVolume([], [])).toEqual([]);
  });

  it('zero-fills through today when asked, even without sessions', () => {
    const v = weeklyVolume([], [], { through: '2026-10-19', weeks: 3 });
    expect(v.map((w) => w.weekStart)).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ]);
    expect(v.every((w) => w.sets === 0 && w.tonnageKg === 0)).toBe(true);
  });

  it('groups by Monday and fills gaps', () => {
    const sessions = [session('a', '2026-10-04'), session('b', '2026-10-21')];
    const logs = [
      log('a', 'step-up', 1),
      log('b', 'step-up', 1),
      log('b', 'step-up', 2),
    ];
    const v = weeklyVolume(sessions, logs);
    expect(v.map((w) => [w.weekStart, w.sets])).toEqual([
      ['2026-09-28', 1],
      ['2026-10-05', 0],
      ['2026-10-12', 0],
      ['2026-10-19', 2],
    ]);
  });

  it('counts a per-side set once but both sides in tonnage', () => {
    const sessions = [session('a', '2026-10-12')];
    const logs = [
      log('a', 'step-up', 1, { side: 'right', amount: 10, weightKg: 10 }),
      log('a', 'step-up', 1, { side: 'left', amount: 10, weightKg: 10 }),
      log('a', 'step-up', 2, { side: 'right', amount: 8, weightKg: 10 }),
    ];
    const [w] = weeklyVolume(sessions, logs);
    expect(w?.sets).toBe(2);
    expect(w?.tonnageKg).toBe(280);
  });

  it('does not count time or distance as tonnage', () => {
    const sessions = [session('a', '2026-10-12')];
    const logs = [log('a', 'wall-sit', 1, { amount: 40, weightKg: 0 })];
    const [w] = weeklyVolume(sessions, logs);
    expect(w).toMatchObject({ sets: 1, tonnageKg: 0 });
  });

  it('separates the same set number in different sessions and exercises', () => {
    const sessions = [session('a', '2026-10-12'), session('b', '2026-10-13')];
    const logs = [
      log('a', 'step-up', 1),
      log('b', 'step-up', 1),
      log('b', 'dead-bug', 1),
    ];
    expect(weeklyVolume(sessions, logs)[0]?.sets).toBe(3);
  });

  it('ignores logs of unknown sessions', () => {
    const v = weeklyVolume(
      [session('a', '2026-10-12')],
      [log('x', 'step-up', 1)],
    );
    expect(v[0]?.sets).toBe(0);
  });

  it('returns the last N weeks, zero-filled before the first session', () => {
    const v = weeklyVolume(
      [session('a', '2026-10-13')],
      [log('a', 'step-up', 1)],
      { through: '2026-10-19', weeks: 12 },
    );
    expect(v).toHaveLength(12);
    expect(v[11]?.weekStart).toBe('2026-10-19');
    expect(v[10]).toMatchObject({ weekStart: '2026-10-12', sets: 1 });
    expect(v[0]?.sets).toBe(0);
  });
});

describe('loadPerExercise', () => {
  it('gives one point per session with max weight and amount, sorted by time', () => {
    const logs = [
      log('b', 'step-up', 1, {
        weightKg: 12,
        amount: 8,
        loggedAt: '2026-10-19T10:00:00.000Z',
      }),
      log('a', 'step-up', 1, {
        weightKg: 10,
        amount: 10,
        loggedAt: '2026-10-12T10:00:00.000Z',
      }),
      log('a', 'step-up', 2, {
        weightKg: 10,
        amount: 12,
        loggedAt: '2026-10-12T10:03:00.000Z',
      }),
      log('a', 'dead-bug', 1, {
        weightKg: 0,
        amount: 6,
        loggedAt: '2026-10-12T10:05:00.000Z',
      }),
    ];
    const pts = loadPerExercise(logs, 'step-up');
    expect(pts.map((p) => [p.sessionId, p.weightKg, p.amount])).toEqual([
      ['a', 10, 12],
      ['b', 12, 8],
    ]);
  });

  it('is empty for an unlogged exercise', () => {
    expect(loadPerExercise([log('a', 'step-up', 1)], 'bird-dog')).toEqual([]);
  });

  it('lists logged exercises in catalogue order', () => {
    const logs = [log('a', 'wall-sit', 1), log('a', 'step-up', 1)];
    expect(loggedExerciseIds(logs)).toEqual(['step-up', 'wall-sit']);
    expect(loggedExerciseIds([])).toEqual([]);
  });
});

describe('painSeries', () => {
  function pain(
    id: string,
    date: string,
    timing: PainLog['timing'],
    score: number,
    createdAt = `${date}T10:00:00.000Z`,
  ): PainLog {
    return {
      id,
      sessionId: 's',
      date,
      timing,
      score,
      location: 'right_knee',
      redFlags: { sharp: false, swelling: false, locking: false },
      createdAt,
    };
  }

  it('is empty per timing without data', () => {
    expect(painSeries([])).toEqual({ before: [], after: [], dayAfter: [] });
  });

  it('groups by timing and sorts by date', () => {
    const s = painSeries([
      pain('3', '2026-10-14', 'dayAfter', 3),
      pain('2', '2026-10-13', 'after', 2),
      pain('1', '2026-10-13', 'before', 1),
      pain('0', '2026-10-06', 'before', 0),
    ]);
    expect(s.before.map((p) => p.score)).toEqual([0, 1]);
    expect(s.after).toHaveLength(1);
    expect(s.dayAfter[0]?.date).toBe('2026-10-14');
  });
});

describe('loadPerExercise ordering', () => {
  it('keeps the earliest time of a session even when a later-listed log is older', () => {
    const pts = loadPerExercise(
      [
        log('a', 'step-up', 2, {
          loggedAt: '2026-10-12T10:03:00.000Z',
          weightKg: 10,
        }),
        log('a', 'step-up', 1, {
          loggedAt: '2026-10-11T10:00:00.000Z',
          weightKg: 8,
        }),
      ],
      'step-up',
    );
    expect(pts).toHaveLength(1);
    expect(pts[0]).toMatchObject({
      weightKg: 10,
      at: '2026-10-11T10:00:00.000Z',
      date: '2026-10-11',
    });
  });
});
