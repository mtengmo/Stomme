import { describe, expect, it } from 'vitest';
import {
  equipmentLabels,
  exerciseMetadata,
  purposeLabels,
  technicalLevelLabels,
} from '../content/exerciseMetadata';
import { exerciseList, exercises } from '../content/exercises';
import { bodyRegions, exerciseMuscles } from '../content/muscles';
import type { ExerciseId } from '../domain/types';
import { inventory as owned } from '../test/inventory';
import { equipmentFits, type Inventory } from './equipment';
import {
  type ExerciseFilters,
  emptyExerciseFilters,
  filterExercises,
  filterParamNames,
  filtersFromParams,
  filtersToParams,
  type LibraryFilters,
  matchesLibraryFilters,
  missingEquipment,
  requiresGoodTechnique,
} from './libraryFilters';

const empty: LibraryFilters = {
  purpose: '',
  equipment: '',
  level: '',
  term: '',
};
const fits = (
  id: keyof typeof exercises,
  patch: Partial<LibraryFilters>,
  inventory: Inventory = { equipment: [] },
  mine = new Set<string>(),
) =>
  matchesLibraryFilters(exercises[id], { ...empty, ...patch }, inventory, mine);

describe('equipment and library filter contracts', () => {
  it('counts the chosen implements and does not let one dumbbell stand in for a pair or a kettlebell', () => {
    expect(
      equipmentFits(
        [{ type: 'dumbbell', count: 2 }],
        owned({ dumbbells: [[5, 1]] }),
      ),
    ).toBe(false);
    expect(
      equipmentFits(
        [{ type: 'dumbbell', count: 2 }],
        owned({ dumbbells: [[5, 2]] }),
      ),
    ).toBe(true);
    expect(
      equipmentFits(
        [{ type: 'dumbbell', count: 1 }],
        owned({ dumbbells: [[5, 2]] }),
      ),
    ).toBe(true);
    expect(
      equipmentFits(
        [{ type: 'kettlebell', count: 1 }],
        owned({ dumbbells: [[5, 2]] }),
      ),
    ).toBe(false);
    expect(
      equipmentFits([{ type: 'band', count: 1 }], {
        equipment: ['bodyweight'],
      }),
    ).toBe(false);
    expect(
      equipmentFits([{ type: 'support', count: 1 }], { equipment: ['chair'] }),
    ).toBe(true);
  });

  it('requires support and the implement together and allows genuine bodyweight entries', () => {
    expect(
      fits(
        'step-up',
        { equipment: 'available' },
        { equipment: ['bodyweight'] },
      ),
    ).toBe(false);
    expect(
      fits('step-up', { equipment: 'available' }, { equipment: ['step'] }),
    ).toBe(true);
    expect(
      fits(
        'floor-press',
        { equipment: 'available' },
        owned({ dumbbells: [[5, 1]] }),
      ),
    ).toBe(false);
    expect(
      fits(
        'floor-press',
        { equipment: 'available' },
        owned({ dumbbells: [[5, 2]] }),
      ),
    ).toBe(true);
    expect(
      fits('dead-bug', { equipment: 'available' }, { equipment: [] }),
    ).toBe(true);
  });

  it('keeps knee-source membership, running purpose and my programme independent', () => {
    expect(fits('half-squat', { purpose: 'knee' })).toBe(true);
    expect(fits('half-squat', { purpose: 'running' })).toBe(false);
    expect(
      fits(
        'half-squat',
        { purpose: 'mine' },
        { equipment: [] },
        new Set(['half-squat']),
      ),
    ).toBe(true);
    expect(
      fits(
        'half-squat',
        { purpose: 'mine' },
        { equipment: [] },
        new Set(['step-up']),
      ),
    ).toBe(false);
  });

  it('combines search, purpose, equipment and technical level and supports stable reference searches', () => {
    expect(
      fits('band-leg-press', {
        term: 'E38',
        purpose: 'knee',
        equipment: 'band',
        level: 'practiced',
      }),
    ).toBe(true);
    expect(
      fits('band-leg-press', {
        term: 'E38',
        purpose: 'running',
        equipment: 'band',
        level: 'practiced',
      }),
    ).toBe(false);
    expect(fits('band-leg-press', { term: 'E38', equipment: 'dumbbell' })).toBe(
      false,
    );
    expect(fits('band-leg-press', { term: 'E38', level: 'basic' })).toBe(false);
    expect(fits('single-leg-rdl', { term: '  E03  ' })).toBe(true);
  });
});

describe('source and search filters', () => {
  it('limits to AAOS-sourced exercises and rejects others', () => {
    expect(fits('half-squat', { aaos: true })).toBe(true);
    expect(fits('farmer-carry', { aaos: true })).toBe(false);
  });
  it('rejects an exercise whose text does not contain the search term', () => {
    expect(fits('half-squat', { term: 'qqqqzzzz' })).toBe(false);
  });
});

describe('filterExercises', () => {
  const run = (patch: Partial<ExerciseFilters>, favourites?: string[]) =>
    filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, ...patch },
      {
        inventory: { equipment: ['bodyweight'] },
        favourites: favourites as never,
      },
    );
  const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

  it('returns everything as primary without filters', () => {
    const result = run({});
    expect(result.primary).toHaveLength(exerciseList.length);
    expect(result.supporting).toHaveLength(0);
  });
  it('splits a region into primary and supporting muscles', () => {
    const legs =
      bodyRegions.find((region) => region.id === 'legs')?.muscles ?? [];
    const result = run({ regions: ['legs'] });
    expect(result.primary.length).toBeGreaterThan(0);
    for (const item of result.primary)
      expect(
        exerciseMuscles[item.id].primary.some((m) => legs.includes(m)),
      ).toBe(true);
    for (const item of result.supporting) {
      const tags = exerciseMuscles[item.id];
      expect(tags.primary.some((m) => legs.includes(m))).toBe(false);
      expect(tags.secondary.some((m) => legs.includes(m))).toBe(true);
    }
  });
  it('unions several regions, independent of order', () => {
    const one = (id: string) =>
      bodyRegions.find((region) => region.id === id)?.muscles ?? [];
    const both = [...one('legs'), ...one('arms')];
    const ab = run({ regions: ['legs', 'arms'] });
    const ba = run({ regions: ['arms', 'legs'] });
    expect(ids(ab.primary)).toEqual(ids(ba.primary));
    expect(ids(ab.supporting)).toEqual(ids(ba.supporting));
    const legsOnly = run({ regions: ['legs'] });
    const armsOnly = run({ regions: ['arms'] });
    for (const item of [...legsOnly.primary, ...armsOnly.primary])
      expect(ids(ab.primary)).toContain(item.id);
    for (const item of ab.supporting) {
      const tags = exerciseMuscles[item.id];
      expect(tags.primary.some((m) => both.includes(m))).toBe(false);
      expect(tags.secondary.some((m) => both.includes(m))).toBe(true);
    }
    expect(ab.supporting.length).toBeGreaterThan(0);
  });
  it('filters on one muscle and ignores the region then', () => {
    const result = run({ muscle: 'calves', regions: ['arms'] });
    expect(ids(result.primary)).toContain('single-leg-calf-raise');
    for (const item of [...result.primary, ...result.supporting]) {
      const tags = exerciseMuscles[item.id];
      expect([...tags.primary, ...tags.secondary].includes('calves')).toBe(
        true,
      );
    }
  });
  it('filters on strength and mobility', () => {
    const mobility = run({ kind: 'mobility' }).primary;
    const strength = run({ kind: 'strength' }).primary;
    expect(mobility.length).toBeGreaterThan(0);
    expect(mobility.length + strength.length).toBe(exerciseList.length);
    expect(
      mobility.every((item) => exerciseMetadata[item.id].kind === 'mobility'),
    ).toBe(true);
  });
  it('filters on reps and time', () => {
    const time = run({ unit: 'time' }).primary;
    const reps = run({ unit: 'reps' }).primary;
    expect(time.length).toBeGreaterThan(0);
    expect(time.every((item) => item.unit === 'seconds')).toBe(true);
    expect(reps.every((item) => item.unit === 'reps')).toBe(true);
  });
  it('filters on one side at a time', () => {
    const result = run({ oneSide: true }).primary;
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.perSide)).toBe(true);
    expect(ids(result)).toContain('reverse-lunge');
  });
  it('combines filters', () => {
    const result = run({ oneSide: true, regions: ['legs'], unit: 'reps' });
    for (const item of [...result.primary, ...result.supporting]) {
      expect(item.perSide).toBe(true);
      expect(item.unit).toBe('reps');
    }
  });
  it('shows no favourites while they load and the listed ones after', () => {
    expect(run({ favouritesOnly: true }).primary).toHaveLength(0);
    expect(ids(run({ favouritesOnly: true }, ['dead-bug']).primary)).toEqual([
      'dead-bug',
    ]);
  });
  it('names the equipment a row lacks', () => {
    expect(
      missingEquipment('kettlebell-halo', { equipment: ['bodyweight'] }).length,
    ).toBeGreaterThan(0);
    expect(missingEquipment('dead-bug', { equipment: ['bodyweight'] })).toEqual(
      [],
    );
  });
});

describe('filter params and level fit', () => {
  it('round-trips filters through query parameters and ignores invalid values', () => {
    const patch: Partial<ExerciseFilters> = {
      term: 'knä',
      regions: ['legs'],
      kind: 'strength',
      oneSide: true,
      levelFit: true,
      equipment: 'available',
    };
    const params = filtersToParams(patch);
    expect(filtersFromParams(params)).toEqual({
      ...emptyExerciseFilters,
      aaos: false,
      ...patch,
    });
    expect(
      filtersFromParams('omrade=nonsense&muskel=x&niva=y&typ=z&sida=0'),
    ).toEqual({ ...emptyExerciseFilters, aaos: false });
    expect(filtersFromParams('omrade=legs').regions).toEqual(['legs']);
    expect(filtersFromParams('omrade=arms,legs,nope,legs').regions).toEqual(
      filtersFromParams('omrade=legs,arms').regions,
    );
    const two = filtersFromParams('omrade=arms,legs').regions;
    expect(two).toHaveLength(2);
    expect(two).toEqual(
      bodyRegions.map((r) => r.id).filter((id) => two.includes(id)),
    );
    expect(filtersToParams({ regions: [...two].reverse() }).get('omrade')).toBe(
      two.join(','),
    );
    expect(filtersToParams({ regions: [] }, 'omrade=legs').has('omrade')).toBe(
      false,
    );
    expect(filtersToParams({ term: '' }, 'sok=a&omrade=legs').toString()).toBe(
      'omrade=legs',
    );
  });

  it('hides exercises with no variant at the experience level only when levelFit is on', () => {
    const hard = exerciseList.find((exercise) =>
      requiresGoodTechnique(exercise.id, 'new'),
    );
    expect(hard).toBeDefined();
    const context = {
      inventory: { equipment: [] },
      experience: 'new' as const,
    };
    const on = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, levelFit: true },
      context,
    ).primary;
    const off = filterExercises(
      exerciseList,
      emptyExerciseFilters,
      context,
    ).primary;
    expect(on.length).toBeLessThan(off.length);
    expect(on.some((exercise) => exercise.id === hard?.id)).toBe(false);
    expect(off.some((exercise) => exercise.id === hard?.id)).toBe(true);
    expect(
      filterExercises(
        exerciseList,
        { ...emptyExerciseFilters, levelFit: true },
        { inventory: { equipment: [] } },
      ).primary,
    ).toHaveLength(off.length);
  });
});

describe('remaining filter branches', () => {
  it('parses purpose, equipment and level params and drops invalid ones', () => {
    const purpose = Object.keys(purposeLabels)[0];
    const equipment = Object.keys(equipmentLabels)[0];
    const level = Object.keys(technicalLevelLabels)[0];
    const p = filterParamNames;
    const parsed = filtersFromParams(
      `${p.purpose}=${purpose}&${p.equipment}=${equipment}&${p.level}=${level}`,
    );
    expect([parsed.purpose, parsed.equipment, parsed.level]).toEqual([
      purpose,
      equipment,
      level,
    ]);
    expect(filtersFromParams(`${p.purpose}=mine`).purpose).toBe('mine');
    expect(filtersFromParams(`${p.purpose}=zzz`).purpose).toBe('');
  });

  it('treats an unknown region as no muscles and an unfittable row as missing nothing', () => {
    const result = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, regions: ['nope' as never] },
      { inventory: { equipment: [] } },
    );
    expect(result.primary).toHaveLength(0);
    expect(result.supporting).toHaveLength(0);
  });
});

describe('missingEquipment without variants', () => {
  it('reports nothing missing for an exercise with no variants', () => {
    const id = exerciseList[0]?.id as ExerciseId;
    const original = exerciseMetadata[id].variants;
    exerciseMetadata[id].variants = [];
    try {
      expect(missingEquipment(id, { equipment: [] })).toEqual([]);
    } finally {
      exerciseMetadata[id].variants = original;
    }
  });
});
