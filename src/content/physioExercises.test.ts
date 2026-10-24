import { describe, expect, it } from 'vitest';
import { equipmentFits } from '../rules/equipment';
import { exerciseAliases, exerciseSearchText } from './exerciseAliases';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseList, exercises } from './exercises';
import { kneeRehabExercises } from './kneeRehab';
import { exerciseMuscles } from './muscles';

const ids = [
  'quad-set',
  'seated-knee-flexion',
  'band-knee-extension',
  'band-hip-extension',
  'balance-clock',
] as const;

describe('catalogue entries E49-E53', () => {
  it('are appended in E-number order with unique ids', () => {
    expect(ids.map((id) => exerciseReferences[id])).toEqual([
      'E49',
      'E50',
      'E51',
      'E52',
      'E53',
    ]);
    expect(exerciseList.slice(48, 53).map((e) => e.id)).toEqual([...ids]);
    expect(new Set(exerciseList.map((e) => e.id)).size).toBe(
      exerciseList.length,
    );
  });

  it('have the planned units, sides and generic ranges', () => {
    for (const id of ids) {
      const exercise = exercises[id];
      expect(exercise.perSide, id).toBe(true);
      expect(exercise.sideKind, id).toBe('ben');
      expect(exercise.tips, id).toHaveLength(3);
      expect(exercise.commonMistake.length, id).toBeGreaterThan(10);
      expect(exercise.easierVariant.length, id).toBeGreaterThan(10);
      expect(exercise.range, id).toEqual(
        id === 'balance-clock'
          ? { start: 3, max: 6, step: 1 }
          : { start: 8, max: 12, step: 1 },
      );
      expect(exercise.unit, id).toBe(id === 'balance-clock' ? 'laps' : 'reps');
    }
  });

  it('encode no hold time and no rehab dose', () => {
    for (const id of ids) {
      expect(exerciseMetadata[id].holdSeconds, id).toBeUndefined();
      expect(exercises[id].tips.join(' '), id).not.toMatch(/\d+ sekunder/);
    }
  });

  it('need the planned equipment and stay out of the AAOS collection', () => {
    const equipment = (id: (typeof ids)[number]) =>
      exerciseMetadata[id].variants.map((v) => v.equipment);
    expect(equipment('quad-set')).toEqual([[{ type: 'bodyweight', count: 1 }]]);
    expect(equipment('seated-knee-flexion')[0]).toContainEqual({
      type: 'chair',
      count: 1,
    });
    expect(equipment('band-knee-extension')[0]).toEqual([
      { type: 'band', count: 1 },
      { type: 'chair', count: 1 },
    ]);
    expect(equipment('band-hip-extension')[0]).toEqual([
      { type: 'band', count: 1 },
      { type: 'support', count: 1 },
    ]);
    expect(equipment('balance-clock')[0]).toContainEqual({
      type: 'support',
      count: 1,
    });
    const variant = exerciseMetadata['band-knee-extension'].variants[0];
    expect(
      equipmentFits(variant?.equipment ?? [], ['bodyweight', 'chair']),
    ).toBe(false);
    expect(equipmentFits(variant?.equipment ?? [], ['band', 'chair'])).toBe(
      true,
    );
    for (const id of ids)
      expect(kneeRehabExercises.some((e) => e.id === id)).toBe(false);
  });

  it('carry the editorial source without a link or a clinical citation', () => {
    for (const id of ids) {
      const [source] = exerciseMetadata[id].sources;
      expect(source?.url).toBeUndefined();
      expect(source?.publisher).toBe('Stomme');
      expect(source?.note).toContain('Ingen klinisk källa');
    }
  });

  it('use the planned muscles and are searchable by their sheet names', () => {
    expect(exerciseMuscles['quad-set'].primary).toEqual(['quads']);
    expect(exerciseMuscles['seated-knee-flexion'].primary).toEqual([]);
    expect(exerciseMetadata['seated-knee-flexion'].kind).toBe('mobility');
    expect(exerciseMuscles['band-knee-extension'].primary).toEqual(['quads']);
    expect(exerciseMuscles['band-hip-extension'].primary).toEqual(['glutes']);
    expect(exerciseMuscles['balance-clock'].primary).toEqual([
      'glutes',
      'quads',
    ]);
    expect(exerciseAliases['quad-set']).toContain('Quad set');
    expect(exerciseAliases['balance-clock']).toContain('Clock reach');
    expect(exerciseSearchText('balance-clock')).toContain('Balansklockan');
  });

  it('adds the armrest hint to the chair squat easier option', () => {
    expect(exercises['goblet-chair-squat'].easierVariant).toContain(
      'ta stöd mot armstöden vid behov',
    );
  });
});
