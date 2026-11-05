import { describe, expect, it } from 'vitest';
import type { BodyRegionId, ExerciseId, TemplateId } from '../domain/types';
import { equipmentFits } from '../rules/equipment';
import { favouriteAlternatives } from '../rules/favouriteSuggestions';
import { movementSlots } from '../rules/levelPolicy';
import { emptyExerciseFilters, filterExercises } from '../rules/libraryFilters';
import { buildRoster } from '../rules/programRosters';
import { repTempo } from '../rules/repTempo';
import { inventory } from '../test/inventory';
import { exerciseAliases } from './exerciseAliases';
import { exerciseMetadata } from './exerciseMetadata';
import { compareReferences, exerciseReferences } from './exerciseReferences';
import { exerciseSideCue } from './exerciseSideCues';
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

const ids = ['single-leg-lateral-hop', 'box-jump'] as const;

describe('plyometric library additions', () => {
  it('gives them the next permanent references and never reuses retired ones', () => {
    expect(exerciseReferences['single-leg-lateral-hop']).toBe('E99');
    expect(exerciseReferences['box-jump']).toBe('E100');
    for (const ref of ['E85', 'E86', 'E89', 'E97'])
      expect(Object.values(exerciseReferences)).not.toContain(ref);
  });

  it('marks both as knee-loaded impact exercises', () => {
    for (const id of ids) {
      expect(exercises[id].kneeLoaded).toBe(true);
      expect(rehabImpactExercises.has(id)).toBe(true);
      expect(exerciseMetadata[id].variants[0]?.technicalLevel).toBe(
        'technical',
      );
      expect(exerciseMetadata[id].reviewedAt).toBe('2026-11-01');
    }
  });

  it('does not change the knee-loaded flag of the other bodyweight additions', () => {
    const loaded = exerciseList.filter((e) => e.kneeLoaded).map((e) => e.id);
    for (const id of ['burpee', 'squat-jump', 'jumping-lunge'] as const)
      expect(loaded).toContain(id);
    for (const id of ['push-up', 'plank', 'calf-raise', 'crunch'] as const)
      expect(exercises[id].kneeLoaded).toBe(false);
  });

  it('times the lateral hop per leg, like the side plank', () => {
    const hop = exercises['single-leg-lateral-hop'];
    expect(hop).toMatchObject({
      unit: 'seconds',
      perSide: true,
      sideKind: 'ben',
      range: { start: 20, max: 30, step: 5 },
    });
    expect(exerciseMetadata['single-leg-lateral-hop'].sidePolicy).toBe(
      'choose-side',
    );
    expect(repTempo('single-leg-lateral-hop')).toBeNull();
  });

  it('counts box jumps by hand with a low rep range', () => {
    expect(exercises['box-jump']).toMatchObject({
      unit: 'reps',
      perSide: false,
      range: { start: 3, max: 5, step: 1 },
    });
    expect(exercises['box-jump'].sideKind).toBeUndefined();
    expect(exerciseMetadata['box-jump'].sidePolicy).toBe('both');
    expect(repTempo('box-jump')).toBeNull();
  });

  it('keeps the side cue to hopping on the chosen leg', () => {
    const right = exerciseSideCue('single-leg-lateral-hop', 'right');
    const left = exerciseSideCue('single-leg-lateral-hop', 'left');
    expect(right?.label).toBe('Hoppa på höger ben');
    expect(left?.label).toBe('Hoppa på vänster ben');
    expect(left?.explanation).toContain('vänstra');
    expect(right?.explanation).toContain('den andra foten är lyft');
  });

  it('is library-only: in no slot, rehab list, physio plan or progression link', () => {
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
      for (const meta of Object.values(exerciseMetadata))
        expect(meta.harderExerciseId).not.toBe(id);
    }
  });

  it('links box jump to step-up in the easier direction only', () => {
    expect(exerciseMetadata['box-jump'].easierExerciseId).toBe('step-up');
    expect(exerciseMetadata['box-jump'].harderExerciseId).toBeUndefined();
    expect(exerciseMetadata['step-up'].harderExerciseId).not.toBe('box-jump');
    expect(exerciseMetadata['single-leg-lateral-hop'].easierExerciseId).toBe(
      undefined,
    );
  });

  it('cites NASM for box jump and marks the lateral hop as editorial', () => {
    const [box] = exerciseMetadata['box-jump'].sources;
    expect(box).toMatchObject({
      publisher: 'NASM',
      url: 'https://www.nasm.org/resource-center/exercise-library/box-jumps',
    });
    const [hop] = exerciseMetadata['single-leg-lateral-hop'].sources;
    expect(hop?.publisher).toBe('Stomme');
    expect(hop?.url).toBeUndefined();
    expect(hop?.note).toContain('Redaktionell övning');
    for (const id of ids)
      for (const source of exerciseMetadata[id].sources) {
        expect(source.url ?? '').not.toContain('aaos');
        expect(source.note).toContain('Avbryt vid smärta');
      }
  });

  it('shows only the running purpose', () => {
    for (const id of ids) {
      expect(exerciseMetadata[id].purposes.knee).toBeUndefined();
      expect(exerciseMetadata[id].purposes.running).toBeTruthy();
    }
    expect(exerciseMetadata['box-jump'].purposes.running).toBe(
      'Explosiv benstyrka med kontrollerad landning.',
    );
    expect(exerciseMetadata['single-leg-lateral-hop'].purposes.running).toBe(
      'Landning och sidokontroll på ett ben.',
    );
  });

  it('requires a step for box jump and a stable-step cue', () => {
    const [variant] = exerciseMetadata['box-jump'].variants;
    expect(variant?.equipment).toEqual([
      { type: 'bodyweight', count: 1 },
      { type: 'step', count: 1 },
    ]);
    expect(variant?.cue).toContain('stadig');
    expect(variant?.cue).toBe(
      'Ett lågt, stadigt steg eller en låda som inte kan glida, välta eller ge efter. Börja lågt.',
    );
    expect(
      equipmentFits(variant?.equipment ?? [], {
        ...inventory(),
      }),
    ).toBe(false);
    expect(
      equipmentFits(variant?.equipment ?? [], {
        ...inventory({ support: ['step'] }),
      }),
    ).toBe(true);
    expect(
      exerciseMetadata['single-leg-lateral-hop'].variants[0]?.equipment,
    ).toEqual([{ type: 'bodyweight', count: 1 }]);
  });

  it('tags muscles and qualities', () => {
    expect(exerciseMuscles['single-leg-lateral-hop']).toMatchObject({
      primary: ['calves', 'hip-abductors'],
      secondary: ['quads', 'glutes', 'core'],
      qualities: ['power', 'balance'],
    });
    expect(exerciseMuscles['box-jump']).toMatchObject({
      primary: ['quads', 'glutes', 'calves'],
      secondary: ['hamstrings', 'core'],
      qualities: ['power'],
    });
    expect(exercises['single-leg-lateral-hop'].muscles).toEqual([
      'Vader',
      'Sidan av höften',
      'Framsida lår',
      'Säte',
      'Bål',
    ]);
    expect(exercises['box-jump'].muscles).toEqual([
      'Framsida lår',
      'Säte',
      'Vader',
      'Baksida lår',
      'Bål',
    ]);
  });

  it('has Swedish and English aliases', () => {
    expect(exerciseAliases['single-leg-lateral-hop']).toEqual([
      'Single-leg lateral hops',
      'Lateral hops',
      'Enbens sidohopp',
      'Sidohopp',
    ]);
    expect(exerciseAliases['box-jump']).toEqual([
      'Box jump',
      'Box jumps',
      'Lådhopp',
      'Hopp upp på låda',
    ]);
  });

  it('finds both under the running purpose, and the lateral hop as one-sided and timed', () => {
    const context = { inventory: inventory({ support: ['step'] }) };
    const run = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, purpose: 'running' },
      context,
    ).primary.map((e) => e.id);
    for (const id of ids) expect(run).toContain(id);
    const oneSide = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, oneSide: true },
      context,
    ).primary.map((e) => e.id);
    expect(oneSide).toContain('single-leg-lateral-hop');
    expect(oneSide).not.toContain('box-jump');
    const timed = filterExercises(
      exerciseList,
      { ...emptyExerciseFilters, unit: 'time' },
      context,
    ).primary.map((e) => e.id);
    expect(timed).toContain('single-leg-lateral-hop');
    expect(timed).not.toContain('box-jump');
  });

  it('is never suggested as a favourite alternative', () => {
    const preferences = {
      programId: 'general' as const,
      experience: 'regular' as const,
      ...inventory({ support: ['step'] }),
    };
    for (const id of ids)
      expect(favouriteAlternatives(id, [...ids], [], preferences)).toEqual([]);
  });
});

describe('plyometric exercises stay out of every roster', () => {
  const equipmentSets = [
    ['no step', inventory({ support: ['chair', 'support'] })],
    ['with step', inventory({ support: ['chair', 'support', 'step'] })],
    [
      'everything',
      inventory({
        dumbbells: [[8, 2]],
        kettlebells: [[12, 1]],
        support: ['chair', 'support', 'step', 'band', 'pull-up-bar'],
      }),
    ],
    ['bodyweight only', inventory()],
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
        // Body parts chosen in setup pick the custom focus when none is given.
        for (const bodyParts of [
          ['legs'],
          ['legs', 'core'],
          [...regions],
        ] as BodyRegionId[][])
          for (const id of buildRoster(
            { programId: 'general', experience, ...equipment, bodyParts },
            'A',
          ).ids)
            expect(banned.has(id)).toBe(false);
      });
});

describe('review ordering', () => {
  it('sorts references numerically', () => {
    expect(
      ['E100', 'E11', 'E99', 'E10', 'E98'].sort(compareReferences),
    ).toEqual(['E10', 'E11', 'E98', 'E99', 'E100']);
    const sorted = exerciseList
      .map((e) => exerciseReferences[e.id])
      .sort(compareReferences);
    expect(sorted.indexOf('E99')).toBeLessThan(sorted.indexOf('E100'));
    expect(sorted.indexOf('E100')).toBeLessThan(sorted.indexOf('E101'));
    expect(sorted.at(-1)).toBe('E106');
  });
});
