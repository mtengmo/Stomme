import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import type {
  PlannedExercise,
  Session,
  SetLog,
  TrainingPreferences,
} from '../domain/types';
import { inventory } from '../test/inventory';
import {
  hurtLastTime,
  trainingDayAfterDue,
  trainingPlanSuggestion,
  trainingSuggestion,
  validateCheckin,
} from './training';

const plan: PlannedExercise = {
  exerciseId: 'single-leg-rdl',
  sets: 2,
  target: 8,
  loadIndex: 1,
  weightKg: 7.5,
  restSec: 60,
  reason: 'first_time',
  variantId: 'dumbbell',
  sides: ['left'],
};
const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  ...inventory({
    dumbbells: [
      [7.5, 1],
      [10, 1],
    ],
  }),
};
function session(patch: Partial<Session> = {}): Session {
  return {
    id: 'previous',
    templateId: 'A',
    programId: 'general',
    policyVersion: 1,
    date: '2026-10-20',
    startedAt: '2026-10-20T08:00:00.000Z',
    finishedAt: '2026-10-20T08:30:00.000Z',
    status: 'completed',
    programWeek: 1,
    plan: [plan],
    checkins: {
      before: {
        feeling: 'ready',
        symptoms: null,
        recordedAt: '2026-10-20T08:00:00.000Z',
      },
      after: {
        feeling: 'good',
        symptoms: null,
        recordedAt: '2026-10-20T08:30:00.000Z',
      },
    },
    feedback: { 'single-leg-rdl': { effort: 'easy' } },
    ...patch,
  };
}
function logs(id = 'previous', amount = 8): SetLog[] {
  return [1, 2].map((setNumber) => ({
    id: `${id}-${setNumber}`,
    sessionId: id,
    exerciseId: plan.exerciseId,
    setNumber,
    side: 'left',
    amount,
    loadIndex: 1,
    weightKg: 7.5,
    variantId: 'dumbbell',
    loggedAt: '2026-10-20T08:10:00.000Z',
  }));
}

describe('programme-specific progression', () => {
  it('normalizes legacy side selection when matching saved routine history', () => {
    const legacy = session({ plan: [{ ...plan, sides: undefined }] });
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [legacy],
        logs(),
        plan.variantId,
        ['right', 'left'],
      ).explanation,
    ).toMatch(/förslag/);
    const bilateral: PlannedExercise = {
      exerciseId: 'push-up',
      sets: 2,
      target: 8,
      loadIndex: 0,
      weightKg: 0,
      restSec: 60,
      reason: 'first_time',
      variantId: 'bodyweight',
    };
    expect(
      trainingPlanSuggestion(
        bilateral,
        { ...preferences, equipment: ['bodyweight'], weights: [] },
        [session({ plan: [bilateral], feedback: {} })],
        [],
        bilateral.variantId,
        ['both'],
      ).explanation,
    ).toMatch(/Inget komplett/);
  });
  it('does not use short sessions as progression evidence, but a hurt mark in a short session blocks a later increase', () => {
    const full = session();
    expect(
      trainingPlanSuggestion(plan, preferences, [full], logs()).target,
    ).toBe(9);
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [session({ workoutMode: 'short' })],
        logs(),
      ).target,
    ).toBe(8);
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [session({ customWorkoutId: 'custom' })],
        logs(),
      ).target,
    ).toBe(9);
    const symptomatic = session({
      id: 'short-later',
      workoutMode: 'short',
      startedAt: '2026-10-21T08:00:00.000Z',
      feedback: { 'single-leg-rdl': { hurt: true } },
    });
    const blocked = trainingPlanSuggestion(
      plan,
      preferences,
      [symptomatic, full],
      logs(),
    );
    expect(blocked.target).toBe(8);
    expect(blocked.explanation).toMatch(/Ingen automatisk ökning/);
    const feedbackSymptoms = session({
      id: 'short-feedback',
      workoutMode: 'short',
      checkins: undefined,
      feedback: { 'single-leg-rdl': { hurt: true } },
    });
    expect(
      trainingPlanSuggestion(plan, preferences, [feedbackSymptoms], [])
        .explanation,
    ).toMatch(/Ingen automatisk ökning/);
  });
  it('gives a programme pass no automatic increase after a hurt mark', () => {
    const programPass = { programId: 'prog-1', pass: 1, week: 1 };
    const clean = session({ programPass });
    expect(
      trainingPlanSuggestion(plan, preferences, [clean], logs()).target,
    ).toBe(9);
    const hurt = session({
      programPass,
      feedback: { 'single-leg-rdl': { effort: 'easy', hurt: true } },
    });
    const blocked = trainingPlanSuggestion(plan, preferences, [hurt], logs());
    expect(blocked.target).toBe(8);
    expect(blocked.explanation).toMatch(/Ingen automatisk ökning/);
  });
  it('holds only the exercise that hurt, never other exercises or the whole session', () => {
    const other: PlannedExercise = {
      ...plan,
      exerciseId: 'goblet-squat',
      sides: undefined,
      variantId: 'dumbbell',
    };
    const previous = session({
      plan: [plan, other],
      feedback: {
        'single-leg-rdl': { effort: 'easy', hurt: true },
        'goblet-squat': { effort: 'easy' },
      },
    });
    const sym = trainingSuggestion(plan, previous, logs());
    expect(sym).toMatchObject({ target: 8 });
    expect(sym.explanation).toMatch(/Ingen automatisk ökning/);
    const gobletLogs = logs().map((log) => ({
      ...log,
      exerciseId: 'goblet-squat' as const,
      side: 'both' as const,
    }));
    expect(trainingSuggestion(other, previous, gobletLogs).target).toBe(9);
    const later = session({
      id: 'later',
      startedAt: '2026-10-21T08:00:00.000Z',
      plan: [other],
      feedback: { 'goblet-squat': { hurt: true } },
    });
    expect(
      trainingPlanSuggestion(plan, preferences, [later, session()], logs())
        .target,
    ).toBe(9);
  });
  it('keeps the rehab-wide symptom hold and its wording', () => {
    const rehab = session({
      programId: 'rehab',
      feedback: {
        'single-leg-rdl': { symptoms: { area: 'Knä', side: 'left', score: 2 } },
      },
    });
    expect(trainingSuggestion(plan, rehab, logs()).explanation).toMatch(
      /Besvär rapporterades/,
    );
    expect(
      trainingSuggestion(plan, { ...rehab, checkins: undefined }, logs())
        .explanation,
    ).toMatch(/Besvär rapporterades/);
    const stopped = session({
      programId: 'rehab',
      abortReason: 'pain_stop',
      status: 'aborted',
      id: 'later',
      startedAt: '2026-10-21T08:00:00.000Z',
    });
    const rehabPrefs: TrainingPreferences = {
      ...preferences,
      programId: 'rehab',
    };
    expect(
      trainingPlanSuggestion(
        plan,
        rehabPrefs,
        [stopped, session({ programId: 'rehab' })],
        logs(),
      ).explanation,
    ).toMatch(/Kontrollera innan du startar/);
    const checkinOnly = session({
      programId: 'rehab',
      feedback: {},
      checkins: {
        before: {
          feeling: 'ready',
          symptoms: { area: 'Knä', side: 'left', score: 1 },
          recordedAt: '2026-10-20T08:00:00.000Z',
        },
      },
    });
    expect(trainingSuggestion(plan, checkinOnly, logs()).explanation).toMatch(
      /Besvär rapporterades/,
    );
  });
  it('holds progression after a newer full session where the exercise hurt on another side', () => {
    const olderLeft = session();
    const newerRight = session({
      id: 'newer-right',
      startedAt: '2026-10-21T08:00:00.000Z',
      plan: [{ ...plan, sides: ['right'] }],
      feedback: { 'single-leg-rdl': { hurt: true } },
    });
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [newerRight, olderLeft],
        logs(),
        plan.variantId,
        ['left'],
      ),
    ).toMatchObject({ target: 8 });
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [newerRight, olderLeft],
        logs(),
        plan.variantId,
        ['left'],
      ).explanation,
    ).toMatch(/Ingen automatisk ökning/);
  });
  it('keeps borrowed workouts out of home progression evidence while retaining their hurt signal', () => {
    const borrowed = session({
      equipmentOverride: {
        equipment: ['bodyweight'],
        weights: [],
      },
    });
    expect(
      trainingPlanSuggestion(plan, preferences, [borrowed], logs()).target,
    ).toBe(plan.target);
    const older = session({
      id: 'older',
      startedAt: '2026-10-19T08:00:00.000Z',
    });
    const newerBorrowed = session({
      id: 'borrowed-later',
      startedAt: '2026-10-21T08:00:00.000Z',
      equipmentOverride: {
        equipment: ['bodyweight'],
        weights: [],
      },
      feedback: { 'single-leg-rdl': { hurt: true } },
    });
    const result = trainingPlanSuggestion(
      plan,
      preferences,
      [newerBorrowed, older],
      logs('older'),
    );
    expect(result.target).toBe(8);
    expect(result.explanation).toMatch(/Ingen automatisk ökning/);
  });
  it('keeps an unknown draft variant reviewable and does not invent history for an unowned starting load', () => {
    const unknown = { ...plan, variantId: 'old-variant' };
    expect(trainingPlanSuggestion(unknown, preferences, [], []).variantId).toBe(
      'old-variant',
    );
    const result = trainingPlanSuggestion(
      plan,
      { ...preferences, weights: [{ type: 'dumbbell', kg: 5, count: 1 }] },
      [],
      [],
    );
    expect(result).toMatchObject({ weightKg: 7.5, target: plan.target });
    expect(result.explanation).toMatch(/finns inte/);
  });

  it.each(['single-leg-rdl', 'goblet-squat'] as const)(
    'requires all sets on all legacy sides before suggesting a heavier %s',
    (exerciseId) => {
      const ex = exercises[exerciseId];
      const legacyPlan = {
        ...plan,
        exerciseId,
        sides: undefined,
        target: ex.range.max,
      };
      const previous = session({
        plan: [legacyPlan],
        checkins: undefined,
        feedback: { [exerciseId]: { effort: 'easy' } },
      });
      const sides = ex.perSide
        ? (['right', 'left'] as const)
        : (['both'] as const);
      const first = logs()[0];
      if (!first) throw new Error('Missing set fixture');
      const records = [1, 2].flatMap((setNumber) =>
        sides.map((side) => ({
          ...first,
          id: `${setNumber}-${side}`,
          exerciseId,
          setNumber,
          side,
          amount: ex.range.max,
        })),
      );
      const owned: TrainingPreferences = {
        ...preferences,
        weights: [
          { type: 'dumbbell', kg: 7.5, count: 1 },
          { type: 'dumbbell', kg: 10, count: 1 },
        ],
      };
      const result = trainingPlanSuggestion(
        legacyPlan,
        owned,
        [previous],
        records.filter((record) => record.setNumber === 1),
      );
      expect(result.weightKg).toBe(7.5);
      expect(result.explanation).not.toMatch(/Nästa registrerade/);
      expect(
        trainingPlanSuggestion(legacyPlan, owned, [previous], records)
          .explanation,
      ).toMatch(/Nästa registrerade/);
    },
  );
  it('restores the requested equipment variant rather than the latest different variant', () => {
    const bodyweight = session({
      id: 'newer',
      startedAt: '2026-10-21T08:00:00Z',
      plan: [{ ...plan, variantId: 'bodyweight', weightKg: 0, loadIndex: 0 }],
    });
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [session(), bodyweight],
        logs(),
        'dumbbell',
      ).weightKg,
    ).toBe(7.5);
  });

  it('keeps a borrowed weight visible and holds progression when it is not owned', () => {
    const result = trainingPlanSuggestion(
      plan,
      { ...preferences, weights: [{ type: 'dumbbell', kg: 5, count: 1 }] },
      [session()],
      logs(),
    );
    expect(result).toMatchObject({ weightKg: 7.5, target: 8 });
    expect(result.explanation).toMatch(/finns inte/);
  });

  it('offers only an owned next load after complete easy sets at the rep ceiling, without applying it', () => {
    const ceiling = exercises[plan.exerciseId].range.max;
    const owned: TrainingPreferences = {
      ...preferences,
      weights: [
        { type: 'dumbbell' as const, kg: 7.5, count: 1 },
        { type: 'dumbbell' as const, kg: 10, count: 1 },
      ],
    };
    const previous = session({ plan: [{ ...plan, target: ceiling }] });
    const result = trainingPlanSuggestion(
      plan,
      owned,
      [previous],
      logs('previous', ceiling),
    );
    expect(result.weightKg).toBe(7.5);
    expect(result.explanation).toMatch(/Nästa registrerade vikt är 1 × 10 kg/);
    const incomplete = trainingPlanSuggestion(
      plan,
      owned,
      [previous],
      logs('previous', ceiling).slice(0, 1),
    );
    expect(incomplete.explanation).not.toMatch(/Nästa registrerade/);
  });
  it('proposes one repetition after complete easy sets, with or without an after answer', () => {
    const suggestion = trainingSuggestion(plan, session(), logs());
    expect(suggestion).toMatchObject({
      target: 9,
      weightKg: 7.5,
      variantId: 'dumbbell',
      sides: ['left'],
    });
    expect(suggestion.explanation).toMatch(/\+1 repetition/);
    expect(
      trainingSuggestion(plan, session({ checkins: undefined }), logs()).target,
    ).toBe(9);
    expect(
      trainingSuggestion(
        plan,
        session({
          checkins: {
            after: {
              feeling: 'difficult',
              symptoms: null,
              recordedAt: '2026-10-20T08:30:00.000Z',
            },
          },
        }),
        logs(),
      ).target,
    ).toBe(9);
  });

  it.each([
    [
      'easy effort on an exercise that hurt',
      session({
        feedback: { 'single-leg-rdl': { effort: 'easy', hurt: true } },
      }),
    ],
    [
      'hard effort without pain',
      session({
        feedback: { 'single-leg-rdl': { effort: 'hard', symptoms: null } },
      }),
    ],
    ['rehab even after easy painless sets', session({ programId: 'rehab' })],
    [
      'a skipped effort answer',
      session({ feedback: { 'single-leg-rdl': { effortSkipped: true } } }),
    ],
    ['no effort answer', session({ feedback: {} })],
    [
      'skipped exercise',
      session({
        feedback: { 'single-leg-rdl': { effort: 'easy', skipped: true } },
      }),
    ],
  ])('does not increase after %s', (_name, previous) => {
    expect(trainingSuggestion(plan, previous, logs())).toMatchObject({
      target: 8,
      weightKg: 7.5,
    });
  });

  it('does not increase when the selected side has an incomplete set', () => {
    expect(trainingSuggestion(plan, session(), logs().slice(0, 1)).target).toBe(
      8,
    );
  });

  it('does not increase when a completed set falls short of its target', () => {
    const belowTarget = logs().map((log) => ({ ...log, amount: 7 }));
    expect(trainingSuggestion(plan, session(), belowTarget)).toMatchObject({
      target: 7,
      explanation:
        'Samma nivå som senast. Vikt och antal kan anpassas före start.',
    });
  });

  it('does not increase when set weights differ despite easy effort and a good after check', () => {
    const mixedWeights = logs().map((log, index) =>
      index === 0 ? { ...log, weightKg: 10 } : log,
    );
    expect(trainingSuggestion(plan, session(), mixedWeights)).toMatchObject({
      target: 8,
      weightKg: 7.5,
      explanation:
        'Samma nivå som senast. Vikt och antal kan anpassas före start.',
    });
  });

  it('checks every set from the previous plan even if the new experience setting asks for fewer sets', () => {
    expect(
      trainingSuggestion(
        plan,
        session({ plan: [{ ...plan, sets: 3 }] }),
        logs(),
      ).target,
    ).toBe(8);
    expect(
      trainingSuggestion({ ...plan, sets: 3 }, session(), logs()).target,
    ).toBe(8);
  });

  it('uses the latest actual set by time even when database records arrive in another order', () => {
    const first = logs()[0];
    if (!first) throw new Error('Missing set fixture');
    const recent = {
      ...first,
      id: 'recent',
      amount: 6,
      loggedAt: '2026-10-20T08:20:00.000Z',
    };
    expect(
      trainingSuggestion(
        plan,
        session({ feedback: { 'single-leg-rdl': { effort: 'hard' } } }),
        [recent, ...logs()],
      ).target,
    ).toBe(6);
  });

  it('keeps other programmes and legacy sessions out of the current suggestion', () => {
    const mine = session({
      id: 'mine',
      startedAt: '2026-10-18T08:00:00.000Z',
      plan: [{ ...plan, target: 7 }],
    });
    const other = session({
      id: 'other',
      programId: 'rehab',
      startedAt: '2026-10-20T08:00:00.000Z',
    });
    const legacy = session({
      id: 'legacy',
      programId: undefined,
      startedAt: '2026-10-21T08:00:00.000Z',
    });
    const suggestion = trainingPlanSuggestion(
      plan,
      preferences,
      [other, legacy, mine],
      [...logs('other', 12), ...logs('legacy', 15), ...logs('mine', 7)],
    );
    expect(suggestion.target).toBe(8);
    expect(
      trainingPlanSuggestion(
        plan,
        preferences,
        [other, legacy],
        logs('other', 12),
      ).target,
    ).toBe(plan.target);
  });

  it('restores the previous compatible weight variant and selected side, even when the default is bodyweight', () => {
    const base = {
      ...plan,
      variantId: 'bodyweight',
      loadIndex: 0,
      weightKg: 0,
      sides: ['right', 'left'] as ('right' | 'left')[],
    };
    expect(
      trainingPlanSuggestion(base, preferences, [session()], logs()),
    ).toMatchObject({
      variantId: 'dumbbell',
      weightKg: 7.5,
      loadIndex: 1,
      sides: ['left'],
      target: 9,
    });
    const withoutWeights = trainingPlanSuggestion(
      base,
      { ...preferences, equipment: ['bodyweight'], weights: [] },
      [session()],
      logs(),
    );
    expect(withoutWeights).toMatchObject({
      variantId: 'bodyweight',
      weightKg: 0,
      loadIndex: 0,
      target: 8,
    });
    expect(withoutWeights.explanation).toMatch(/utrustningsvariant/);
  });
});

describe('conditional next-day answers', () => {
  it('asks rehab the next day, regardless of recorded effort', () => {
    expect(
      trainingDayAfterDue(session({ programId: 'rehab' }), '2026-10-21'),
    ).toBe(true);
    expect(trainingDayAfterDue(session(), '2026-10-21')).toBe(false);
  });
  it('never asks regular training the next day, even after symptoms or hurt marks', () => {
    const symptom = { area: 'Axel', side: 'right' as const, score: 2 };
    for (const patch of [
      {
        feedback: {
          'single-leg-rdl': { effort: 'easy' as const, hurt: true as const },
        },
      },
      { feedback: { 'single-leg-rdl': { symptoms: symptom } } },
      { abortReason: 'pain_stop' as const },
      {},
    ])
      expect(trainingDayAfterDue(session(patch), '2026-10-21')).toBe(false);
  });
  it('does not re-ask, ask early, ask an unfinished session, or treat legacy as rehab', () => {
    expect(
      trainingDayAfterDue(session({ programId: 'rehab' }), '2026-10-20'),
    ).toBe(false);
    expect(
      trainingDayAfterDue(session({ programId: 'rehab' }), '2026-10-22'),
    ).toBe(false);
    expect(
      trainingDayAfterDue(
        session({ programId: 'rehab', status: 'in_progress' }),
        '2026-10-21',
      ),
    ).toBe(false);
    expect(
      trainingDayAfterDue(session({ programId: undefined }), '2026-10-21'),
    ).toBe(false);
    expect(
      trainingDayAfterDue(
        session({
          programId: 'rehab',
          checkins: {
            dayAfter: {
              feeling: 'good',
              symptoms: null,
              recordedAt: '2026-10-21T08:00:00.000Z',
            },
          },
        }),
        '2026-10-21',
      ),
    ).toBe(false);
  });
});

describe('question validation', () => {
  it.each([
    undefined,
    null,
    {},
    { feeling: 'ready', recordedAt: 'garbage', symptoms: null },
    { feeling: 'ready', recordedAt: '2026-10-20T08:00:00.000Z' },
    {
      feeling: 'ready',
      recordedAt: '2026-10-20T08:00:00.000Z',
      symptoms: { area: 3, side: 'left', score: 2 },
    },
    {
      feeling: 'ready',
      recordedAt: '2026-10-20T08:00:00.000Z',
      symptoms: { area: 'Knä', side: 'left', score: 11 },
    },
  ])(
    'rejects incomplete or malformed answers without inferring no symptoms: %j',
    (value) => {
      expect(validateCheckin(value)).toBe(false);
    },
  );
});

describe('fallbacks when the previous session lacks detail', () => {
  const bare = { ...plan, sides: undefined, variantId: undefined };
  it('has no result to build on when the previous session logged nothing for the exercise', () => {
    expect(trainingSuggestion(plan, session(), []).explanation).toBe(
      'Inget komplett resultat att utgå från. Välj själv.',
    );
  });
  it('falls back to the new plan when the previous plan, check-ins and sides are absent', () => {
    const previous = session({ plan: [], checkins: undefined });
    const perSide = trainingSuggestion(bare, previous, logs());
    expect(perSide.target).toBe(8);
    expect(perSide.explanation).toContain('Samma nivå');
    const both = trainingSuggestion(
      { ...bare, exerciseId: 'goblet-squat' },
      previous,
      logs().map((log) => ({
        ...log,
        exerciseId: 'goblet-squat' as const,
        side: 'both' as const,
      })),
    );
    expect(both.explanation).toBeTruthy();
  });
  it('does not ask the next day without any check-ins or symptoms', () => {
    expect(
      trainingDayAfterDue(session({ checkins: undefined }), '2026-10-21'),
    ).toBe(false);
  });
});

describe('laps are never progressed', () => {
  it('keeps the lap target after an easy, symptom-free session', () => {
    const lapsPlan: PlannedExercise = {
      ...plan,
      exerciseId: 'balance-clock',
      target: 3,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
    };
    const lapLogs = logs().map((l) => ({
      ...l,
      exerciseId: 'balance-clock' as const,
      amount: 3,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
    }));
    const previous = session({
      plan: [lapsPlan],
      feedback: { 'balance-clock': { effort: 'easy' } },
    });
    const suggestion = trainingSuggestion(lapsPlan, previous, lapLogs);
    expect(suggestion.target).toBe(3);
    expect(suggestion.explanation).not.toMatch(/\+1/);
  });
});

describe('hurtLastTime', () => {
  const hurtSession = session({
    feedback: { 'single-leg-rdl': { hurt: true } },
  });
  it('is true when the latest finished attempt at the exercise was flagged', () => {
    expect(hurtLastTime('single-leg-rdl', 'general', [hurtSession])).toBe(true);
    // An aborted pain stop counts as finished; a newer clean attempt clears it.
    expect(
      hurtLastTime('single-leg-rdl', 'general', [
        session({
          id: 'newer',
          startedAt: '2026-10-21T08:00:00.000Z',
          feedback: { 'single-leg-rdl': { effort: 'easy' } },
        }),
        hurtSession,
      ]),
    ).toBe(false);
  });
  it('ignores other exercises, programmes and the session being prepared', () => {
    expect(hurtLastTime('goblet-squat', 'general', [hurtSession])).toBe(false);
    expect(hurtLastTime('single-leg-rdl', 'rehab', [hurtSession])).toBe(false);
    expect(
      hurtLastTime('single-leg-rdl', 'general', [
        { ...hurtSession, status: 'in_progress' },
      ]),
    ).toBe(false);
    expect(hurtLastTime('single-leg-rdl', 'general', [])).toBe(false);
  });
});
