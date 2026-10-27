import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { bodyRegions, exerciseMuscles } from '../content/muscles';
import { rehabAdditionIds } from '../content/rosterSlots';
import type {
  EquipmentChoice,
  TemplateId,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits } from './equipment';
import { allowedLevels, chooseVariant } from './levelPolicy';
import { initialTrainingRoster, regionsAvailable } from './programRosters';

const weights: TrainingPreferences['weights'] = [
  { type: 'dumbbell', kg: 4, count: 2 },
  { type: 'dumbbell', kg: 8, count: 2 },
  { type: 'dumbbell', kg: 12, count: 2 },
  { type: 'kettlebell', kg: 8, count: 1 },
  { type: 'kettlebell', kg: 12, count: 1 },
];
const bodyweight: EquipmentChoice[] = ['bodyweight', 'chair', 'support'];
const dumbbells: EquipmentChoice[] = [
  'bodyweight',
  'dumbbell-2',
  'chair',
  'support',
];
const everything: EquipmentChoice[] = [
  'bodyweight',
  'dumbbell-2',
  'kettlebell-1',
  'chair',
  'support',
  'step',
  'band',
  'pull-up-bar',
  'dip-bars',
];
const equipmentSets: [string, EquipmentChoice[]][] = [
  ['bodyweight', bodyweight],
  ['dumbbells', dumbbells],
  ['everything', everything],
];

describe('initial training roster', () => {
  it('is empty for rehab', () => {
    expect(
      initialTrainingRoster(
        { programId: 'rehab', experience: 'new', equipment: [] },
        'A',
      ),
    ).toEqual([]);
  });

  for (const programId of ['general', 'running'] as const)
    for (const experience of ['new', 'some', 'regular'] as const)
      for (const [name, equipment] of equipmentSets)
        for (const template of ['A', 'B'] as TemplateId[])
          it(`${programId} ${experience} ${name} ${template}: 3-6 unique exercises that fit`, () => {
            const preferences: TrainingPreferences = {
              programId,
              experience,
              equipment,
              weights,
            };
            const ids = initialTrainingRoster(preferences, template);
            expect(new Set(ids).size).toBe(ids.length);
            expect(ids.length).toBeGreaterThanOrEqual(3);
            expect(ids.length).toBeLessThanOrEqual(6);
            for (const id of ids) {
              expect(rehabAdditionIds.has(id)).toBe(false);
              const variant = chooseVariant(id, preferences);
              expect(variant).toBeDefined();
              expect(equipmentFits(variant?.equipment ?? [], equipment)).toBe(
                true,
              );
              // Running only swaps to allowed levels; general may use a flagged easiest fallback.
              if (programId === 'running')
                expect(allowedLevels(experience)).toContain(
                  variant?.technicalLevel,
                );
            }
          });

  it('starts running new on the easiest squat', () => {
    const ids = initialTrainingRoster(
      {
        programId: 'running',
        experience: 'new',
        equipment: everything,
        weights,
      },
      'A',
    );
    expect(ids[0]).toBe('goblet-chair-squat');
    expect(ids).not.toContain('single-leg-rdl');
    expect(ids).not.toContain('side-plank');
  });

  it('keeps the full running template for regular training', () => {
    const ids = initialTrainingRoster(
      {
        programId: 'running',
        experience: 'regular',
        equipment: everything,
        weights,
      },
      'A',
    );
    expect(ids).toContain('single-leg-rdl');
    expect(ids).toContain('side-plank');
  });

  it('includes the floor press for some experience with two dumbbells', () => {
    const ids = initialTrainingRoster(
      {
        programId: 'general',
        experience: 'some',
        equipment: dumbbells,
        weights,
      },
      'A',
    );
    expect(ids).toContain('floor-press');
  });

  it('gives a regular bodyweight user at least one technical exercise', () => {
    const ids = initialTrainingRoster(
      { programId: 'general', experience: 'regular', equipment: bodyweight },
      'A',
    );
    expect(
      ids.some((id) =>
        exerciseMetadata[id].variants.some(
          (variant) => variant.technicalLevel === 'technical',
        ),
      ),
    ).toBe(true);
  });

  it('leaves impact exercises out once symptoms are on record', () => {
    const ids = initialTrainingRoster(
      { programId: 'general', experience: 'regular', equipment: bodyweight },
      'A',
      { painOnRecord: true },
    );
    expect(ids).not.toContain('squat-jump');
    expect(ids).not.toContain('burpee');
  });

  it('falls back to bodyweight when a weighted exercise has no registered weight', () => {
    const ids = initialTrainingRoster(
      { programId: 'general', experience: 'some', equipment: dumbbells },
      'A',
    );
    expect(ids).not.toContain('floor-press');
    expect(ids).toContain('push-up');
  });

  describe('body-part focus', () => {
    const base: TrainingPreferences = {
      programId: 'general',
      experience: 'some',
      equipment: everything,
      weights,
      bodyParts: ['legs'],
    };
    const thin: TrainingPreferences = {
      ...base,
      experience: 'new',
      equipment: bodyweight,
      weights: undefined,
    };
    it('picks exercises that train the region and the two passes differ as sets (tiny pools may match)', () => {
      const a = initialTrainingRoster(base, 'A');
      const b = initialTrainingRoster(base, 'B');
      expect(a.length).toBeGreaterThanOrEqual(3);
      const legs = bodyRegions.find((region) => region.id === 'legs')?.muscles;
      for (const id of a)
        expect(
          exerciseMuscles[id].primary.some((muscle) => legs?.includes(muscle)),
        ).toBe(true);
      // A rich pool gives two different sets, not only a different order.
      expect([...a].sort().join()).not.toBe([...b].sort().join());
    });
    it('tops up a thin pool with whole-body picks', () => {
      const ids = initialTrainingRoster({ ...thin, bodyParts: ['arms'] }, 'A');
      expect(ids.length).toBeGreaterThanOrEqual(3);
    });
    it('returns nothing when no exercise matches', () => {
      expect(
        initialTrainingRoster({ ...thin, bodyParts: ['shoulders'] }, 'A'),
      ).toEqual([]);
    });
    it('lists the regions that have exercises', () => {
      const regions = regionsAvailable(thin);
      expect(regions).toContain('legs');
      expect(regions).not.toContain('shoulders');
    });
  });
});
