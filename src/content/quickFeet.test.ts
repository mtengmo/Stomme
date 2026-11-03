import { describe, expect, it } from 'vitest';
import type { BodyRegionId, ExerciseId, TemplateId } from '../domain/types';
import { favouriteAlternatives } from '../rules/favouriteSuggestions';
import { movementSlots, startingSeconds } from '../rules/levelPolicy';
import { emptyExerciseFilters, filterExercises } from '../rules/libraryFilters';
import { buildRoster } from '../rules/programRosters';
import { repTempo } from '../rules/repTempo';
import { inventory } from '../test/inventory';
import { exerciseAliases } from './exerciseAliases';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseList, exercises } from './exercises';
import { focusPresets } from './focusPresets';
import { kneeConditioningPlan, kneeRehabExercises } from './kneeRehab';
import { exerciseMuscles } from './muscles';
import { physioKneeItems } from './physioKneeProgramme';
import {
  focusSlots,
  generalSlots,
  rehabAdditionIds,
  rehabImpactExercises,
} from './rosterSlots';
import { timedMovementCue } from './timedMovement';

const ids = [
  'fast-feet',
  'in-and-out-jump',
  'lateral-shuffle',
  'knee-drive',
] as const;
const refs = ['E101', 'E102', 'E103', 'E104'] as const;

describe('quick feet drills E101-E104', () => {
  it('get the next permanent references and never reuse retired ones', () => {
    ids.forEach((id, i) => {
      expect(exerciseReferences[id]).toBe(refs[i]);
    });
    for (const ref of ['E85', 'E86', 'E89', 'E97'])
      expect(Object.values(exerciseReferences)).not.toContain(ref);
  });

  it('are knee-loaded impact exercises at the technical level', () => {
    for (const id of ids) {
      expect(exercises[id].kneeLoaded).toBe(true);
      expect(rehabImpactExercises.has(id)).toBe(true);
      expect(exerciseMetadata[id].variants[0]?.technicalLevel).toBe(
        'technical',
      );
      expect(exerciseMetadata[id].variants[0]?.equipment).toEqual([
        { type: 'bodyweight', count: 1 },
      ]);
    }
  });

  it('are timed, two-sided, with an own range up to 45 s', () => {
    for (const id of ids) {
      expect(exercises[id]).toMatchObject({
        unit: 'seconds',
        perSide: false,
        range: { start: 20, max: 45, step: 5 },
      });
      expect(exercises[id].sideKind).toBeUndefined();
      expect(repTempo(id)).toBeNull();
    }
    // Other timed exercises keep their own ranges.
    expect(exercises['single-leg-lateral-hop'].range.max).toBe(30);
    expect(exercises.plank.range.max).toBe(30);
  });

  it('start 20, 30 and 40 seconds for new, some and regular training', () => {
    for (const id of ids)
      expect(
        (['new', 'some', 'regular'] as const).map((e) =>
          startingSeconds(e, exercises[id].range),
        ),
      ).toEqual([20, 30, 40]);
  });

  it('alternate legs, except the jump that uses both at once', () => {
    expect(exerciseMetadata['fast-feet'].sidePolicy).toBe('alternating');
    expect(exerciseMetadata['knee-drive'].sidePolicy).toBe('alternating');
    expect(exerciseMetadata['lateral-shuffle'].sidePolicy).toBe('alternating');
    expect(exerciseMetadata['in-and-out-jump'].sidePolicy).toBe('both');
    for (const id of ids)
      expect(exerciseMetadata[id].easierExerciseId).toBeUndefined();
  });

  it('are editorial with a pain warning and never cite AAOS', () => {
    for (const id of ids) {
      const [source] = exerciseMetadata[id].sources;
      expect(exerciseMetadata[id].sources).toHaveLength(1);
      expect(source?.publisher).toBe('Stomme');
      expect(source?.url).toBeUndefined();
      expect(source?.note).toContain('Redaktionell övning');
      expect(source?.note).toContain('Avbryt vid smärta');
      expect(source?.note).toContain('Knärehab');
      expect(JSON.stringify(source)).not.toContain('aaos');
    }
  });

  it('show only the running purpose', () => {
    for (const id of ids) {
      expect(exerciseMetadata[id].purposes.knee).toBeUndefined();
      expect(exerciseMetadata[id].purposes.running).toBeTruthy();
    }
  });

  it('tell the user to mark the floor with tape and never land on objects', () => {
    for (const id of ['in-and-out-jump', 'lateral-shuffle'] as const)
      expect(exerciseMetadata[id].variants[0]?.cue).toContain('Tejp');
    expect(exercises['in-and-out-jump'].tips.join(' ')).toContain('tejp');
    expect(exercises['in-and-out-jump'].tips.join(' ')).toContain(
      'Hoppa inte upp på markeringarna',
    );
    expect(exercises['lateral-shuffle'].tips.join(' ')).toContain(
      'inte upp på den',
    );
  });

  it('give each drill concrete easier and common-mistake text', () => {
    for (const id of ids) {
      expect(exercises[id].easierVariant.length).toBeGreaterThan(20);
      expect(exercises[id].commonMistake.length).toBeGreaterThan(20);
      expect(exercises[id].tips).toHaveLength(3);
    }
  });

  it('tag muscles and qualities', () => {
    expect(exerciseMuscles['fast-feet']).toMatchObject({
      primary: ['calves'],
      secondary: ['quads', 'hip-flexors', 'core'],
      qualities: [],
    });
    expect(exerciseMuscles['in-and-out-jump']).toMatchObject({
      primary: ['calves', 'quads', 'glutes'],
      qualities: ['power'],
    });
    expect(exerciseMuscles['lateral-shuffle'].primary).toEqual([
      'hip-abductors',
      'quads',
      'glutes',
    ]);
    expect(exerciseMuscles['knee-drive']).toMatchObject({
      primary: ['hip-flexors', 'calves'],
      qualities: [],
    });
    expect(exercises['fast-feet'].muscles).toEqual([
      'Vader',
      'Framsida lår',
      'Höftböjare',
      'Bål',
    ]);
  });

  it('have Swedish and English aliases', () => {
    expect(exerciseAliases['fast-feet']).toContain('Quick feet');
    expect(exerciseAliases['in-and-out-jump']).toContain('Plate in and out');
    expect(exerciseAliases['lateral-shuffle']).toContain('Plate shuffle');
    expect(exerciseAliases['knee-drive']).toContain('High knees');
  });

  it('are library-only: in no slot, rehab list, physio plan or progression link', () => {
    const everySlot = JSON.stringify([
      generalSlots,
      focusSlots,
      Object.entries(movementSlots),
    ]);
    for (const id of ids) {
      expect(everySlot).not.toContain(`"${id}"`);
      expect(movementSlots[id]).toBeUndefined();
      expect(rehabAdditionIds.has(id)).toBe(false);
      expect(kneeRehabExercises.map((e) => e.id)).not.toContain(id);
      expect(physioKneeItems.map((item) => item.exerciseId)).not.toContain(id);
      expect(
        kneeConditioningPlan({
          programId: 'rehab',
          experience: 'some',
          ...inventory({ support: ['chair', 'support', 'step'] }),
        }).map((item) => item.exerciseId),
      ).not.toContain(id);
      for (const meta of Object.values(exerciseMetadata)) {
        expect(meta.harderExerciseId).not.toBe(id);
        expect(meta.easierExerciseId).not.toBe(id);
      }
    }
  });

  it('are found under the running purpose and as timed exercises', () => {
    const context = { inventory: inventory() };
    const run = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, purpose: 'running' },
      context,
    ).primary.map((e) => e.id);
    const timed = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, unit: 'time' },
      context,
    ).primary.map((e) => e.id);
    for (const id of ids) {
      expect(run).toContain(id);
      expect(timed).toContain(id);
    }
  });

  it('are never offered as a replacement for a favourite in any movement slot', () => {
    const slotted = Object.keys(movementSlots) as ExerciseId[];
    expect(slotted.length).toBeGreaterThan(10);
    for (const experience of ['new', 'some', 'regular'] as const) {
      const preferences = {
        programId: 'general' as const,
        experience,
        ...inventory({
          dumbbells: [[8, 2]],
          kettlebells: [[12, 1]],
          support: ['chair', 'support', 'step', 'band', 'pull-up-bar'],
        }),
      };
      for (const slotId of slotted) {
        const offered = favouriteAlternatives(
          slotId,
          [...ids],
          [],
          preferences,
        );
        expect(offered, `${experience} ${slotId}`).toEqual([]);
      }
    }
    // Control: the same call does offer a genuine alternative from the same slot.
    expect(
      favouriteAlternatives('goblet-squat', ['goblet-chair-squat'], [], {
        programId: 'general',
        experience: 'regular',
        ...inventory({ dumbbells: [[8, 2]], support: ['chair', 'support'] }),
      }),
    ).toEqual(['goblet-chair-squat']);
  });

  it('tell the user to use a non-slip surface with clear space around', () => {
    for (const id of ids) {
      const tips = exercises[id].tips.join(' ');
      expect(tips, id).toContain('halkfritt');
      expect(tips, id).toContain('fritt omkring');
    }
  });

  it('state that the time covers both legs together where legs alternate', () => {
    for (const id of ['fast-feet', 'lateral-shuffle', 'knee-drive'] as const) {
      expect(exerciseMetadata[id].sources[0]?.note).toContain(
        'Tiden gäller båda benen tillsammans.',
      );
      expect(timedMovementCue[id]?.status).toContain(
        'Tiden gäller båda benen tillsammans.',
      );
    }
  });
});

describe('quick feet drills stay out of every roster', () => {
  const equipmentSets = [
    ['bodyweight only', inventory()],
    [
      'everything',
      inventory({
        dumbbells: [[8, 2]],
        kettlebells: [[12, 1]],
        support: ['chair', 'support', 'step', 'band', 'pull-up-bar'],
      }),
    ],
  ] as const;
  const regions = [
    'legs',
    'core',
    'back',
    'chest',
    'shoulders',
    'arms',
  ] as const;
  const focuses = [
    undefined,
    ...focusPresets.filter((p) => p.id !== 'custom').map((p) => ({ id: p.id })),
    ...regions.map((region) => ({ id: 'custom' as const, regions: [region] })),
    { id: 'custom' as const, regions: [...regions] },
  ];
  const banned = new Set<ExerciseId>(ids);

  for (const experience of ['new', 'some', 'regular'] as const)
    for (const [name, equipment] of equipmentSets)
      it(`${experience} with ${name}: no template or focus picks them`, () => {
        for (const template of ['A', 'B'] as TemplateId[])
          for (const focus of focuses) {
            const roster = buildRoster(
              { programId: 'general', experience, ...equipment },
              template,
              focus ? { focus } : {},
            );
            for (const id of roster.ids) expect(banned.has(id)).toBe(false);
          }
        for (const bodyParts of [['legs'], [...regions]] as BodyRegionId[][])
          for (const id of buildRoster(
            { programId: 'general', experience, ...equipment, bodyParts },
            'A',
          ).ids)
            expect(banned.has(id)).toBe(false);
      });
});
