import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../domain/types';
import { loggedVariant, sessionSetProgress, symptomSummary } from './history';

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
