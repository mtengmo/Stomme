import { describe, expect, it } from 'vitest';
import { beginnerExerciseIds } from '../content/beginnerSet';
import { focusTargets } from '../content/focusPresets';
import type {
  ExerciseId,
  ProgramEmphasis,
  TrainingPreferences,
} from '../domain/types';
import { addDays, weekdayIndex } from '../lib/dates';
import {
  buildProgram,
  type DaysPerWeek,
  programFocusPlan,
  weekdaysFor,
} from './programPlan';
import { readyProgramPass } from './readyProgramPass';
import { adjacent, overlaps } from './weekSuggestion';

const emphases: ProgramEmphasis[] = ['full', 'run', 'upper'];
const days: DaysPerWeek[] = [1, 2, 3, 4, 5];
const combos = emphases.flatMap((e) => days.map((d) => [e, d] as const));
const home: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight', 'chair', 'support'],
};
const make = (
  over: Partial<Parameters<typeof buildProgram>[0]> = {},
  preferences: TrainingPreferences = home,
) =>
  buildProgram({
    preferences,
    daysPerWeek: 2,
    emphasis: 'run',
    startDate: '2026-11-03',
    now: '2026-11-03T08:00:00.000Z',
    id: 'prog-1',
    pool: beginnerExerciseIds,
    ...over,
  });
const pool = (ids: ExerciseId[]) => new Set<ExerciseId>(ids);

/** Compact "focus+template" strings, as in the plan table. */
const shape = (p: ReturnType<typeof make>) =>
  p?.passes.map((x) => `${x.focus}${x.template}`).join(' ');

describe('programFocusPlan', () => {
  const expected: Record<ProgramEmphasis, Record<DaysPerWeek, string>> = {
    full: {
      1: 'fullA',
      2: 'fullA fullB',
      3: 'fullA fullB fullA',
      4: 'upperA lowerA upperB lowerB',
      5: 'pushA pullA legsA upperA lowerA',
    },
    run: {
      1: 'fullA',
      2: 'lowerA fullB',
      3: 'lowerA upperA lowerB',
      4: 'lowerA upperA lowerB upperB',
      5: 'lowerA pushA pullA lowerB upperA',
    },
    upper: {
      1: 'fullA',
      2: 'upperA fullB',
      3: 'upperA lowerA upperB',
      4: 'pushA pullA lowerA upperA',
      5: 'pushA pullA legsA upperA lowerA',
    },
  };

  it.each(combos)('%s, %i days matches the plan table', (emphasis, d) => {
    const row = programFocusPlan[emphasis][d];
    expect(row.map((x) => `${x.focus}${x.template}`).join(' ')).toBe(
      expected[emphasis][d],
    );
    expect(shape(make({ emphasis, daysPerWeek: d }))).toBe(
      expected[emphasis][d],
    );
  });

  it.each(combos)(
    '%s, %i days: neighbours share no muscle but core, also across the week turn',
    (emphasis, d) => {
      const row = programFocusPlan[emphasis][d];
      const muscles = row.map((x) =>
        focusTargets({ id: x.focus }).filter((m) => m !== 'core'),
      );
      for (let start = 0; start < 7; start++) {
        const weekdays = weekdaysFor(addDays('2026-11-02', start), d);
        for (let i = 0; i < d; i++)
          for (let j = i + 1; j < d; j++)
            if (adjacent(weekdays[i] as number, weekdays[j] as number))
              expect(
                overlaps(muscles[i] ?? [], muscles[j] ?? []),
                `${emphasis} ${d} ${row[i]?.focus}/${row[j]?.focus}`,
              ).toBe(false);
      }
    },
  );

  it('gives the running row at most two leg passes', () => {
    for (const d of days) {
      const legs = programFocusPlan.run[d].filter(
        (x) => x.focus === 'lower' || x.focus === 'legs',
      );
      expect(legs.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('weekdaysFor', () => {
  it('puts pass 1 on the start date for every weekday', () => {
    for (let i = 0; i < 7; i++) {
      const date = addDays('2026-11-02', i);
      for (const d of days) {
        const weekdays = weekdaysFor(date, d);
        expect(weekdays[0]).toBe(weekdayIndex(date) + 1);
        expect(weekdays).toHaveLength(d);
        expect(new Set(weekdays).size).toBe(d);
        expect(weekdays.every((w) => w >= 1 && w <= 7)).toBe(true);
      }
    }
  });

  it('spaces the passes like the week templates', () => {
    expect(weekdaysFor('2026-11-03', 3)).toEqual([2, 4, 6]);
    expect(weekdaysFor('2026-11-06', 2)).toEqual([5, 1]);
  });
});

describe('buildProgram', () => {
  it('returns null for rehab', () => {
    expect(make({}, { ...home, programId: 'rehab' })).toBeNull();
  });

  it('builds a curated block 1 with unique exercises', () => {
    const program = make({ emphasis: 'full', daysPerWeek: 3 });
    expect(program).toMatchObject({
      id: 'prog-1',
      block: 1,
      createdAt: '2026-11-03T08:00:00.000Z',
      startDate: '2026-11-03',
      daysPerWeek: 3,
      emphasis: 'full',
      weekdays: [2, 4, 6],
      curated: true,
    });
    for (const pass of program?.passes ?? []) {
      expect(new Set(pass.exerciseIds).size).toBe(pass.exerciseIds.length);
      expect(pass.exerciseIds.every((id) => beginnerExerciseIds.has(id))).toBe(
        true,
      );
    }
  });

  it('uses the whole library without a pool and keeps the block number', () => {
    const program = make({ pool: undefined, block: 2 });
    expect(program).toMatchObject({ block: 2, curated: false });
    expect(program?.passes).toHaveLength(2);
  });

  it('fills a `new` bodyweight home from the set without any warning', () => {
    const program = make(
      { emphasis: 'upper', daysPerWeek: 4 },
      { ...home, experience: 'new' },
    );
    expect(program?.passes.every((p) => p.exerciseIds.length >= 4)).toBe(true);
  });

  describe('reserve chain', () => {
    it('keeps the table row when every pass is large enough', () => {
      expect(shape(make())).toBe('lowerA fullB');
    });

    it('falls back to upper and lower body in turn', () => {
      const p = pool([
        'goblet-chair-squat',
        'knee-push-up',
        'plank',
        'push-up',
        'side-plank',
        'split-squat',
        'triceps-kickback',
      ]);
      expect(shape(make({ pool: p }))).toBe('lowerA upperA');
    });

    it('starts that row with upper body at five days and repeats as B', () => {
      const p = pool([
        'back-extension',
        'dead-bug',
        'plank',
        'side-plank',
        'split-squat',
        'supported-row',
        'wall-sit',
      ]);
      expect(shape(make({ pool: p, daysPerWeek: 5, emphasis: 'full' }))).toBe(
        'upperA lowerA upperB lowerB upperA',
      );
    });

    it('falls back to whole body A and B in turn', () => {
      const p = pool(['back-extension', 'plank', 'side-plank', 'wall-push-up']);
      expect(shape(make({ pool: p }))).toBe('fullA fullB');
      const five = pool([
        'back-extension',
        'glute-bridge',
        'goblet-chair-squat',
        'plank',
        'push-up',
        'wall-sit',
      ]);
      expect(
        shape(make({ pool: five, daysPerWeek: 5, emphasis: 'full' })),
      ).toBe('fullA fullB fullA fullB fullA');
    });

    it('returns null when not even whole body reaches four exercises', () => {
      expect(
        make({ pool: pool(['dead-bug', 'push-up', 'supported-row']) }),
      ).toBeNull();
    });
  });
});

describe('buildProgram with a ready pass', () => {
  const readyPass = readyProgramPass('running-strength', home) as NonNullable<
    ReturnType<typeof readyProgramPass>
  >;
  it('is only the ready pass for one day', () => {
    const p = make({ daysPerWeek: 1, ready: readyPass });
    expect(p?.passes).toEqual([readyPass]);
    expect(p?.passes[0]?.exerciseIds).not.toContain('knee-push-up');
  });
  it('keeps the ready pass as pass 1 for 2-5 days', () => {
    for (const d of [2, 3, 4, 5] as const) {
      const p = make({ daysPerWeek: d, ready: readyPass });
      expect(p?.passes).toHaveLength(d);
      expect(p?.passes[0]).toEqual(readyPass);
      expect(p?.passes[1]?.ready).toBeUndefined();
    }
  });
  it('keeps it in the fallback rows', () => {
    const p = pool(['back-extension', 'plank', 'side-plank', 'wall-push-up']);
    const built = make({ pool: p, ready: readyPass });
    expect(built?.passes[0]).toEqual(readyPass);
    expect(shape(built)).toBe('lowerA fullB');
  });
});
