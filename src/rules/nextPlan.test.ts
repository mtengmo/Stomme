import { describe, expect, it } from 'vitest';
import { templates } from '../content/templates';
import type { PlannedExercise, Session, SetLog } from '../domain/types';
import { buildPlan, type PlanningData } from './nextPlan';

const none = { sharp: false, swelling: false, locking: false };

function planOf(
  id: PlannedExercise['exerciseId'],
  loadIndex: number,
): PlannedExercise {
  return {
    exerciseId: id,
    sets: 2,
    target: 10,
    loadIndex,
    weightKg: 0,
    restSec: 60,
    reason: 'first_time',
  };
}

function session(
  over: Partial<Session> & Pick<Session, 'id' | 'date'>,
): Session {
  return {
    templateId: 'A',
    startedAt: `${over.date}T08:00:00.000Z`,
    status: 'completed',
    programWeek: 1,
    plan: [planOf('goblet-chair-squat', 0)],
    feedback: {},
    ...over,
  };
}

function logs(sessionId: string, amount: number, loadIndex: number): SetLog[] {
  return [1, 2].map((n) => ({
    id: `${sessionId}-${n}`,
    sessionId,
    exerciseId: 'goblet-chair-squat',
    setNumber: n,
    side: 'both',
    amount,
    loadIndex,
    weightKg: 0,
    loggedAt: `2026-10-12T08:0${n}:00.000Z`,
  }));
}

const empty: PlanningData = { sessions: [], setLogs: [], painLogs: [] };
const first = (p: ReturnType<typeof buildPlan>) => p[0];

describe('buildPlan', () => {
  it('week 1 without history is the fixed week-1 plan', () => {
    const p = buildPlan(templates.A, 1, empty);
    expect(p).toHaveLength(5);
    expect(first(p)?.plan.reason).toBe('week1_bodyweight');
    expect(first(p)?.last).toBeUndefined();
  });

  it('builds Förra gången and uses the logged load as base', () => {
    const data: PlanningData = {
      sessions: [session({ id: 's1', date: '2026-10-12' })],
      setLogs: logs('s1', 12, 1),
      painLogs: [],
    };
    const p = first(buildPlan(templates.A, 2, data));
    expect(p?.last).toEqual({ sets: 2, amount: 12, loadIndex: 1 });
    expect(p?.plan.loadIndex).toBe(1);
    expect(p?.plan.reason).toBe('start_load');
  });

  it('a pain_stop abort since the exercise last session holds it with seePhysio', () => {
    const data: PlanningData = {
      sessions: [
        session({ id: 's1', date: '2026-10-12', programWeek: 2 }),
        session({
          id: 's2',
          date: '2026-10-15',
          plan: [],
          status: 'aborted',
          abortReason: 'pain_stop',
        }),
      ],
      setLogs: logs('s1', 10, 1),
      painLogs: [],
    };
    const p = first(buildPlan(templates.A, 2, data));
    expect(p?.suggestion.reason).toBe('pain_stop_hold');
    expect(p?.suggestion.seePhysio).toBe(true);
    expect(p?.plan.loadIndex).toBe(1);
  });

  it('pain older than the exercise last session is ignored', () => {
    const data: PlanningData = {
      sessions: [
        session({
          id: 's0',
          date: '2026-10-05',
          status: 'aborted',
          abortReason: 'pain_stop',
          plan: [],
        }),
        session({ id: 's1', date: '2026-10-12', programWeek: 2 }),
      ],
      setLogs: logs('s1', 10, 1),
      painLogs: [],
    };
    expect(first(buildPlan(templates.A, 2, data))?.suggestion.reason).toBe(
      'increase_amount',
    );
  });

  it('day-after warn counts and so does today before reading', () => {
    const data: PlanningData = {
      sessions: [session({ id: 's1', date: '2026-10-12', programWeek: 2 })],
      setLogs: logs('s1', 10, 1),
      painLogs: [
        {
          sessionId: 's1',
          timing: 'after',
          score: 2,
          redFlags: none,
          createdAt: 'a',
        },
        {
          sessionId: 's1',
          timing: 'dayAfter',
          score: 3,
          redFlags: none,
          createdAt: 'b',
        },
      ],
    };
    expect(first(buildPlan(templates.A, 2, data))?.suggestion.reason).toBe(
      'pain_hold',
    );
    const clean: PlanningData = { ...data, painLogs: [] };
    expect(
      first(buildPlan(templates.A, 2, clean, 'warn'))?.suggestion.reason,
    ).toBe('pain_hold');
  });

  it('only that exercise logs and sessions are used', () => {
    const data: PlanningData = {
      sessions: [session({ id: 's1', date: '2026-10-12', programWeek: 2 })],
      setLogs: logs('s1', 10, 1),
      painLogs: [],
    };
    const step = buildPlan(templates.A, 2, data)[1];
    expect(step?.last).toBeUndefined();
    expect(step?.suggestion.reason).toBe('first_time');
  });

  it('ignores an in-progress session', () => {
    const data: PlanningData = {
      sessions: [
        session({ id: 's1', date: '2026-10-12', status: 'in_progress' }),
      ],
      setLogs: logs('s1', 10, 1),
      painLogs: [],
    };
    expect(first(buildPlan(templates.A, 2, data))?.last).toBeUndefined();
  });
});
