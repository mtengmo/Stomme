import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { focusPresets, legMuscles } from '../content/focusPresets';
import { bodyRegions, exerciseMuscles } from '../content/muscles';
import { impactExercises, rehabAdditionIds } from '../content/rosterSlots';
import type {
  BodyRegionId,
  TemplateId,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits, type Inventory } from './equipment';
import { chooseVariant } from './levelPolicy';
import {
  buildRoster,
  focusAvailable,
  initialTrainingRoster,
} from './programRosters';

const weights: TrainingPreferences['weights'] = [
  { type: 'dumbbell', kg: 4, count: 2 },
  { type: 'dumbbell', kg: 8, count: 2 },
  { type: 'dumbbell', kg: 12, count: 2 },
  { type: 'kettlebell', kg: 8, count: 1 },
  { type: 'kettlebell', kg: 12, count: 1 },
];
const bodyweight: Inventory = {
  equipment: ['bodyweight', 'chair', 'support'],
};
const dumbbells: Inventory = {
  equipment: ['bodyweight', 'chair', 'support'],
  weights: weights.filter((item) => item.type === 'dumbbell'),
};
const everything: Inventory = {
  weights,
  equipment: [
    'bodyweight',
    'chair',
    'support',
    'step',
    'band',
    'pull-up-bar',
    'dip-bars',
  ],
};
const equipmentSets: [string, Inventory][] = [
  ['bodyweight', bodyweight],
  ['dumbbells', dumbbells],
  ['everything', everything],
];

describe('daily focus rosters', () => {
  for (const preset of focusPresets.filter((p) => p.id !== 'custom'))
    for (const experience of ['new', 'some', 'regular'] as const)
      for (const [name, inventory] of equipmentSets)
        for (const template of ['A', 'B'] as const)
          it(`${preset.id} ${experience} ${name} ${template} has safe unique choices`, () => {
            const preferences: TrainingPreferences = {
              programId: 'general',
              experience,
              ...inventory,
            };
            const roster = buildRoster(preferences, template, {
              focus: { id: preset.id },
              painOnRecord: true,
            });
            expect(roster.ids.length).toBeGreaterThanOrEqual(3);
            expect(roster.ids.length).toBeLessThanOrEqual(6);
            expect(new Set(roster.ids).size).toBe(roster.ids.length);
            for (const id of roster.ids) {
              expect(impactExercises.has(id)).toBe(false);
              expect(rehabAdditionIds.has(id)).toBe(false);
              expect(chooseVariant(id, preferences)).toBeDefined();
              if (preset.id === 'push')
                expect(
                  exerciseMuscles[id].primary.some((m) =>
                    legMuscles.includes(m),
                  ),
                ).toBe(false);
            }
          });
  it('explicit full ignores onboarding body parts and preserves the old full roster', () => {
    const preferences: TrainingPreferences = {
      programId: 'general',
      experience: 'some',
      ...everything,
    };
    for (const template of ['A', 'B'] as const)
      expect(
        buildRoster({ ...preferences, bodyParts: ['chest'] }, template, {
          focus: { id: 'full' },
        }),
      ).toEqual(buildRoster(preferences, template));
  });
  it('keeps rehabilitation isolated even with an explicit focus', () => {
    expect(
      buildRoster(
        { programId: 'rehab', experience: 'new', equipment: [] },
        'A',
        { focus: { id: 'push' } },
      ),
    ).toEqual({ ids: [], notes: {} });
  });
  it('makes sparse pull bodyweight top-up explicit and lists unavailable regions', () => {
    const preferences: TrainingPreferences = {
      programId: 'general',
      experience: 'new',
      equipment: ['bodyweight'],
    };
    expect(
      buildRoster(preferences, 'A', { focus: { id: 'pull' } }).note,
    ).toContain('Kompletterat');
    expect(focusAvailable(preferences).presets).toContain('push');
    expect(focusAvailable(preferences).regions).not.toContain('shoulders');
    expect(
      buildRoster(preferences, 'B', { focus: { id: 'push' } }).notes,
    ).not.toEqual({});
  });
});

describe('initial training roster', () => {
  it('is empty for rehab', () => {
    expect(
      initialTrainingRoster(
        { programId: 'rehab', experience: 'new', equipment: [] },
        'A',
      ),
    ).toEqual([]);
  });
  it('leaves an unknown region empty instead of inventing a workout', () => {
    const preferences: TrainingPreferences = {
      programId: 'general',
      experience: 'new',
      equipment: [],
      bodyParts: ['unknown' as BodyRegionId],
    };
    expect(initialTrainingRoster(preferences, 'A')).toEqual([]);
  });

  for (const programId of ['general'] as const)
    for (const experience of ['new', 'some', 'regular'] as const)
      for (const [name, owned] of equipmentSets)
        for (const template of ['A', 'B'] as TemplateId[])
          it(`${programId} ${experience} ${name} ${template}: 3-6 unique exercises that fit`, () => {
            const preferences: TrainingPreferences = {
              programId,
              experience,
              ...owned,
            };
            const ids = initialTrainingRoster(preferences, template);
            expect(new Set(ids).size).toBe(ids.length);
            expect(ids.length).toBeGreaterThanOrEqual(3);
            expect(ids.length).toBeLessThanOrEqual(6);
            for (const id of ids) {
              expect(rehabAdditionIds.has(id)).toBe(false);
              const variant = chooseVariant(id, preferences);
              expect(variant).toBeDefined();
              expect(equipmentFits(variant?.equipment ?? [], owned)).toBe(true);
            }
          });

  it('includes the floor press for some experience with two dumbbells', () => {
    const ids = initialTrainingRoster(
      {
        programId: 'general',
        experience: 'some',
        equipment: dumbbells.equipment,
        weights,
      },
      'A',
    );
    expect(ids).toContain('floor-press');
  });

  it('gives a regular bodyweight user at least one technical exercise', () => {
    const ids = initialTrainingRoster(
      { programId: 'general', experience: 'regular', ...bodyweight },
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
      { programId: 'general', experience: 'regular', ...bodyweight },
      'A',
      { painOnRecord: true },
    );
    expect(ids).not.toContain('squat-jump');
    expect(ids).not.toContain('burpee');
    expect(ids).not.toContain('blast-off-push-up');
    expect(impactExercises.has('blast-off-push-up')).toBe(true);
  });

  it('falls back to bodyweight when a weighted exercise has no registered weight', () => {
    const ids = initialTrainingRoster(
      { programId: 'general', experience: 'some', ...bodyweight },
      'A',
    );
    expect(ids).not.toContain('floor-press');
    expect(ids).toContain('knee-push-up');
  });

  describe('body-part focus', () => {
    const base: TrainingPreferences = {
      programId: 'general',
      experience: 'some',
      equipment: everything.equipment,
      weights,
      bodyParts: ['legs'],
    };
    const thin: TrainingPreferences = {
      ...base,
      experience: 'new',
      ...bodyweight,
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
      const regions = focusAvailable(thin).regions;
      expect(regions).toContain('legs');
      expect(regions).not.toContain('shoulders');
    });
  });
});

describe('basic push-ups and calf raise in the rosters', () => {
  const rosterFor = (
    experience: TrainingPreferences['experience'],
    template: TemplateId = 'A',
  ) =>
    buildRoster({ programId: 'general', experience, ...bodyweight }, template);

  it('gives new users knee push-ups without the easiest-only note', () => {
    const roster = rosterFor('new');
    expect(roster.ids).toContain('knee-push-up');
    expect(roster.notes['knee-push-up']).toBeUndefined();
  });

  it('gives regular users an advanced push-up with a same-slot fallback', () => {
    const ids = buildRoster(
      {
        programId: 'general',
        experience: 'regular',
        equipment: everything.equipment,
      },
      'A',
    ).ids;
    expect(ids).not.toContain('knee-push-up');
    expect(ids).toContain('decline-push-up');
    expect(
      buildRoster(
        {
          programId: 'general',
          experience: 'regular',
          equipment: ['bodyweight'],
        },
        'A',
      ).ids,
    ).toContain('diamond-push-up');
    for (const experience of ['new', 'some'] as const) {
      const roster = rosterFor(experience);
      expect(roster.ids).toContain('knee-push-up');
      expect(roster.ids).not.toContain('decline-push-up');
      expect(roster.ids).not.toContain('diamond-push-up');
    }
  });

  it('never rosters wall push-up or crunch', () => {
    for (const experience of ['new', 'some', 'regular'] as const)
      for (const template of ['A', 'B'] as const)
        for (const programId of ['general'] as const) {
          const ids = buildRoster(
            { programId, experience, equipment: everything.equipment },
            template,
          ).ids;
          expect(ids).not.toContain('wall-push-up');
          expect(ids).not.toContain('crunch');
          expect(ids).not.toContain('blast-off-push-up');
        }
  });
});
