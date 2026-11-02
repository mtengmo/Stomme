import { describe, expect, it } from 'vitest';
import type {
  ExerciseId,
  Session,
  SetLog,
  TrainingPreferences,
} from '../domain/types';
import { inventory } from '../test/inventory';
import { harderExerciseSuggestions } from './exerciseProgression';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test fixture');
  return value;
}

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support'],
};
const symptoms = { area: 'shoulder', side: 'right' as const, score: 2 };
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
  it('offers the knee-loaded single-leg calf raise as an optional step', () => {
    expect(suggest(fixture('calf-raise'), 'calf-raise')).toEqual([
      'single-leg-calf-raise',
    ]);
  });
  it.each(['older', 'other-programme'] as const)(
    'keeps non-impact push-up suggestions for %s symptoms',
    (where) => {
      const data = fixture();
      const symptomatic = structuredClone(required(data.sessions[1]));
      symptomatic.id = 'symptomatic';
      symptomatic.plan = [];
      symptomatic.feedback = { plank: { symptoms } };
      if (where === 'older') symptomatic.startedAt = '2026-10-01T08:00:00Z';
      else symptomatic.programId = 'rehab';
      data.sessions.push(symptomatic);
      expect(suggest(data)).toEqual([
        'decline-push-up',
        'diamond-push-up',
        'blast-off-push-up',
      ]);
    },
  );
  it('offers harder push-ups after the latest two successes without changing history', () => {
    const data = fixture();
    const before = structuredClone(data);
    expect(suggest(data)).toEqual([
      'decline-push-up',
      'diamond-push-up',
      'blast-off-push-up',
    ]);
    expect(data).toEqual(before);
    expect(suggest(data, 'push-up', { ...preferences, equipment: [] })).toEqual(
      ['diamond-push-up', 'blast-off-push-up'],
    );
  });
  it('does not count a short success, and a short session never blocks older full successes', () => {
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
      feedback: { 'push-up': { hurt: true as const } },
    };
    expect(
      suggest({ ...data, sessions: [...data.sessions, symptomatic] }),
    ).toHaveLength(3);
  });
  it('offers step-down after step-up', () => {
    const data = fixture('step-up');
    const withStep = {
      ...preferences,
      equipment: [...preferences.equipment, 'step' as const],
    };
    expect(suggest(data, 'step-up', withStep)).toEqual(['step-down']);
  });
  it('only suggests harder exercises allowed for the experience level', () => {
    const data = fixture('goblet-squat');
    const some = {
      ...preferences,
      experience: 'some' as const,
      ...inventory({ dumbbells: [[5, 2]], support: ['chair', 'support'] }),
    };
    expect(suggest(data, 'goblet-squat', some)).toEqual(['thruster']);
    expect(
      suggest(data, 'goblet-squat', { ...some, experience: 'new' }),
    ).toEqual([]);
  });
  it('does not count borrowed equipment as home progression evidence', () => {
    const data = fixture();
    required(data.sessions[1]).equipmentOverride = {
      equipment: ['bodyweight'],
      weights: [],
    };
    expect(suggest(data)).toEqual([]);
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
    expect(suggest(fixture(), 'blast-off-push-up')).toEqual([]);
    expect(
      suggest(fixture(), 'push-up', { ...preferences, experience: 'some' }),
    ).not.toContain('blast-off-push-up');
    expect(suggest({ sessions: [], logs: [] })).toEqual([]);
    const data = fixture();
    required(data.sessions[0]).programId = 'rehab';
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
      required(s.plan[0]).sets = 0;
    },
    (s: Session) => {
      required(s.plan[0]).sides = [];
    },
  ])('requires completion, easy effort and planned sets (%#)', (change) => {
    const data = fixture();
    change(required(data.sessions[1]));
    expect(suggest(data)).toEqual([]);
  });
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
  it.each([0, 1] as const)(
    'blocks when this exercise hurt in attempt %#, but only for that exercise',
    (index) => {
      const data = fixture();
      required(data.sessions[index]).feedback['push-up'] = {
        effort: 'easy',
        hurt: true,
      };
      expect(suggest(data)).toEqual([]);
      const other = fixture();
      required(other.sessions[index]).feedback.plank = { hurt: true };
      expect(suggest(other)).toHaveLength(3);
    },
  );
  it('ignores an old hurt mark and session-wide signals; the after answer is not needed', () => {
    const data = fixture();
    const old = structuredClone(required(data.sessions[0]));
    old.id = 'old';
    old.startedAt = '2026-10-01T08:00:00Z';
    old.feedback = { 'push-up': { effort: 'easy', hurt: true } };
    data.sessions.push(old);
    for (const session of data.sessions) {
      session.checkins = undefined;
      session.feedback.plank = { symptoms };
    }
    required(data.sessions[1]).abortReason = 'pain_stop';
    expect(suggest(data)).toHaveLength(3);
  });
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
    expect(suggest(data)).toHaveLength(3);
  });
  it('requires all sides when the plan asks for them', () => {
    const data = fixture('calf-raise');
    required(required(data.sessions[1]).plan[0]).sides = ['right', 'left'];
    expect(suggest(data, 'calf-raise')).toEqual([]);
  });
});
