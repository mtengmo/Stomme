import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import type {
  Effort,
  ExerciseId,
  PainStatus,
  ReasonCode,
  SetLog,
} from '../domain/types';
import {
  type LastResult,
  type Suggestion,
  setsForWeek,
  suggestNext,
} from './progression';

interface Opts {
  sets: number;
  target: number;
  load: number;
  effort?: Effort;
  skipped?: boolean;
  pain?: PainStatus;
  week?: number;
  /** Amount per set number (right side for per-side); default = target. */
  amounts?: number[];
  /** Amount for the left side per set number; default = right amount. */
  left?: number[];
  loggedLoad?: number;
  noLogs?: boolean;
  logsAs?: ExerciseId;
}

function last(id: ExerciseId, o: Opts): LastResult {
  const ex = exercises[id];
  const logs: SetLog[] = [];
  if (!o.noLogs) {
    for (let n = 1; n <= o.sets; n++) {
      const right = o.amounts?.[n - 1] ?? o.target;
      const left = o.left?.[n - 1] ?? right;
      const load = o.loggedLoad ?? o.load;
      const sides = ex.perSide
        ? ([
            ['right', right],
            ['left', left],
          ] as const)
        : ([['both', right]] as const);
      for (const [side, amount] of sides) {
        logs.push({
          id: `${id}-${n}-${side}`,
          sessionId: 's',
          exerciseId: o.logsAs ?? id,
          setNumber: n,
          side,
          amount,
          loadIndex: load,
          weightKg: ex.loadLadder[load]?.kg ?? 0,
          loggedAt: `2026-10-1${n}T10:00:00Z`,
        });
      }
    }
  }
  return {
    plan: {
      exerciseId: o.logsAs ?? id,
      sets: o.sets,
      target: o.target,
      loadIndex: o.load,
      weightKg: ex.loadLadder[o.load]?.kg ?? 0,
      restSec: 60,
      reason: 'first_time',
    },
    logs,
    feedback: { effort: o.effort, skipped: o.skipped },
    sessionPain: o.pain ?? 'ok',
    programWeek: o.week ?? 2,
  };
}

const next = (
  id: ExerciseId,
  tSets: number,
  week: number,
  l?: LastResult,
): Suggestion => suggestNext(exercises[id], tSets, week, l);

function expectS(
  s: Suggestion,
  sets: number,
  target: number,
  loadIndex: number,
  reason: ReasonCode,
  seePhysio = false,
) {
  expect(s).toMatchObject({ sets, target, loadIndex, reason, seePhysio });
}

describe('setsForWeek', () => {
  it.each([
    [2, 1, 2],
    [2, 2, 2],
    [2, 3, 3],
    [3, 3, 3],
    [4, 5, 4],
  ])('template %i, week %i -> %i', (t, w, expected) => {
    expect(setsForWeek(t, w)).toBe(expected);
  });
});

describe('week 1 and first time', () => {
  it('goblet squat: 2x10 bodyweight', () => {
    const s = next('goblet-chair-squat', 2, 1);
    expectS(s, 2, 10, 0, 'week1_bodyweight');
    expect(s.weightKg).toBe(0);
  });
  it('carry: 3x20 m at 10 kg', () => {
    const s = next('suitcase-carry', 3, 1);
    expectS(s, 3, 20, 0, 'first_time');
    expect(s.weightKg).toBe(10);
  });
  it('week 1 ignores history', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 12,
      load: 2,
      week: 1,
    });
    expectS(next('goblet-chair-squat', 2, 1, l), 2, 10, 0, 'week1_bodyweight');
  });
  it('week 1 after a knee stop flags the physio but keeps the plan', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 10,
      load: 0,
      week: 1,
      pain: 'stop',
    });
    expectS(
      next('goblet-chair-squat', 2, 1, l),
      2,
      10,
      0,
      'week1_bodyweight',
      true,
    );
    const core = last('dead-bug', {
      sets: 2,
      target: 8,
      load: 0,
      week: 1,
      pain: 'stop',
    });
    expect(next('dead-bug', 2, 1, core).seePhysio).toBe(false);
  });
  it('week 2 without history: goblet 2x10 at 10 kg', () => {
    const s = next('goblet-chair-squat', 2, 2);
    expectS(s, 2, 10, 1, 'first_time');
    expect(s.weightKg).toBe(10);
  });
  it('week 3 without history uses three sets', () => {
    expectS(next('goblet-chair-squat', 2, 3), 3, 10, 1, 'first_time');
  });
  it('carry from week 2 is 16 kg', () => {
    expect(next('suitcase-carry', 3, 2).weightKg).toBe(16);
  });
});

describe('week 1 -> week 2', () => {
  it('step-up 2x8 at 2x5 kg with reps reset', () => {
    const l = last('step-up', { sets: 2, target: 10, load: 0, week: 1 });
    const s = next('step-up', 2, 2, l);
    expectS(s, 2, 8, 1, 'start_load');
    expect(s.weightKg).toBe(10);
  });
});

describe('sets and amount', () => {
  it('week 2 -> 3 adds a set and keeps amount and load', () => {
    const l = last('goblet-chair-squat', { sets: 2, target: 11, load: 1 });
    expectS(next('goblet-chair-squat', 2, 3, l), 3, 11, 1, 'added_set');
  });
  it('2x8 ok -> 2x9', () => {
    const l = last('step-up', { sets: 2, target: 8, load: 1 });
    expectS(next('step-up', 2, 2, l), 2, 9, 1, 'increase_amount');
  });
  it('increase is capped at max', () => {
    const l = last('side-plank', { sets: 2, target: 28, load: 0 });
    expectS(next('side-plank', 2, 2, l), 2, 30, 0, 'increase_amount');
  });
  it('side plank steps 20 -> 25 -> 30', () => {
    const a = last('side-plank', { sets: 2, target: 20, load: 0 });
    expect(next('side-plank', 2, 2, a).target).toBe(25);
    const b = last('side-plank', { sets: 2, target: 25, load: 0 });
    expect(next('side-plank', 2, 2, b).target).toBe(30);
  });
  it('carry increases by 5 m', () => {
    const l = last('suitcase-carry', { sets: 3, target: 20, load: 1 });
    expectS(next('suitcase-carry', 3, 2, l), 3, 25, 1, 'increase_amount');
  });
});

describe('holds', () => {
  it('hard effort holds', () => {
    const l = last('step-up', { sets: 2, target: 8, load: 1, effort: 'hard' });
    expectS(next('step-up', 2, 2, l), 2, 8, 1, 'hold_hard');
  });
  it('7 of 8 holds', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 8,
      load: 1,
      amounts: [8, 7],
    });
    expectS(next('goblet-chair-squat', 2, 2, l), 2, 8, 1, 'hold_incomplete');
  });
  it('right 8 / left 7 holds', () => {
    const l = last('step-up', {
      sets: 2,
      target: 8,
      load: 1,
      amounts: [8, 8],
      left: [8, 7],
    });
    expectS(next('step-up', 2, 2, l), 2, 8, 1, 'hold_incomplete');
  });
  it('a missing side holds', () => {
    const l = last('step-up', { sets: 1, target: 8, load: 1 });
    l.logs = l.logs.filter((x) => x.side === 'right');
    expectS(next('step-up', 1, 2, l), 1, 8, 1, 'hold_incomplete');
  });
  it('a missing set holds', () => {
    const l = last('goblet-chair-squat', { sets: 2, target: 8, load: 1 });
    l.logs = l.logs.filter((x) => x.setNumber === 1);
    expectS(next('goblet-chair-squat', 2, 2, l), 2, 8, 1, 'hold_incomplete');
  });
  it('skipped holds', () => {
    const l = last('step-up', {
      sets: 2,
      target: 8,
      load: 1,
      skipped: true,
      noLogs: true,
    });
    expectS(next('step-up', 2, 2, l), 2, 8, 1, 'hold_incomplete');
  });
  it('exceeding the target is fine', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 10,
      load: 1,
      amounts: [12, 11],
    });
    expectS(next('goblet-chair-squat', 2, 2, l), 2, 11, 1, 'increase_amount');
  });
});

describe('top of the range', () => {
  it('at 12 with 2 sets, easy: waits for a third set', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 12,
      load: 1,
      effort: 'easy',
    });
    expectS(
      next('goblet-chair-squat', 2, 2, l),
      2,
      12,
      1,
      'hold_waiting_for_3_sets',
    );
  });
  it('3x12 ok holds; no effort recorded holds', () => {
    for (const effort of ['ok', undefined] as const) {
      const l = last('goblet-chair-squat', {
        sets: 3,
        target: 12,
        load: 1,
        effort,
      });
      expectS(
        next('goblet-chair-squat', 2, 3, l),
        3,
        12,
        1,
        'hold_not_easy_at_max',
      );
    }
  });
  it('3x12 easy goblet 10 -> 16 kg, reps back to 10', () => {
    const l = last('goblet-chair-squat', {
      sets: 3,
      target: 12,
      load: 1,
      effort: 'easy',
    });
    const s = next('goblet-chair-squat', 2, 3, l);
    expectS(s, 3, 10, 2, 'next_load');
    expect(s.weightKg).toBe(16);
  });
  it('3x12 easy step-up 2x5 -> 2x10 kg, reps back to 8', () => {
    const l = last('step-up', {
      sets: 3,
      target: 12,
      load: 1,
      effort: 'easy',
    });
    const s = next('step-up', 2, 3, l);
    expectS(s, 3, 8, 2, 'next_load');
    expect(s.weightKg).toBe(20);
  });
  it('max_level at goblet 16 kg and dead bug', () => {
    const g = last('goblet-chair-squat', {
      sets: 3,
      target: 12,
      load: 2,
      effort: 'easy',
    });
    expectS(next('goblet-chair-squat', 2, 3, g), 3, 12, 2, 'max_level');
    const d = last('dead-bug', {
      sets: 3,
      target: 12,
      load: 0,
      effort: 'easy',
    });
    expectS(next('dead-bug', 2, 3, d), 3, 12, 0, 'max_level');
  });
  it('side plank at 30 s is max_level', () => {
    const l = last('side-plank', {
      sets: 3,
      target: 30,
      load: 0,
      effort: 'easy',
    });
    expectS(next('side-plank', 2, 3, l), 3, 30, 0, 'max_level');
  });
  it('carry 3x30 easy: 10 -> 16 kg at 20 m; 16 kg is max_level', () => {
    const a = last('suitcase-carry', {
      sets: 3,
      target: 30,
      load: 0,
      effort: 'easy',
    });
    expectS(next('suitcase-carry', 3, 3, a), 3, 20, 1, 'next_load');
    const b = last('suitcase-carry', {
      sets: 3,
      target: 30,
      load: 1,
      effort: 'easy',
    });
    expectS(next('suitcase-carry', 3, 3, b), 3, 30, 1, 'max_level');
  });
  it('calf raise 3x12 easy steps to 10 kg at 12; waits at 2 sets', () => {
    const a = last('single-leg-calf-raise', {
      sets: 3,
      target: 12,
      load: 0,
      effort: 'easy',
    });
    expectS(next('single-leg-calf-raise', 2, 3, a), 3, 12, 1, 'next_load');
    const b = last('single-leg-calf-raise', {
      sets: 2,
      target: 12,
      load: 0,
      effort: 'easy',
    });
    expectS(
      next('single-leg-calf-raise', 2, 2, b),
      2,
      12,
      0,
      'hold_waiting_for_3_sets',
    );
  });
});

describe('pain gate', () => {
  it('warn on a knee-loaded exercise repeats exactly (no week 3 set)', () => {
    const l = last('split-squat', {
      sets: 2,
      target: 9,
      load: 1,
      pain: 'warn',
    });
    const s = next('split-squat', 2, 3, l);
    expectS(s, 2, 9, 1, 'pain_hold');
    expect(s.weightKg).toBe(10);
  });
  it('warn on bird dog progresses normally', () => {
    const l = last('bird-dog', { sets: 2, target: 8, load: 0, pain: 'warn' });
    expectS(next('bird-dog', 2, 2, l), 2, 9, 0, 'increase_amount');
  });
  it('stop on a knee-loaded exercise holds and flags the physio', () => {
    const l = last('split-squat', {
      sets: 2,
      target: 9,
      load: 1,
      pain: 'stop',
    });
    expectS(next('split-squat', 2, 2, l), 2, 9, 1, 'pain_stop_hold', true);
  });
  it('stop on a core exercise progresses normally', () => {
    const l = last('dead-bug', { sets: 2, target: 8, load: 0, pain: 'stop' });
    expectS(next('dead-bug', 2, 2, l), 2, 9, 0, 'increase_amount');
  });
  it('never lowers the load: holds at the logged load', () => {
    const l = last('split-squat', {
      sets: 2,
      target: 9,
      load: 1,
      loggedLoad: 2,
      pain: 'warn',
    });
    expectS(next('split-squat', 2, 2, l), 2, 9, 2, 'pain_hold');
  });
});

describe('knee-loaded additional exercises', () => {
  const kneeLoadedIds = [
    'goblet-squat',
    'kettlebell-deadlift',
    'dumbbell-rdl',
    'glute-bridge',
    'reverse-lunge',
    'forward-lunge',
    'kettlebell-swing',
    'half-squat',
    'hamstring-curl',
    'seated-knee-extension',
    'band-leg-press',
    'squat-curl',
    'thruster',
    'single-arm-thruster',
    'sumo-squat',
    'weighted-glute-bridge',
    'side-lunge',
    'walking-lunge',
  ] as const;

  it.each(kneeLoadedIds)(
    '%s repeats a completed dose after new knee symptoms',
    (id) => {
      const exercise = exercises[id];
      const previous = last(id, {
        sets: 2,
        target: exercise.range.start,
        load: 0,
        effort: 'easy',
      });
      expect(exercise.kneeLoaded).toBe(true);
      expect(suggestNext(exercise, 2, 2, previous, 'warn')).toMatchObject({
        sets: 2,
        target: exercise.range.start,
        loadIndex: 0,
        reason: 'pain_hold',
        seePhysio: false,
      });
      expect(suggestNext(exercise, 2, 2, previous, 'stop')).toMatchObject({
        sets: 2,
        target: exercise.range.start,
        loadIndex: 0,
        reason: 'pain_stop_hold',
        seePhysio: true,
      });
    },
  );

  it.each([
    'bent-over-row',
    'overhead-triceps-extension',
    'dumbbell-pullover',
  ] as const)('%s stays outside the knee pain gate', (id) => {
    const exercise = exercises[id];
    const previous = last(id, {
      sets: 2,
      target: exercise.range.start,
      load: 0,
      effort: 'easy',
    });
    expect(exercise.kneeLoaded).toBe(false);
    expect(suggestNext(exercise, 2, 2, previous, 'warn').reason).toBe(
      'increase_amount',
    );
  });
});

describe('logged load is the base', () => {
  it('logged load differs from the suggestion', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 10,
      load: 1,
      loggedLoad: 0,
    });
    expectS(next('goblet-chair-squat', 2, 2, l), 2, 11, 0, 'increase_amount');
  });
  it('uses the most recently logged set', () => {
    const l = last('goblet-chair-squat', { sets: 2, target: 10, load: 1 });
    (l.logs[0] as SetLog).loadIndex = 0;
    (l.logs[1] as SetLog).loadIndex = 2;
    expect(next('goblet-chair-squat', 2, 2, l).loadIndex).toBe(2);
  });
  it('falls back to the planned load when nothing was logged', () => {
    const l = last('goblet-chair-squat', {
      sets: 2,
      target: 10,
      load: 1,
      noLogs: true,
    });
    expectS(next('goblet-chair-squat', 2, 2, l), 2, 10, 1, 'hold_incomplete');
  });
});

describe('invariants', () => {
  // Small deterministic PRNG (mulberry32) so failures are reproducible.
  function rng(seed: number) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = <T>(r: () => number, xs: readonly T[]): T =>
    xs[Math.floor(r() * xs.length)] as T;

  it('changes at most one of sets/target/load, and load never decreases', () => {
    const r = rng(42);
    const ids = Object.keys(exercises) as ExerciseId[];
    const efforts: (Effort | undefined)[] = ['easy', 'ok', 'hard', undefined];
    const pains: PainStatus[] = ['ok', 'ok', 'warn', 'stop'];
    for (let i = 0; i < 4000; i++) {
      const id = pick(r, ids);
      const ex = exercises[id];
      const sets = pick(r, [1, 2, 3, 4]);
      const target =
        ex.range.start + Math.floor(r() * (ex.range.max - ex.range.start + 1));
      const load = Math.floor(r() * ex.loadLadder.length);
      const amounts = Array.from({ length: sets }, () =>
        r() < 0.8 ? target : target - 1,
      );
      const l = last(id, {
        sets,
        target,
        load,
        effort: pick(r, efforts),
        skipped: r() < 0.1,
        pain: pick(r, pains),
        week: pick(r, [1, 2, 2, 3]),
        amounts,
        loggedLoad:
          r() < 0.3 ? Math.floor(r() * ex.loadLadder.length) : undefined,
      });
      const base =
        l.logs.length > 0 ? (l.logs.at(-1)?.loadIndex ?? load) : load;
      const week = pick(r, [2, 3, 4, 8]);
      const tSets = pick(r, [2, 3]);
      const s = suggestNext(ex, tSets, week, l);

      const changed = [
        s.sets !== sets,
        s.target !== target,
        s.loadIndex !== base,
      ].filter(Boolean).length;
      // next_load/start_load are one load step: the amount resets with it.
      const allowed =
        s.reason === 'next_load' || s.reason === 'start_load' ? 2 : 1;
      expect(changed, `${id} ${s.reason}`).toBeLessThanOrEqual(allowed);
      if (s.reason === 'start_load') expect(s.sets).toBe(sets);
      if (s.reason === 'next_load') {
        expect(s.sets).toBe(sets);
        expect(s.target).toBe(ex.range.start);
        expect(s.loadIndex).toBe(base + 1);
      }
      expect(s.loadIndex).toBeGreaterThanOrEqual(base);
      expect(s.weightKg).toBe(ex.loadLadder[s.loadIndex]?.kg);
      expect(s.seePhysio).toBe(s.reason === 'pain_stop_hold');
    }
  });

  it('is pure: inputs are not mutated and results are repeatable', () => {
    const l = last('step-up', { sets: 3, target: 12, load: 1, effort: 'easy' });
    const exCopy = structuredClone(exercises['step-up']);
    const lCopy = structuredClone(l);
    const a = next('step-up', 2, 3, l);
    const b = next('step-up', 2, 3, l);
    expect(a).toEqual(b);
    expect(l).toEqual(lCopy);
    expect(exercises['step-up']).toEqual(exCopy);
  });
});

describe('logged order', () => {
  it('uses the latest loggedAt even when logs are unordered', () => {
    const l = last('goblet-chair-squat', { sets: 2, target: 10, load: 1 });
    (l.logs[0] as SetLog).loadIndex = 2;
    (l.logs[0] as SetLog).loggedAt = '2026-10-20T00:00:00Z';
    expect(next('goblet-chair-squat', 2, 2, l).loadIndex).toBe(2);
  });
});

describe('malformed content', () => {
  it('an out-of-range load index yields 0 kg instead of throwing', () => {
    const broken = { ...exercises['dead-bug'], week1LoadIndex: 9 };
    const s = suggestNext(broken, 2, 1);
    expect(s).toMatchObject({
      loadIndex: 9,
      weightKg: 0,
      reason: 'first_time',
    });
  });
});

describe('review fixes', () => {
  it('last session week 1 with warn/stop, now week 3: pain gate holds', () => {
    for (const pain of ['warn', 'stop'] as const) {
      const l = last('split-squat', {
        sets: 2,
        target: 8,
        load: 0,
        week: 1,
        pain,
      });
      const s = next('split-squat', 2, 3, l);
      expectS(
        s,
        2,
        8,
        0,
        pain === 'stop' ? 'pain_stop_hold' : 'pain_hold',
        pain === 'stop',
      );
    }
  });
  it('skipped with complete logs still holds', () => {
    const l = last('step-up', { sets: 2, target: 8, load: 1, skipped: true });
    expectS(next('step-up', 2, 2, l), 2, 8, 1, 'hold_incomplete');
  });
  it('start_load in week 3 keeps sets (added set comes next time)', () => {
    const l = last('step-up', { sets: 2, target: 10, load: 0, week: 1 });
    expectS(next('step-up', 2, 3, l), 2, 8, 1, 'start_load');
  });
  it('start_load never lowers a heavier logged load', () => {
    const l = last('step-up', {
      sets: 2,
      target: 8,
      load: 0,
      week: 1,
      loggedLoad: 2,
    });
    expectS(next('step-up', 2, 2, l), 2, 8, 2, 'start_load');
  });
  it('mixed loads in the logs hold instead of progressing', () => {
    const l = last('goblet-chair-squat', { sets: 2, target: 10, load: 1 });
    (l.logs[0] as SetLog).loadIndex = 0;
    (l.logs[0] as SetLog).loggedAt = '2026-01-01T00:00:00Z';
    expectS(next('goblet-chair-squat', 2, 2, l), 2, 10, 1, 'hold_incomplete');
  });
  it('logs of another exercise are ignored', () => {
    const l = last('step-up', {
      sets: 2,
      target: 8,
      load: 1,
      logsAs: 'bird-dog',
    });
    expectS(next('step-up', 2, 2, l), 2, 8, 1, 'hold_incomplete');
  });

  describe('currentPain (today before reading)', () => {
    const goblet = exercises['goblet-chair-squat'];
    const base = () =>
      last('goblet-chair-squat', {
        sets: 3,
        target: 12,
        load: 1,
        effort: 'easy',
      });
    it('warn blocks next_load, increase, added_set and start_load', () => {
      expect(suggestNext(goblet, 2, 2, base(), 'warn')).toMatchObject({
        loadIndex: 1,
        reason: 'pain_hold',
      });
      const sets2 = last('goblet-chair-squat', {
        sets: 2,
        target: 10,
        load: 1,
      });
      expect(suggestNext(goblet, 2, 3, sets2, 'warn')).toMatchObject({
        sets: 2,
        reason: 'pain_hold',
      });
      expect(suggestNext(goblet, 2, 2, sets2, 'warn')).toMatchObject({
        target: 10,
        reason: 'pain_hold',
      });
      const w1 = last('goblet-chair-squat', {
        sets: 2,
        target: 10,
        load: 0,
        week: 1,
      });
      expect(suggestNext(goblet, 2, 2, w1, 'warn')).toMatchObject({
        loadIndex: 0,
        reason: 'pain_hold',
      });
    });
    it('stop flags the physio', () => {
      expectS(
        suggestNext(goblet, 2, 2, base(), 'stop'),
        3,
        12,
        1,
        'pain_stop_hold',
        true,
      );
    });
    it('does not affect core exercises or an ok reading', () => {
      const d = last('dead-bug', { sets: 2, target: 8, load: 0 });
      expect(suggestNext(exercises['dead-bug'], 2, 2, d, 'warn').reason).toBe(
        'increase_amount',
      );
      expect(suggestNext(goblet, 2, 2, base(), 'ok').reason).toBe('next_load');
    });
    it('the worse of last and current wins', () => {
      const l = last('split-squat', {
        sets: 2,
        target: 8,
        load: 1,
        pain: 'stop',
      });
      expect(
        suggestNext(exercises['split-squat'], 2, 2, l, 'warn').reason,
      ).toBe('pain_stop_hold');
    });
    it('week 1 with a current stop flags the physio', () => {
      expect(
        suggestNext(exercises['split-squat'], 2, 1, undefined, 'stop')
          .seePhysio,
      ).toBe(true);
    });
  });
});

describe('knee-loaded exercise with no history and pain (S3)', () => {
  const goblet = exercises['goblet-chair-squat'];
  it('warn holds at the week-1 load and template sets', () => {
    const s = suggestNext(goblet, 2, 3, undefined, 'warn');
    expectS(s, 2, goblet.range.start, goblet.week1LoadIndex, 'pain_hold');
  });
  it('stop holds the same and asks for the physio', () => {
    const s = suggestNext(goblet, 2, 3, undefined, 'stop');
    expectS(
      s,
      2,
      goblet.range.start,
      goblet.week1LoadIndex,
      'pain_stop_hold',
      true,
    );
  });
  it('a non-knee exercise still gets the normal first-time plan', () => {
    const s = suggestNext(exercises['dead-bug'], 2, 3, undefined, 'stop');
    expect(s.reason).toBe('first_time');
    expect(s.seePhysio).toBe(false);
  });
  it('no pain keeps the start load', () => {
    expectS(suggestNext(goblet, 2, 3), 3, 10, 1, 'first_time');
  });
});

describe('auto-counted sets', () => {
  const autoLogs = (l: LastResult, early = false) => {
    l.logs = l.logs.map((x) => ({
      ...x,
      counting: 'auto' as const,
      ...(early ? { endedEarly: true, amount: x.amount - 1 } : {}),
    }));
    return l;
  };
  it('a skipped effort answer does not raise the amount for auto logs', () => {
    const manual = last('goblet-chair-squat', { sets: 2, target: 8, load: 1 });
    expect(next('goblet-chair-squat', 2, 2, manual).reason).toBe(
      'increase_amount',
    );
    const auto = next('goblet-chair-squat', 2, 2, autoLogs(manual));
    expect(auto.reason).toBe('hold_no_effort');
    expect(auto.target).toBe(8);
  });
  it('treats auto logs like manual logs', () => {
    const base = last('goblet-chair-squat', {
      sets: 2,
      target: 8,
      load: 1,
      effort: 'easy',
    });
    const manual = next('goblet-chair-squat', 2, 2, base);
    expect(next('goblet-chair-squat', 2, 2, autoLogs(base))).toEqual(manual);
  });
  it('an early stop blocks an increase', () => {
    const l = autoLogs(
      last('goblet-chair-squat', {
        sets: 2,
        target: 8,
        load: 1,
        effort: 'easy',
      }),
      true,
    );
    const s = next('goblet-chair-squat', 2, 2, l);
    expect(s.loadIndex).toBe(1);
    expect(s.target).toBeLessThanOrEqual(8);
  });
});
