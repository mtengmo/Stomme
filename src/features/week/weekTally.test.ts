import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../../domain/types';
import { weekTally } from './weekTally';

function snapshot(): Session {
  return {
    id: 'adapted',
    templateId: 'A',
    date: '2026-10-19',
    startedAt: '2026-10-19T10:00:00Z',
    status: 'in_progress',
    programWeek: 3,
    plan: [
      {
        exerciseId: 'split-squat',
        sets: 3,
        target: 8,
        loadIndex: 0,
        weightKg: 0,
        restSec: 60,
        reason: 'first_time',
      },
      {
        exerciseId: 'wall-sit',
        sets: 2,
        target: 30,
        loadIndex: 0,
        weightKg: 0,
        restSec: 60,
        reason: 'first_time',
      },
    ],
    feedback: {},
  };
}

function log(exerciseId: SetLog['exerciseId'], side: SetLog['side']): SetLog {
  return {
    id: `${exerciseId}-${side}`,
    sessionId: 'adapted',
    exerciseId,
    setNumber: 1,
    side,
    amount: 8,
    loadIndex: 0,
    weightKg: 0,
    loggedAt: '2026-10-19T10:01:00Z',
  };
}

describe('week tally snapshots', () => {
  it('uses the adapted roster, prescribed sets and optional exercise', () => {
    const session = snapshot();
    const partial = weekTally('A', session, [log('split-squat', 'right')]);
    expect(partial.total).toBe(5);
    expect(partial.done).toBe(0);
    expect(partial.items.map((item) => item.id)).toEqual([
      'split-squat',
      'wall-sit',
    ]);
    const logs = [
      log('split-squat', 'right'),
      log('split-squat', 'left'),
      log('wall-sit', 'both'),
      log('goblet-chair-squat', 'both'),
      { ...log('wall-sit', 'both'), sessionId: 'other-session' },
    ];
    expect(weekTally('A', session, logs).done).toBe(2);
    session.status = 'completed';
    expect(weekTally('A', session, logs).items).toEqual([
      { id: 'split-squat', remaining: 2 },
      { id: 'wall-sit', remaining: 1 },
    ]);
  });

  it('retains skipped markers and excludes skipped sets as the runner does', () => {
    const session = snapshot();
    session.feedback['wall-sit'] = { skipped: true };
    const tally = weekTally('A', session, [log('wall-sit', 'both')]);
    expect(tally.total).toBe(3);
    expect(tally.done).toBe(0);
    expect(tally.items[1]).toEqual({
      id: 'wall-sit',
      remaining: 0,
      skipped: true,
    });
  });
});
