import { describe, expect, it } from 'vitest';
import type { TechnicalLevel } from '../content/exerciseMetadata';
import { exerciseList, exercises } from '../content/exercises';
import type { Exercise, ExerciseId } from '../domain/types';
import {
  anyVariantFits,
  defaultSortMode,
  hasFittingVariant,
  latestLogByExercise,
  parseSortMode,
  type SortContext,
  sortExercises,
  sortLabels,
  sortReason,
} from './exerciseSort';

const named = (id: ExerciseId, name: string): Exercise => ({
  ...exercises[id],
  name,
});
const ids = (list: readonly Exercise[]) => list.map((exercise) => exercise.id);
const names = (list: readonly Exercise[]) =>
  list.map((exercise) => exercise.name);
const bodyweight = { equipment: ['bodyweight' as const] };
const rich = {
  equipment: [
    'bodyweight' as const,
    'chair' as const,
    'step' as const,
    'support' as const,
  ],
};
const base = (patch: Partial<SortContext> = {}): SortContext => ({
  mode: 'fit',
  inventory: bodyweight,
  experience: 'some',
  ...patch,
});

describe('parseSortMode', () => {
  it('accepts the four modes and falls back to the default', () => {
    for (const mode of ['fit', 'liked', 'name', 'recent'] as const)
      expect(parseSortMode(mode)).toBe(mode);
    expect(parseSortMode('popular')).toBe(defaultSortMode);
    expect(parseSortMode('toString')).toBe('fit');
    expect(parseSortMode('')).toBe('fit');
    expect(parseSortMode(null)).toBe('fit');
    expect(parseSortMode(undefined)).toBe('fit');
    expect(Object.values(sortLabels)).toEqual([
      'Passar mig',
      'Gillade först',
      'Namn A–Ö',
      'Senast tränade',
    ]);
  });
});

describe('name order', () => {
  it('sorts Swedish letters å, ä, ö after z and ties on E-number', () => {
    const list = [
      named('step-up', 'Öppna'),
      named('dead-bug', 'Zorro'),
      named('side-plank', 'Ärtor'),
      named('wall-sit', 'Åsa'),
      named('plank-arm-lift', 'Anna'),
    ];
    expect(names(sortExercises(list, base({ mode: 'name' })))).toEqual([
      'Anna',
      'Zorro',
      'Åsa',
      'Ärtor',
      'Öppna',
    ]);
    const same = [
      named('step-up', 'Lika'),
      named('goblet-chair-squat', 'Lika'),
    ];
    // E01 (goblet-chair-squat) before E02 (step-up) whatever the input order.
    const expected = ['goblet-chair-squat', 'step-up'];
    expect(ids(sortExercises(same, base({ mode: 'name' })))).toEqual(expected);
    expect(
      ids(sortExercises([...same].reverse(), base({ mode: 'name' }))),
    ).toEqual(expected);
  });

  it('never adds or drops exercises and does not mutate its input', () => {
    const input = exerciseList.slice(0, 12);
    const copy = [...input];
    for (const mode of ['fit', 'liked', 'name', 'recent'] as const) {
      const out = sortExercises(input, base({ mode }));
      expect(new Set(ids(out))).toEqual(new Set(ids(input)));
      expect(out).toHaveLength(input.length);
    }
    expect(input).toEqual(copy);
  });
});

describe('Passar mig: search relevance', () => {
  const list = [
    named('goblet-chair-squat', 'Stol'),
    named('step-up', 'Aaa med stol i namnet'),
    named('dead-bug', 'Stol'),
    named('side-plank', 'Bbb'),
  ];
  it('puts exact E-number first, then exact name, then name hits, then partial', () => {
    // side-plank is E05: found by exact E-number although its name differs.
    expect(
      sortExercises(list, base({ term: 'e05', inventory: rich }))[0]?.id,
    ).toBe('side-plank');
    expect(
      ids(sortExercises(list, base({ term: ' STOL ', inventory: rich }))),
    ).toEqual([
      'goblet-chair-squat', // exact name, E01
      'dead-bug', // exact name, E04
      'step-up', // name hit
      'side-plank', // other hit
    ]);
  });

  it('ranks an alias hit like a name hit, above other partial hits', () => {
    const out = sortExercises(
      [named('step-up', 'Aaa'), named('dead-bug', 'Zzz')],
      base({ term: 'dead bug' }),
    );
    expect(out[0]?.id).toBe('dead-bug');
  });

  it('without a profile uses search relevance, then A–Ö only', () => {
    const out = sortExercises(
      list,
      base({ term: 'stol', experience: undefined, favourites: ['side-plank'] }),
    );
    expect(ids(out)).toEqual([
      'goblet-chair-squat',
      'dead-bug',
      'step-up',
      'side-plank',
    ]);
    const none = sortExercises(
      [named('step-up', 'B'), named('dead-bug', 'A')],
      base({ experience: undefined, mine: new Set(['step-up']) }),
    );
    expect(ids(none)).toEqual(['dead-bug', 'step-up']);
  });

  it('an explicit sort ignores search relevance', () => {
    expect(
      names(sortExercises(list, base({ mode: 'name', term: 'e05' }))),
    ).toEqual(['Aaa med stol i namnet', 'Bbb', 'Stol', 'Stol']);
  });
});

describe('Passar mig: same-variant fit', () => {
  it('prefers exercises where one variant fits both equipment and level', () => {
    // goblet-squat: basic bodyweight variant; single-leg-rdl is technical only.
    const out = sortExercises(
      [named('single-leg-rdl', 'A först'), exercises['goblet-squat']],
      base({ experience: 'new' }),
    );
    expect(ids(out)).toEqual(['goblet-squat', 'single-leg-rdl']);
  });

  it('does not combine two variants into a false match', () => {
    const variant = (
      technicalLevel: TechnicalLevel,
      type: 'dumbbell' | 'kettlebell',
    ) => ({
      technicalLevel,
      equipment: [{ type, count: 1 }],
    });
    const dumbbells = {
      equipment: ['bodyweight' as const],
      weights: [{ type: 'dumbbell' as const, kg: 8, count: 2 as const }],
    };
    // Dumbbell variant fits the equipment but not a beginner's level; the
    // kettlebell variant is at level but not owned. Neither counts alone.
    const split = [
      variant('technical', 'dumbbell'),
      variant('basic', 'kettlebell'),
    ];
    expect(anyVariantFits(split, dumbbells, 'new')).toBe(false);
    expect(anyVariantFits(split, dumbbells, 'regular')).toBe(true);
    expect(
      anyVariantFits([variant('basic', 'dumbbell')], dumbbells, 'new'),
    ).toBe(true);
    expect(hasFittingVariant('goblet-squat', bodyweight, 'new')).toBe(true);
    expect(hasFittingVariant('single-leg-rdl', bodyweight, 'new')).toBe(false);
  });

  it('prefers favourites and own-workout exercises among equals', () => {
    const list = [
      named('step-up', 'A'),
      named('dead-bug', 'B'),
      named('side-plank', 'C'),
      named('plank-arm-lift', 'D'),
    ];
    const out = sortExercises(
      list,
      base({
        inventory: rich,
        favourites: ['side-plank'],
        mine: new Set(['dead-bug']),
      }),
    );
    expect(ids(out)).toEqual([
      'dead-bug',
      'side-plank',
      'step-up',
      'plank-arm-lift',
    ]);
    expect(names(sortExercises(list, base({ inventory: rich })))).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });
});

describe('Gillade först', () => {
  const list = [
    named('step-up', 'Bertil'),
    named('dead-bug', 'Åke'),
    named('side-plank', 'Adam'),
    named('plank-arm-lift', 'Cecilia'),
  ];
  it('splits liked and others, alphabetical in each part, and keeps the others', () => {
    const out = sortExercises(
      list,
      base({ mode: 'liked', favourites: ['dead-bug', 'plank-arm-lift'] }),
    );
    expect(names(out)).toEqual(['Cecilia', 'Åke', 'Adam', 'Bertil']);
  });
  it('is A–Ö with no likes', () => {
    expect(names(sortExercises(list, base({ mode: 'liked' })))).toEqual([
      'Adam',
      'Bertil',
      'Cecilia',
      'Åke',
    ]);
  });
});

describe('Senast tränade', () => {
  const list = [
    named('step-up', 'Bertil'),
    named('dead-bug', 'Adam'),
    named('side-plank', 'Cecilia'),
    named('plank-arm-lift', 'David'),
    named('wall-sit', 'Erik'),
  ];
  it('orders by the latest log, newest first, unlogged last A–Ö', () => {
    const lastLogged = new Map<ExerciseId, string>([
      ['step-up', '2026-10-01T10:00:00Z'],
      ['side-plank', '2026-10-20T10:00:00Z'],
      ['wall-sit', '2026-10-01T10:00:00Z'],
    ]);
    const out = sortExercises(list, base({ mode: 'recent', lastLogged }));
    expect(names(out)).toEqual([
      'Cecilia',
      'Bertil', // same time as Erik: alphabetical
      'Erik',
      'Adam',
      'David',
    ]);
  });
  it('is A–Ö with no history', () => {
    const expected = ['Adam', 'Bertil', 'Cecilia', 'David', 'Erik'];
    expect(names(sortExercises(list, base({ mode: 'recent' })))).toEqual(
      expected,
    );
    expect(
      names(
        sortExercises(list, base({ mode: 'recent', lastLogged: new Map() })),
      ),
    ).toEqual(expected);
  });
  it('takes the latest log per exercise from raw set logs', () => {
    const latest = latestLogByExercise([
      { exerciseId: 'step-up', loggedAt: '2026-10-02' },
      { exerciseId: 'step-up', loggedAt: '2026-10-05' },
      { exerciseId: 'step-up', loggedAt: '2026-10-03' },
      { exerciseId: 'dead-bug', loggedAt: '2026-09-01' },
    ]);
    expect(latest.get('step-up')).toBe('2026-10-05');
    expect(latest.get('dead-bug')).toBe('2026-09-01');
    expect(latest.size).toBe(2);
  });
});

describe('sortReason', () => {
  it('gives a plain reason only under "Passar mig" with a profile', () => {
    expect(sortReason('step-up', base({ favourites: ['step-up'] }))).toBe(
      'Favorit',
    );
    expect(sortReason('step-up', base())).toBeUndefined();
    expect(sortReason('push-up', base())).toBe('Passar din utrustning');
    expect(sortReason('push-up', base({ mode: 'name' }))).toBeUndefined();
    expect(
      sortReason('push-up', base({ experience: undefined })),
    ).toBeUndefined();
  });
});
