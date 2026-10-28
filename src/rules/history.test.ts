import { describe, expect, it } from 'vitest';
import type { PainLog, Session, SetLog } from '../domain/types';
import {
  historySummary,
  loggedVariant,
  sessionSetProgress,
  symptomSummary,
} from './history';

const session: Session = {
  id: 's',
  templateId: 'A',
  programId: 'rehab',
  date: '2026-10-20',
  startedAt: '2026-10-20T08:00:00Z',
  status: 'completed',
  programWeek: 1,
  feedback: {},
  plan: [
    {
      exerciseId: 'straight-leg-raise',
      sets: 1,
      target: 3,
      loadIndex: 0,
      weightKg: 0,
      restSec: 30,
      reason: 'first_time',
      sides: ['right', 'left'],
    },
  ],
};
const log: SetLog = {
  id: 'l',
  sessionId: 's',
  exerciseId: 'straight-leg-raise',
  setNumber: 1,
  side: 'left',
  amount: 3,
  loadIndex: 0,
  weightKg: 0,
  loggedAt: session.startedAt,
};
describe('honest history summaries', () => {
  it('counts selected sides rather than treating a half set as complete', () => {
    expect(sessionSetProgress(session, [log])).toEqual({ done: 0, total: 1 });
    expect(
      sessionSetProgress(session, [log, { ...log, id: 'r', side: 'right' }]),
    ).toEqual({ done: 1, total: 1 });
    expect(
      sessionSetProgress(
        {
          ...session,
          plan: session.plan.map((p) => ({ ...p, sides: ['left'] })),
        },
        [log],
      ),
    ).toEqual({ done: 1, total: 1 });
    expect(
      sessionSetProgress(session, [{ ...log, sessionId: 'another' }]),
    ).toEqual({ done: 0, total: 1 });
  });
  it('does not turn missing symptom answers or effort into absence of symptoms', () => {
    expect(symptomSummary(session, [])).toBe('Besvär: svar saknas');
    expect(
      symptomSummary(
        { ...session, feedback: { 'straight-leg-raise': { effort: 'easy' } } },
        [],
      ),
    ).toBe('Besvär: svar saknas');
    expect(
      symptomSummary(
        {
          ...session,
          checkins: {
            before: {
              recordedAt: session.startedAt,
              feeling: 'ready',
              symptoms: null,
            },
          },
        },
        [],
      ),
    ).toBe('Inga besvär i sparade svar');
    expect(
      symptomSummary(
        {
          ...session,
          feedback: {
            'straight-leg-raise': {
              effort: 'easy',
              symptoms: { area: 'Knä', side: 'left', score: 2 },
            },
          },
        },
        [],
      ),
    ).toContain('Knä');
  });
  it('separates identical weights by equipment and keeps unknown variants explicit', () => {
    const row = {
      ...log,
      exerciseId: 'supported-row' as const,
      weightKg: 10,
      loadIndex: 0,
    };
    expect(loggedVariant({ ...row, variantId: 'dumbbell' })).toBe('dumbbell');
    expect(loggedVariant({ ...row, variantId: 'kettlebell' })).toBe(
      'kettlebell',
    );
    expect(loggedVariant({ ...row, variantId: 'invalid' })).toBe('unknown');
  });
});

describe('legacy symptom summary', () => {
  it('says the answer is missing for a legacy session without pain logs', () => {
    expect(symptomSummary({ ...session, programId: undefined }, [])).toBe(
      'Besvär: svar saknas',
    );
  });
});

describe('historySummary', () => {
  const at = (
    id: string,
    date: string,
    status: Session['status'],
  ): Session => ({
    ...session,
    id,
    date,
    startedAt: `${date}T08:00:00Z`,
    status,
  });
  const pain = (
    sessionId: string,
    score: number,
    timing: PainLog['timing'],
  ): PainLog => ({
    id: `p-${sessionId}-${timing}`,
    sessionId,
    date: '2026-10-28',
    timing,
    score,
    location: 'right_knee',
    redFlags: { sharp: false, swelling: false, locking: false },
    createdAt: '2026-10-28T09:00:00Z',
  });

  it('counts this week and the last four calendar weeks from real sessions', () => {
    // Wednesday 2026-10-28: the week starts Monday 2026-10-26, four weeks back is 2026-10-05.
    const sessions = [
      at('a', '2026-10-27', 'completed'),
      at('b', '2026-10-22', 'completed'),
      at('c', '2026-10-15', 'aborted'),
      at('d', '2026-10-06', 'completed'),
      at('e', '2026-10-04', 'completed'),
      at('f', '2026-10-28', 'in_progress'),
    ];
    const s = historySummary(sessions, [], '2026-10-28');
    expect(s.weekCompleted).toBe(1);
    expect(s.fourWeeksCompleted).toBe(3);
    expect(s.fourWeeksAborted).toBe(1);
    expect(s.last?.id).toBe('f');
  });

  it('reports pain only when an after reading exists for the newest session', () => {
    const sessions = [at('a', '2026-10-27', 'completed')];
    expect(
      historySummary(sessions, [], '2026-10-28').lastPainAfter,
    ).toBeUndefined();
    expect(
      historySummary(sessions, [pain('a', 2, 'before')], '2026-10-28')
        .lastPainAfter,
    ).toBeUndefined();
    expect(
      historySummary(sessions, [pain('a', 2, 'after')], '2026-10-28')
        .lastPainAfter,
    ).toBe(2);
  });

  it('has nothing to report without sessions', () => {
    const s = historySummary([], [], '2026-10-28');
    expect(s).toEqual({
      weekCompleted: 0,
      fourWeeksCompleted: 0,
      fourWeeksAborted: 0,
      last: undefined,
      lastPainAfter: undefined,
    });
  });
});
