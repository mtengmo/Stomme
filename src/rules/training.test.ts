import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import type {
  PlannedExercise,
  Session,
  SetLog,
  TrainingPreferences,
} from '../domain/types';
import { inventory } from '../test/inventory';
import { buildPlan } from './nextPlan';
import {
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
  it('does not use short sessions as progression evidence, but short symptoms block a later increase', () => {
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
      checkins: {
        before: {
          feeling: 'tired',
          symptoms: { area: 'Knä', side: 'left', score: 2 },
          recordedAt: '2026-10-21T08:00:00.000Z',
        },
      },
    });
    const blocked = trainingPlanSuggestion(
      plan,
      preferences,
      [symptomatic, full],
      logs(),
    );
    expect(blocked.target).toBe(8);
    expect(blocked.explanation).toMatch(/Besvär/);
    const feedbackSymptoms = session({
      id: 'short-feedback',
      workoutMode: 'short',
      checkins: undefined,
      feedback: {
        'single-leg-rdl': { symptoms: { area: 'Knä', side: 'left', score: 2 } },
      },
    });
    expect(
      trainingPlanSuggestion(plan, preferences, [feedbackSymptoms], [])
        .explanation,
    ).toMatch(/Besvär/);
  });
  it('holds progression after a newer full session with symptoms on another side', () => {
    const olderLeft = session();
    const newerRight = session({
      id: 'newer-right',
      startedAt: '2026-10-21T08:00:00.000Z',
      plan: [{ ...plan, sides: ['right'] }],
      checkins: {
        before: {
          feeling: 'tired',
          symptoms: { area: 'Knä', side: 'right', score: 2 },
          recordedAt: '2026-10-21T08:00:00.000Z',
        },
      },
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
    ).toMatch(/Besvär/);
  });
  it('keeps borrowed workouts out of home progression evidence while retaining their symptom signal', () => {
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
      feedback: {
        'single-leg-rdl': { symptoms: { area: 'Knä', side: 'left', score: 2 } },
      },
    });
    const result = trainingPlanSuggestion(
      plan,
      preferences,
      [newerBorrowed, older],
      logs('older'),
    );
    expect(result.target).toBe(8);
    expect(result.explanation).toMatch(/Besvär/);
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
    'requires all legacy sides and an after answer before suggesting a heavier %s',
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
        records,
      );
      expect(result.weightKg).toBe(7.5);
      expect(result.explanation).not.toMatch(/Nästa registrerade/);
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
  it('proposes one repetition after complete easy sets and an explicitly good symptom-free after answer', () => {
    const suggestion = trainingSuggestion(plan, session(), logs());
    expect(suggestion).toMatchObject({
      target: 9,
      weightKg: 7.5,
      variantId: 'dumbbell',
      sides: ['left'],
    });
    expect(suggestion.explanation).toMatch(/\+1 repetition/);
  });

  it.each([
    [
      'easy effort with exercise pain',
      session({
        feedback: {
          'single-leg-rdl': {
            effort: 'easy',
            symptoms: { area: 'Höft', side: 'left', score: 2 },
          },
        },
      }),
    ],
    [
      'hard effort without pain',
      session({
        feedback: { 'single-leg-rdl': { effort: 'hard', symptoms: null } },
      }),
    ],
    [
      'unknown after answer',
      session({
        checkins: {
          before: {
            feeling: 'ready',
            symptoms: null,
            recordedAt: '2026-10-20T08:00:00.000Z',
          },
        },
      }),
    ],
    [
      'pain before workout',
      session({
        checkins: {
          before: {
            feeling: 'ready',
            symptoms: { area: 'Rygg', side: 'unspecified', score: 1 },
            recordedAt: '2026-10-20T08:00:00.000Z',
          },
          after: {
            feeling: 'good',
            symptoms: null,
            recordedAt: '2026-10-20T08:30:00.000Z',
          },
        },
      }),
    ],
    [
      'difficult overall feeling without pain',
      session({
        checkins: {
          after: {
            feeling: 'difficult',
            symptoms: null,
            recordedAt: '2026-10-20T08:30:00.000Z',
          },
        },
      }),
    ],
    ['rehab even after easy painless sets', session({ programId: 'rehab' })],
    [
      'a deferred ("Svara senare") after answer',
      session({
        checkins: {
          before: {
            feeling: 'ready',
            symptoms: null,
            recordedAt: '2026-10-20T08:00:00.000Z',
          },
        },
      }),
    ],
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
      programId: 'running',
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

  it('preserves original A/B progression when newer programme records exist', () => {
    const template = {
      id: 'A' as const,
      name: 'A',
      items: [{ exerciseId: plan.exerciseId, sets: 2, restSec: 60 }],
    };
    const clean = buildPlan(template, 2, {
      sessions: [],
      setLogs: [],
      painLogs: [],
    });
    const mixed = buildPlan(template, 2, {
      sessions: [session()],
      setLogs: logs(),
      painLogs: [],
    });
    expect(mixed).toEqual(clean);
  });
});

describe('conditional next-day answers', () => {
  it('asks rehab the next day, regardless of recorded effort', () => {
    expect(
      trainingDayAfterDue(session({ programId: 'rehab' }), '2026-10-21'),
    ).toBe(true);
    expect(trainingDayAfterDue(session(), '2026-10-21')).toBe(false);
  });
  it('asks after reported exercise or session symptoms, but not just hard effort', () => {
    const symptom = { area: 'Axel', side: 'right' as const, score: 2 };
    expect(
      trainingDayAfterDue(
        session({
          feedback: { 'single-leg-rdl': { effort: 'easy', symptoms: symptom } },
        }),
        '2026-10-21',
      ),
    ).toBe(true);
    expect(
      trainingDayAfterDue(
        session({
          checkins: {
            after: {
              feeling: 'mixed',
              symptoms: symptom,
              recordedAt: '2026-10-20T08:30:00.000Z',
            },
          },
        }),
        '2026-10-21',
      ),
    ).toBe(true);
    expect(
      trainingDayAfterDue(
        session({ feedback: { 'single-leg-rdl': { effort: 'hard' } } }),
        '2026-10-21',
      ),
    ).toBe(false);
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
