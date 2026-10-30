import { describe, expect, it } from 'vitest';
import { equipmentFits } from '../rules/equipment';
import { allowedLevels, heavyStartAllowed } from '../rules/levelPolicy';
import { repTempo } from '../rules/repTempo';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseSideCue } from './exerciseSideCues';
import { exercises } from './exercises';
import { kneeStrengthExercises } from './kneeStrengthExercises';
import {
  equipmentChoices,
  isTrainingPreferences,
  isWorkoutEquipment,
} from './programmes';

describe('knee strength catalogue contracts', () => {
  it('adds five stable references with editable doses and bodyweight only', () => {
    expect(kneeStrengthExercises.map((e) => exerciseReferences[e.id])).toEqual([
      'E90',
      'E91',
      'E92',
      'E93',
      'E94',
    ]);
    expect(exercises['wall-sit'].range.start).toBe(30);
    expect(exerciseReferences['wall-sit']).toBe('E11');
    expect(exerciseReferences['bench-side-plank-leg-lift']).toBe('E42');
    for (const e of kneeStrengthExercises) {
      expect(e.loadLadder.map((load) => load.kg)).toEqual([0]);
      expect(heavyStartAllowed(e.id)).toBe(false);
      expect(exerciseMetadata[e.id].sources[0]?.note).toContain('redigerbara');
      expect(exerciseMetadata[e.id].sources[0]?.url).toMatch(/^https:/);
    }
    expect(repTempo('nordic-hamstring-curl')).toBeNull();
    expect(exercises['nordic-hamstring-curl'].range).toEqual({
      start: 3,
      max: 6,
      step: 1,
    });
    expect(exercises['wall-tibialis-raise'].range).toEqual({
      start: 15,
      max: 25,
      step: 1,
    });
    expect(exercises['copenhagen-hold'].unit).toBe('seconds');
    expect(exercises['bent-knee-calf-hold'].unit).toBe('seconds');
    expect(exerciseSideCue('copenhagen-hold', 'left')?.label).toContain(
      'knä överst',
    );
  });
  it('requires explicit specialty gear, supports complete inventory and respects levels', () => {
    const all = Object.keys(
      equipmentChoices,
    ) as (keyof typeof equipmentChoices)[];
    const pref = {
      programId: 'general',
      experience: 'regular',
      equipment: all,
    } as const;
    expect(isTrainingPreferences(pref)).toBe(true);
    expect(isWorkoutEquipment({ equipment: all })).toBe(true);
    expect(all).toHaveLength(10);
    for (const e of kneeStrengthExercises) {
      const variant = exerciseMetadata[e.id].variants[0];
      if (!variant) throw new Error(e.id);
      expect(equipmentFits(variant.equipment, { equipment: all })).toBe(true);
      if (!variant) throw new Error(e.id);
      expect(
        equipmentFits(variant.equipment, { equipment: ['bodyweight'] }),
      ).toBe(false);
    }
    expect(
      equipmentFits(
        exerciseMetadata['copenhagen-hold'].variants[0]?.equipment ?? [],
        { equipment: ['chair', 'support'] },
      ),
    ).toBe(false);
    expect(allowedLevels('new')).not.toContain(
      exerciseMetadata['nordic-hamstring-curl'].variants[0]?.technicalLevel,
    );
  });
});
