import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { inventory } from '../test/inventory';
import {
  isTrainingPreferences,
  isWorkoutEquipment,
  rehabGroup,
  rehabGroupOf,
  trainingName,
  withWorkoutEquipment,
} from './programmes';

const base: TrainingPreferences = {
  programId: 'rehab',
  experience: 'new',
  equipment: ['bodyweight'],
};

describe('rehab groups', () => {
  it('maps every focus to exactly one group', () => {
    expect(rehabGroup(base)).toBe('custom');
    expect(rehabGroup({ rehabFocus: 'custom' })).toBe('custom');
    expect(rehabGroup({ rehabFocus: 'knee' })).toBe('aaos');
    expect(rehabGroup({ rehabFocus: 'knee-physio' })).toBe('physio');
    expect(rehabGroupOf(undefined)).toBe('custom');
    expect(rehabGroupOf('knee-physio')).toBe('physio');
  });

  it('validates preferences for each focus and rejects unknown ones', () => {
    for (const rehabFocus of ['custom', 'knee', 'knee-physio'] as const)
      expect(isTrainingPreferences({ ...base, rehabFocus })).toBe(true);
    expect(isTrainingPreferences(base)).toBe(true);
    expect(isTrainingPreferences({ ...base, rehabFocus: 'hip' })).toBe(false);
  });

  it('names every training kind', () => {
    expect(trainingName({ programId: 'rehab', rehabFocus: 'knee' })).toBe(
      'Knärehab · AAOS',
    );
    expect(
      trainingName({ programId: 'rehab', rehabFocus: 'knee-physio' }),
    ).toBe('Knärehab · Fysioterapeutens program');
    expect(trainingName({ programId: 'rehab', rehabFocus: 'custom' })).toBe(
      'Mitt rehabprogram',
    );
    expect(trainingName({ programId: 'general' })).toBe('Allmän styrka');
    expect(trainingName({})).toBe('Knä och löpning · ursprungligt program');
  });
});

describe('adjustable and workout equipment', () => {
  it('accepts explicit adjustable settings and rejects malformed or duplicate sets', () => {
    const adjustableWeights = [
      {
        type: 'dumbbell' as const,
        count: 2 as const,
        settingsKg: [5, 7.5, 10],
      },
    ];
    expect(isTrainingPreferences({ ...base, adjustableWeights })).toBe(true);
    expect(
      isTrainingPreferences({
        ...base,
        adjustableWeights: [{ ...adjustableWeights[0], settingsKg: [] }],
      }),
    ).toBe(false);
    expect(
      isTrainingPreferences({
        ...base,
        adjustableWeights: [{ ...adjustableWeights[0], settingsKg: [5, 5] }],
      }),
    ).toBe(false);
    expect(
      isTrainingPreferences({
        ...base,
        adjustableWeights: [{ ...adjustableWeights[0], settingsKg: [0] }],
      }),
    ).toBe(false);
    expect(
      isTrainingPreferences({
        ...base,
        adjustableWeights: [adjustableWeights[0], adjustableWeights[0]],
      }),
    ).toBe(false);
  });

  it('validates a full workout snapshot and detaches it from home preferences', () => {
    const equipment = {
      ...inventory({ dumbbells: [[5, 2]] }),
      weights: [{ type: 'dumbbell' as const, kg: 8, count: 2 as const }],
      adjustableWeights: [
        { type: 'dumbbell' as const, count: 2 as const, settingsKg: [5, 10] },
      ],
    };
    expect(isWorkoutEquipment(equipment)).toBe(true);
    expect(
      isWorkoutEquipment({
        ...equipment,
        equipment: ['bodyweight', 'bodyweight'],
      }),
    ).toBe(false);
    expect(isWorkoutEquipment({ ...equipment, unexpected: true })).toBe(false);
    expect(isWorkoutEquipment(null)).toBe(false);
    const effective = withWorkoutEquipment(base, equipment);
    expect(effective.equipment).toEqual(equipment.equipment);
    expect(effective.adjustableWeights).toEqual(equipment.adjustableWeights);
    equipment.adjustableWeights[0]?.settingsKg.push(20);
    expect(effective.adjustableWeights?.[0]?.settingsKg).toEqual([5, 10]);
    expect(base.equipment).toEqual(['bodyweight']);
    expect(withWorkoutEquipment(base)).toBe(base);
  });
});
