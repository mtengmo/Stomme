import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import type { EquipmentChoice } from '../domain/types';
import { equipmentFits } from './equipment';
import { type LibraryFilters, matchesLibraryFilters } from './libraryFilters';

const empty: LibraryFilters = {
  purpose: '',
  equipment: '',
  level: '',
  term: '',
};
const fits = (
  id: keyof typeof exercises,
  patch: Partial<LibraryFilters>,
  inventory: EquipmentChoice[] = [],
  mine = new Set<string>(),
) =>
  matchesLibraryFilters(exercises[id], { ...empty, ...patch }, inventory, mine);

describe('equipment and library filter contracts', () => {
  it('counts the chosen implements and does not let one dumbbell stand in for a pair or a kettlebell', () => {
    expect(
      equipmentFits([{ type: 'dumbbell', count: 2 }], ['dumbbell-1']),
    ).toBe(false);
    expect(
      equipmentFits([{ type: 'dumbbell', count: 2 }], ['dumbbell-2']),
    ).toBe(true);
    expect(
      equipmentFits([{ type: 'dumbbell', count: 1 }], ['dumbbell-2']),
    ).toBe(true);
    expect(
      equipmentFits([{ type: 'kettlebell', count: 1 }], ['dumbbell-2']),
    ).toBe(false);
    expect(equipmentFits([{ type: 'band', count: 1 }], ['bodyweight'])).toBe(
      false,
    );
    expect(equipmentFits([{ type: 'support', count: 1 }], ['chair'])).toBe(
      true,
    );
  });

  it('requires support and the implement together and allows genuine bodyweight entries', () => {
    expect(fits('step-up', { equipment: 'available' }, ['bodyweight'])).toBe(
      false,
    );
    expect(fits('step-up', { equipment: 'available' }, ['step'])).toBe(true);
    expect(
      fits('floor-press', { equipment: 'available' }, ['dumbbell-1']),
    ).toBe(false);
    expect(
      fits('floor-press', { equipment: 'available' }, ['dumbbell-2']),
    ).toBe(true);
    expect(fits('dead-bug', { equipment: 'available' }, [])).toBe(true);
  });

  it('keeps knee-source membership, running purpose and my programme independent', () => {
    expect(fits('half-squat', { purpose: 'knee' })).toBe(true);
    expect(fits('half-squat', { purpose: 'running' })).toBe(false);
    expect(
      fits('half-squat', { purpose: 'mine' }, [], new Set(['half-squat'])),
    ).toBe(true);
    expect(
      fits('half-squat', { purpose: 'mine' }, [], new Set(['step-up'])),
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
