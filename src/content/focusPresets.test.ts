import { describe, expect, it } from 'vitest';
import { buildRoster } from '../rules/programRosters';
import { exerciseMetadata } from './exerciseMetadata';
import { focusPresets, focusTargets } from './focusPresets';
import { exerciseMuscles } from './muscles';
import { focusSlots, rehabAdditionIds } from './rosterSlots';

describe('curated focus candidates', () => {
  it('keeps library and rehabilitation additions out and targets every candidate', () => {
    const excluded = [
      'bosu-squat',
      'copenhagen-hold',
      'nordic-hamstring-curl',
      'bent-knee-calf-hold',
      'wall-tibialis-raise',
      'seated-tibial-rotation',
      'wall-push-up',
      'crunch',
    ];
    for (const slot of focusSlots)
      for (const id of slot.candidates) {
        expect(rehabAdditionIds.has(id)).toBe(false);
        expect(excluded).not.toContain(id);
        expect(
          exerciseMuscles[id].primary.some((m) => slot.targets.includes(m)),
        ).toBe(true);
        expect(exerciseMetadata[id]).toBeDefined();
      }
  });
  it('maps custom regions without duplicates and allows all preset focuses with bodyweight', () => {
    expect(focusTargets({ id: 'custom', regions: ['arms', 'chest'] })).toEqual([
      'chest',
      'biceps',
      'triceps',
      'forearms',
    ]);
    expect(focusTargets({ id: 'custom' })).toEqual([]);
    for (const preset of focusPresets.filter((p) => p.id !== 'custom')) {
      const roster = buildRoster(
        { programId: 'general', experience: 'new', equipment: ['bodyweight'] },
        'A',
        { focus: { id: preset.id } },
      );
      expect(roster.ids.length).toBeGreaterThanOrEqual(3);
    }
  });
});
