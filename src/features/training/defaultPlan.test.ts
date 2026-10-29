import { describe, expect, it } from 'vitest';
import { exercises } from '../../content/exercises';
import type {
  PlannedExercise,
  Session,
  TrainingPreferences,
} from '../../domain/types';
import { limitedExercises } from '../../rules/levelPolicy';
import {
  basePlan,
  customWorkoutPlan,
  defaultPlan,
  painLogsShowPain,
} from './defaultPlan';
import { defaultPlan as reExported } from './TrainingPreview';

const prefs: TrainingPreferences = {
  programId: 'rehab',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support', 'band'],
  rehabFocus: 'knee-physio',
  rehabSide: 'both',
};
const row = (sets: number): PlannedExercise => ({
  exerciseId: 'quad-set',
  sets,
  target: 7,
  loadIndex: 0,
  weightKg: 0,
  restSec: 60,
  reason: 'first_time',
  variantId: 'bodyweight',
  sides: ['right', 'left'],
});
const session = (focus: Session['rehabFocus'], sets: number): Session => ({
  id: `s${sets}`,
  templateId: 'A',
  programId: 'rehab',
  rehabFocus: focus,
  date: '2026-01-02',
  startedAt: '2026-01-02T10:00:00Z',
  status: 'completed',
  programWeek: 1,
  plan: [row(sets)],
  feedback: {},
});

describe('rehab start plan order', () => {
  it('prefills only a fresh start', () => {
    expect(defaultPlan(prefs, 'A', [], [])).toHaveLength(9);
  });
  it('prefers the last session for the same focus over the prefill', () => {
    const plan = defaultPlan(
      prefs,
      'A',
      [session('knee', 5), session('knee-physio', 3)],
      [],
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]?.sets).toBe(3);
  });
  it('prefers a saved plan over a session and the prefill', () => {
    const plan = defaultPlan(prefs, 'A', [session('knee-physio', 3)], [], {
      'knee-physio': [row(4)],
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]?.sets).toBe(4);
  });
  it('ignores a saved plan of another focus', () => {
    expect(defaultPlan(prefs, 'A', [], [], { knee: [row(4)] })).toHaveLength(9);
  });
  it('keeps custom and AAOS behaviour', () => {
    expect(
      defaultPlan({ ...prefs, rehabFocus: 'custom' }, 'A', [], []),
    ).toEqual([]);
    expect(
      defaultPlan({ ...prefs, rehabFocus: 'knee' }, 'A', [], []),
    ).toHaveLength(6);
  });
});

const weights: TrainingPreferences['weights'] = [
  { type: 'dumbbell', kg: 4, count: 2 },
  { type: 'dumbbell', kg: 8, count: 2 },
  { type: 'dumbbell', kg: 12, count: 2 },
];
const general = (
  experience: TrainingPreferences['experience'],
): TrainingPreferences => ({
  programId: 'general',
  experience,
  equipment: ['bodyweight', 'dumbbell-2', 'chair', 'support'],
  weights,
});

describe('level-driven general start plan', () => {
  it('restores the saved A order, sets, rest, variant and sides without replacing unavailable equipment', () => {
    const original = defaultPlan(general('new'), 'A', [], []);
    const saved = [
      { ...(original[1] as PlannedExercise), sets: 4, restSec: 90 },
      { ...(original[0] as PlannedExercise), sets: 3, restSec: 75 },
    ];
    const routines = { general: { A: saved } };
    const restored = defaultPlan(
      general('new'),
      'A',
      [],
      [],
      undefined,
      false,
      routines,
    );
    expect(restored.map((item) => item.exerciseId)).toEqual(
      saved.map((item) => item.exerciseId),
    );
    expect(
      restored.map((item) => [
        item.sets,
        item.restSec,
        item.variantId,
        item.sides,
      ]),
    ).toEqual(
      saved.map((item) => [
        item.sets,
        item.restSec,
        item.variantId,
        item.sides,
      ]),
    );
    if (restored[0]) restored[0].sets = 1;
    expect(saved[0]?.sets).toBe(4);
    expect(
      defaultPlan(general('new'), 'B', [], [], undefined, false, routines),
    ).toEqual(defaultPlan(general('new'), 'B', [], []));
    const unavailable = defaultPlan(
      { ...general('new'), equipment: ['bodyweight'] },
      'A',
      [],
      [],
      undefined,
      false,
      routines,
    );
    expect(unavailable.map((item) => item.variantId)).toEqual(
      saved.map((item) => item.variantId),
    );
    expect(
      unavailable.some((item) =>
        /utrustningsvarianten/.test(item.explanation ?? ''),
      ),
    ).toBe(true);
  });
  it('does not carry a left-only result into a right-only saved routine', () => {
    const right = {
      ...basePlan('dead-bug', general('new')),
      sides: ['right'] as ('right' | 'left')[],
    };
    const left = { ...right, sides: ['left'] as ('right' | 'left')[] };
    const prior: Session = {
      ...session('knee', 2),
      programId: 'general',
      plan: [left],
      feedback: { 'dead-bug': { effort: 'easy' } },
    };
    const logs = [
      {
        id: 'left-set',
        sessionId: prior.id,
        exerciseId: 'dead-bug' as const,
        setNumber: 1,
        side: 'left' as const,
        amount: 12,
        loadIndex: 0,
        weightKg: 0,
        variantId: right.variantId,
        loggedAt: prior.startedAt,
      },
    ];
    const routines = { general: { A: [right] } };
    const restored = defaultPlan(
      general('new'),
      'A',
      [prior],
      logs,
      undefined,
      false,
      routines,
    );
    expect(restored[0]?.sides).toEqual(['right']);
    expect(restored[0]?.target).toBe(right.target);
    const shortSymptom: Session = {
      ...prior,
      id: 'short-later',
      workoutMode: 'short',
      startedAt: '2026-01-03T10:00:00Z',
      checkins: {
        before: {
          recordedAt: '2026-01-03T10:00:00Z',
          feeling: 'tired',
          symptoms: { area: 'Knä', side: 'left', score: 2 },
        },
      },
    };
    expect(
      defaultPlan(
        general('new'),
        'A',
        [shortSymptom, prior],
        logs,
        undefined,
        false,
        routines,
      )[0]?.explanation,
    ).toMatch(/Besvär/);
    const matching = defaultPlan(
      general('new'),
      'A',
      [{ ...prior, plan: [right] }],
      logs.map((log) => ({ ...log, side: 'right' as const })),
      undefined,
      false,
      routines,
    );
    expect(matching[0]?.target).toBe(12);
  });
  it('is re-exported from the preview', () => {
    expect(reExported).toBe(defaultPlan);
  });
  it('starts new on two sets and the lightest weights', () => {
    const plan = defaultPlan(general('new'), 'A', [], []);
    expect(plan.every((item) => item.sets === 2)).toBe(true);
    // Two dumbbells of 4 kg: 8 kg in total.
    expect(plan.find((p) => p.exerciseId === 'floor-press')?.weightKg).toBe(8);
    expect(plan[0]?.explanation).toBe(
      'Startförslag för din träningsvana. Anpassa antal och vikt före start.',
    );
  });
  it('starts some on three sets and the middle weight', () => {
    const plan = defaultPlan(general('some'), 'A', [], []);
    expect(plan.every((item) => item.sets === 3)).toBe(true);
    expect(plan.find((p) => p.exerciseId === 'floor-press')?.weightKg).toBe(16);
  });
  it('starts regular on four then three sets with heavy two-footed lifts', () => {
    const plan = defaultPlan(general('regular'), 'A', [], []);
    expect(plan.map((item) => item.sets).slice(0, 3)).toEqual([4, 4, 3]);
    const heavy = plan.find((item) => item.exerciseId === 'floor-press');
    expect(heavy?.weightKg).toBe(24);
    expect(heavy?.explanation).toMatch(/Tung startvikt/);
  });
  it('starts lightest and without heavy note when symptoms are on record', () => {
    const symptomatic: Session = {
      ...session('knee', 2),
      programId: 'general',
      checkins: {
        before: {
          recordedAt: '2026-01-02T10:00:00Z',
          feeling: 'difficult',
          symptoms: { area: 'Knä', side: 'right', score: 4 },
        },
      },
    };
    const plan = defaultPlan(general('regular'), 'A', [symptomatic], []);
    expect(
      plan.some((item) => /Tung startvikt/.test(item.explanation ?? '')),
    ).toBe(false);
  });
  it('keeps the lightest weight for adds and variant switches', () => {
    const plan = basePlan('goblet-squat', general('regular'));
    expect(plan.exerciseId).toBe('goblet-squat');
    expect(plan.explanation).toBeUndefined();
    const dumbbell = basePlan('floor-press', general('regular'));
    expect(dumbbell.weightKg).toBe(8);
    expect(dumbbell.sets).toBe(3);
  });
  it('leaves rehab on zero sets', () => {
    expect(basePlan('quad-set', prefs).sets).toBe(0);
  });
  it('starts lightest after a pain stop or a painful reading', () => {
    const stopped: Session = {
      ...session('knee', 2),
      programId: 'general',
      status: 'aborted',
      abortReason: 'pain_stop',
    };
    const heavy = (plan: PlannedExercise[]) =>
      plan.some((item) => /Tung startvikt/.test(item.explanation ?? ''));
    expect(heavy(defaultPlan(general('regular'), 'A', [], []))).toBe(true);
    expect(heavy(defaultPlan(general('regular'), 'A', [stopped], []))).toBe(
      false,
    );
    expect(
      heavy(defaultPlan(general('regular'), 'A', [], [], undefined, true)),
    ).toBe(false);
    const log = (score: number, sharp = false) => ({
      id: 'p',
      sessionId: 's',
      date: '2026-01-02',
      timing: 'before' as const,
      score,
      location: 'right_knee' as const,
      redFlags: { sharp, swelling: false, locking: false },
      createdAt: '2026-01-02T10:00:00Z',
    });
    expect(painLogsShowPain([log(0)])).toBe(false);
    expect(painLogsShowPain([log(2)])).toBe(true);
    expect(painLogsShowPain([log(0, true)])).toBe(true);
  });
});

describe('customWorkoutPlan', () => {
  const heavyNote = (item: PlannedExercise) =>
    /Tung startvikt/.test(item.explanation ?? '');
  const stopped: Session = {
    ...session('knee', 2),
    programId: 'general',
    status: 'aborted',
    abortReason: 'pain_stop',
  };
  it('follows experience for sets and starting weight', () => {
    const ids = ['floor-press'] as const;
    const at = (e: TrainingPreferences['experience']) =>
      customWorkoutPlan(ids, general(e), [], [])[0];
    expect([at('new')?.sets, at('new')?.weightKg]).toEqual([2, 8]);
    expect([at('some')?.sets, at('some')?.weightKg]).toEqual([3, 16]);
    expect([at('regular')?.sets, at('regular')?.weightKg]).toEqual([4, 24]);
    expect(heavyNote(at('regular') as PlannedExercise)).toBe(true);
    expect(at('regular')?.target).toBe(exercises['floor-press'].range.start);
  });
  it('never starts a limited exercise on the heaviest weight', () => {
    for (const id of limitedExercises) {
      const [item] = customWorkoutPlan([id], general('regular'), [], []);
      expect(item?.weightKg, id).toBeLessThan(24);
      expect(heavyNote(item as PlannedExercise), id).toBe(false);
    }
  });
  it('starts lightest when pain is on record', () => {
    const [stoppedPlan] = customWorkoutPlan(
      ['floor-press'],
      general('regular'),
      [stopped],
      [],
    );
    expect(stoppedPlan?.weightKg).toBe(8);
    const [reported] = customWorkoutPlan(
      ['floor-press'],
      general('regular'),
      [],
      [],
      true,
    );
    expect(reported?.weightKg).toBe(8);
  });
  it('starts rehab at zero sets and target', () => {
    const [item] = customWorkoutPlan(['quad-set'], prefs, [], []);
    expect(item?.sets).toBe(0);
    expect(item?.target).toBe(0);
    expect(item?.weightKg).toBe(0);
  });
});
