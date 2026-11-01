import { describe, expect, it } from 'vitest';
import { equipmentFits } from '../rules/equipment';
import {
  allowedLevels,
  heavyStartAllowed,
  movementSlots,
} from '../rules/levelPolicy';
import { repTempo } from '../rules/repTempo';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseSideCue } from './exerciseSideCues';
import { exercises } from './exercises';
import { kneeRehabExercises } from './kneeRehab';
import { kneeStrengthExercises } from './kneeStrengthExercises';
import {
  equipmentChoices,
  isTrainingPreferences,
  isWorkoutEquipment,
} from './programmes';
import { generalSlots } from './rosterSlots';

describe('knee strength catalogue contracts', () => {
  it('keeps editorial tibial rotation bilateral, knee-loaded and outside automatic rosters', () => {
    const id = 'seated-tibial-rotation';
    expect(exercises[id]).toMatchObject({
      perSide: false,
      kneeLoaded: true,
      range: { start: 10, max: 20, step: 2 },
    });
    expect(exerciseMetadata[id].reviewedAt).toBe('2026-11-01');
    expect(exerciseMetadata[id].variants[0]).toMatchObject({
      technicalLevel: 'basic',
      equipment: [
        { type: 'bodyweight', count: 1 },
        { type: 'chair', count: 1 },
        { type: 'band', count: 1 },
      ],
    });
    expect(movementSlots[id]).toBeUndefined();
    expect(JSON.stringify(generalSlots)).not.toContain(id);
    expect(kneeRehabExercises.map((e) => e.id)).not.toContain(id);
  });
  it('keeps step-down as a library-only, knee-loaded per-leg exercise', () => {
    const id = 'step-down';
    expect(exercises[id]).toMatchObject({
      perSide: true,
      sideKind: 'ben',
      kneeLoaded: true,
      range: { start: 6, max: 10, step: 1 },
    });
    expect(exerciseMetadata[id].easierExerciseId).toBe('step-up');
    expect(exerciseMetadata['step-up'].harderExerciseId).toBe(id);
    expect(exerciseMetadata[id].reviewedAt).toBe('2026-11-01');
    expect(movementSlots[id]).toBeUndefined();
    expect(JSON.stringify(generalSlots)).not.toContain(id);
    expect(kneeRehabExercises.map((e) => e.id)).not.toContain(id);
    for (const ref of ['E85', 'E86', 'E89', 'E97'])
      expect(Object.values(exerciseReferences)).not.toContain(ref);
  });
  it('adds stable references with editable doses and bodyweight only', () => {
    expect(
      kneeStrengthExercises.map((e) => exerciseReferences[e.id]).sort(),
    ).toEqual(['E90', 'E91', 'E92', 'E93', 'E94', 'E96', 'E98']);
    expect(exercises['wall-sit'].range.start).toBe(30);
    expect(exerciseReferences['wall-sit']).toBe('E11');
    expect(exerciseReferences['bench-side-plank-leg-lift']).toBe('E42');
    for (const e of kneeStrengthExercises) {
      expect(e.loadLadder.map((load) => load.kg)).toEqual([0]);
      expect(heavyStartAllowed(e.id)).toBe(false);
      expect(exerciseMetadata[e.id].sources[0]?.note).toContain('redigerbara');
      if (e.id === 'seated-tibial-rotation') {
        expect(exerciseMetadata[e.id].sources[0]?.url).toBeUndefined();
        expect(exerciseMetadata[e.id].sources[0]?.note).toContain(
          'utan verifierad extern källa',
        );
      } else expect(exerciseMetadata[e.id].sources[0]?.url).toMatch(/^https:/);
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
