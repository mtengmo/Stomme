import { describe, expect, it } from 'vitest';
import type {
  ExerciseId,
  Session,
  SetLog,
  TrainingPreferences,
} from '../domain/types';
import { harderExerciseSuggestions } from './exerciseProgression';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test fixture');
  return value;
}

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight', 'chair', 'support'],
};
const symptom = { area: 'shoulder', side: 'right' as const, score: 2 };
function fixture(id: ExerciseId = 'push-up') {
  const sessions: Session[] = [1, 2].map((n) => ({
    id: `session-${n}`,
    programId: 'general',
    templateId: 'A',
    date: `2026-10-2${n}`,
    startedAt: `2026-10-2${n}T08:00:00Z`,
    status: 'completed',
    programWeek: 1,
    plan: [
      {
        exerciseId: id,
        sets: 2,
        target: 12,
        variantId: 'bodyweight',
        sides: ['both'],
        loadIndex: 0,
        weightKg: 0,
        restSec: 60,
        reason: 'first_time',
      },
    ],
    feedback: { [id]: { effort: 'easy' } },
    checkins: {
      after: {
        feeling: 'good',
        symptoms: null,
        recordedAt: '2026-10-22T09:00:00Z',
      },
    },
  }));
  const logs: SetLog[] = sessions.flatMap((session) =>
    [1, 2].map((setNumber) => ({
      id: `${session.id}-${setNumber}`,
      sessionId: session.id,
      exerciseId: id,
      setNumber,
      side: 'both',
      amount: 15,
      weightKg: 0,
      loadIndex: 0,
      variantId: 'bodyweight',
      loggedAt: session.startedAt,
    })),
  );
  return { sessions, logs };
}
const suggest = (
  data = fixture(),
  id: ExerciseId = 'push-up',
  prefs = preferences,
) => harderExerciseSuggestions(id, prefs, data.sessions, data.logs);

describe('optional harder exercises', () => {
  it('offers both harder push-ups after the latest two successes without changing history', () => {
    const data = fixture();
    const before = structuredClone(data);
    expect(suggest(data)).toEqual(['decline-push-up', 'diamond-push-up']);
    expect(data).toEqual(before);
    expect(suggest(data, 'push-up', { ...preferences, equipment: [] })).toEqual(
      ['diamond-push-up'],
    );
  });
  it('does not count a short success, but a short symptom blocks older full successes', () => {
    const data = fixture();
    const short = {
      ...required(data.sessions[1]),
      workoutMode: 'short' as const,
    };
    expect(
      suggest({ ...data, sessions: [required(data.sessions[0]), short] }),
    ).toEqual([]);
    const symptomatic = {
      ...short,
      id: 'short-later',
      startedAt: '2026-10-23T08:00:00Z',
      feedback: { 'push-up': { symptoms: symptom } },
    };
    expect(
      suggest({ ...data, sessions: [...data.sessions, symptomatic] }),
    ).toEqual([]);
  });
  it.each([
    ['wall-push-up', 'knee-push-up'],
    ['knee-push-up', 'push-up'],
    ['calf-raise', 'single-leg-calf-raise'],
  ] as const)('links %s to %s', (from, to) =>
    expect(suggest(fixture(from), from)).toEqual([to]),
  );
  it('excludes rehab, missing links, absent history and other programmes', () => {
    expect(
      suggest(fixture(), 'push-up', { ...preferences, programId: 'rehab' }),
    ).toEqual([]);
    expect(suggest(fixture(), 'diamond-push-up')).toEqual([]);
    expect(suggest({ sessions: [], logs: [] })).toEqual([]);
    const data = fixture();
    required(data.sessions[0]).programId = 'running';
    expect(suggest(data)).toEqual([]);
  });
  it.each([
    (s: Session) => {
      s.status = 'aborted';
    },
    (s: Session) => {
      s.status = 'in_progress';
    },
    (s: Session) => {
      s.feedback['push-up'] = { skipped: true };
    },
    (s: Session) => {
      s.feedback['push-up'] = { effort: 'hard' };
    },
    (s: Session) => {
      s.feedback = {};
    },
    (s: Session) => {
      s.checkins = undefined;
    },
    (s: Session) => {
      s.checkins = {};
    },
    (s: Session) => {
      required(required(s.checkins).after).feeling = 'mixed';
    },
    (s: Session) => {
      required(s.plan[0]).sets = 0;
    },
    (s: Session) => {
      required(s.plan[0]).sides = [];
    },
  ])(
    'requires completion, easy effort, after answer and planned sets (%#)',
    (change) => {
      const data = fixture();
      change(required(data.sessions[1]));
      expect(suggest(data)).toEqual([]);
    },
  );
  it.each([
    (l: SetLog) => {
      l.amount = 11;
    },
    (l: SetLog) => {
      l.endedEarly = true;
    },
    (l: SetLog) => {
      l.weightKg = 2;
    },
    (l: SetLog) => {
      l.variantId = 'other';
    },
    (l: SetLog) => {
      l.side = 'left';
    },
    (l: SetLog) => {
      l.setNumber = 3;
    },
    (l: SetLog) => {
      l.exerciseId = 'plank';
    },
    (l: SetLog) => {
      l.sessionId = 'other';
    },
  ])(
    'requires every planned set at the top, matching bodyweight variant (%#)',
    (change) => {
      const data = fixture();
      change(required(data.logs[0]));
      expect(suggest(data)).toEqual([]);
    },
  );
  it.each(['feedback', 'checkin', 'pain_stop'] as const)(
    'blocks symptoms since the two attempts: %s',
    (where) => {
      const data = fixture();
      const newer = structuredClone(required(data.sessions[1]));
      newer.id = 'newer';
      newer.startedAt = '2026-10-23T08:00:00Z';
      newer.plan = [];
      if (where === 'feedback')
        newer.feedback = { plank: { symptoms: symptom } };
      if (where === 'checkin')
        required(required(newer.checkins).after).symptoms = symptom;
      if (where === 'pain_stop') newer.abortReason = 'pain_stop';
      data.sessions.push(newer);
      expect(suggest(data)).toEqual([]);
      newer.programId = 'running';
      expect(suggest(data)).toHaveLength(2);
      newer.programId = 'general';
      newer.startedAt = '2026-10-01T08:00:00Z';
      expect(suggest(data)).toHaveLength(2);
    },
  );
  it('supports legacy missing sides/variants and ignores unrelated logs', () => {
    const data = fixture();
    for (const session of data.sessions) {
      required(session.plan[0]).sides = undefined;
      required(session.plan[0]).variantId = undefined;
      session.feedback.plank = undefined;
      required(session.checkins).before = undefined;
    }
    for (const log of data.logs) log.variantId = undefined;
    data.logs.push({
      ...required(data.logs[0]),
      exerciseId: 'plank',
      id: 'unrelated',
    });
    expect(suggest(data)).toHaveLength(2);
  });
  it('requires all sides when the plan asks for them', () => {
    const data = fixture('calf-raise');
    required(required(data.sessions[1]).plan[0]).sides = ['right', 'left'];
    expect(suggest(data, 'calf-raise')).toEqual([]);
  });
});
