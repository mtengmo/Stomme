import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import { templates } from '../content/templates';
import type { ExerciseId } from '../domain/types';
import { interimPlan, setsForWeek } from './prescription';
import {
  buildSteps,
  nextIndex,
  nextSetStep,
  resumeIndex,
  type SetSide,
  type Step,
} from './sessionPlan';

const catalog = (id: ExerciseId) => exercises[id];
const stepsFor = (t: 'A' | 'B', week = 1) =>
  buildSteps(interimPlan(templates[t], week), catalog);
const label = (s: Step) =>
  s.kind === 'set'
    ? `${s.exerciseId}#${s.setNumber}${s.side === 'both' ? '' : s.side[0]}`
    : `${s.kind}:${s.exerciseId}`;
const log = (exerciseId: ExerciseId, setNumber: number, side: SetSide) => ({
  exerciseId,
  setNumber,
  side,
});

describe('buildSteps', () => {
  it('orders pass A in week 1', () => {
    const steps = stepsFor('A').map(label);
    expect(steps.slice(0, 6)).toEqual([
      'goblet-chair-squat#1',
      'rest:goblet-chair-squat',
      'goblet-chair-squat#2',
      'effort:goblet-chair-squat',
      'rest:goblet-chair-squat',
      'step-up#1r',
    ]);
    expect(steps.filter((s) => s.startsWith('step-up#')).join()).toBe(
      'step-up#1r,step-up#1l,step-up#2r,step-up#2l',
    );
  });

  it('does rest only after the left side and not between sides', () => {
    const s = stepsFor('A').map(label);
    const i = s.indexOf('step-up#1l');
    expect(s[i - 1]).toBe('step-up#1r');
    expect(s[i + 1]).toBe('rest:step-up');
    expect(s[i + 2]).toBe('step-up#2r');
  });

  it('gives pass B three carry sets in week 1', () => {
    const carry = stepsFor('B').filter(
      (s) => s.kind === 'set' && s.exerciseId === 'suitcase-carry',
    );
    expect(carry).toHaveLength(6); // 3 sets x 2 hands
  });

  it('ends with the last effort step, no trailing rest', () => {
    for (const t of ['A', 'B'] as const) {
      const steps = stepsFor(t);
      expect(steps.at(-1)?.kind).toBe('effort');
      expect(steps.filter((s) => s.kind === 'effort')).toHaveLength(5);
    }
  });

  it('adds a third set from week 3', () => {
    expect(setsForWeek(2, 2)).toBe(2);
    expect(setsForWeek(2, 3)).toBe(3);
    expect(setsForWeek(3, 3)).toBe(3);
    const sets = stepsFor('A', 3).filter(
      (s) => s.kind === 'set' && s.exerciseId === 'goblet-chair-squat',
    );
    expect(sets).toHaveLength(3);
  });
});

describe('interimPlan', () => {
  it('uses week 1 loads and the start of the range', () => {
    const plan = interimPlan(templates.B, 1);
    const carry = plan.find((p) => p.exerciseId === 'suitcase-carry');
    expect(carry).toMatchObject({ sets: 3, target: 20, weightKg: 10 });
    const split = plan.find((p) => p.exerciseId === 'split-squat');
    expect(split).toMatchObject({ weightKg: 0, reason: 'week1_bodyweight' });
  });

  it('uses start loads from week 2', () => {
    const goblet = interimPlan(templates.A, 2)[0];
    expect(goblet).toMatchObject({ loadIndex: 1, weightKg: 10, target: 10 });
  });
});

describe('resumeIndex', () => {
  const steps = stepsFor('A');

  it('starts at 0 with nothing logged', () => {
    expect(resumeIndex(steps, [], {})).toBe(0);
  });

  it('resumes after 3 logged sets, skipping the rest', () => {
    const logs = [
      log('goblet-chair-squat', 1, 'both'),
      log('goblet-chair-squat', 2, 'both'),
      log('step-up', 1, 'right'),
    ];
    // the first goblet effort is still missing, so it comes first
    expect(steps[resumeIndex(steps, logs, {})]).toMatchObject({
      kind: 'effort',
    });
    const i2 = resumeIndex(steps, logs, {
      'goblet-chair-squat': { effort: 'ok' },
    });
    expect(steps[i2]).toMatchObject({
      kind: 'set',
      exerciseId: 'step-up',
      side: 'left',
    });
  });

  it('is at the end when everything is logged', () => {
    const logs = steps.flatMap((s) =>
      s.kind === 'set' ? [log(s.exerciseId, s.setNumber, s.side)] : [],
    );
    const feedback = Object.fromEntries(
      steps.flatMap((s) =>
        s.kind === 'effort' ? [[s.exerciseId, { effort: 'ok' as const }]] : [],
      ),
    );
    expect(resumeIndex(steps, logs, feedback)).toBe(steps.length);
  });

  it('moves past a skipped exercise', () => {
    const i = resumeIndex(steps, [], {
      'goblet-chair-squat': { skipped: true },
    });
    expect(steps[i]).toMatchObject({ exerciseId: 'step-up', setNumber: 1 });
  });
});

describe('nextIndex', () => {
  const steps = stepsFor('A');

  it('steps forward normally', () => {
    expect(nextIndex(steps, 0, {})).toBe(1);
  });

  it('skips a skipped exercise including its rest', () => {
    const effort = steps.findIndex((s) => s.kind === 'effort');
    const fb = { 'step-up': { skipped: true } };
    const i = nextIndex(steps, effort, fb);
    expect(steps[i]).toMatchObject({ kind: 'rest' });
    const j = nextIndex(steps, i, fb);
    expect(steps[j]).toMatchObject({ exerciseId: 'single-leg-rdl' });
  });

  it('drops a rest that would end the session', () => {
    const prevEffort = steps.findIndex(
      (s) => s.kind === 'effort' && s.exerciseId === 'dead-bug',
    );
    const fb = { 'side-plank': { skipped: true } };
    expect(nextIndex(steps, prevEffort, fb)).toBe(steps.length);
  });

  it('finds the next set for the next-up line', () => {
    expect(nextSetStep(steps, 1, {})).toMatchObject({ setNumber: 2 });
    expect(nextSetStep(steps, steps.length, {})).toBeUndefined();
  });
});
