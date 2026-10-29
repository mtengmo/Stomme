import { describe, expect, it } from 'vitest';
import { figures, POSE_KEYS } from '../figures/poses';
import { exerciseMetadata, variantForLoad } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseList, exercises } from './exercises';
import { loadPresentation } from './loadPresentation';
import { exerciseMuscles } from './muscles';

describe('expanded library integrity', () => {
  it('preserves permanent E01–E75 references and original load indices', () => {
    expect(exerciseList.map((e) => exerciseReferences[e.id])).toEqual(
      Array.from(
        { length: 75 },
        (_, i) => `E${String(i + 1).padStart(2, '0')}`,
      ),
    );
    expect(
      exercises['goblet-chair-squat'].loadLadder.map((load) => load.kg),
    ).toEqual([0, 10, 16]);
    expect(
      exercises['suitcase-carry'].loadLadder.map((load) => load.kg),
    ).toEqual([10, 16]);
    for (const id of [
      'dumbbell-rdl',
      'reverse-lunge',
      'forward-lunge',
    ] as const) {
      expect(
        exerciseMetadata[id].variants.find((v) => v.id === 'dumbbell')
          ?.loadIndices,
      ).toEqual(id === 'dumbbell-rdl' ? [0, 1] : [1]);
      expect(
        exercises[id].loadLadder.slice(0, 2).map((load) => load.kg),
      ).toEqual(id === 'dumbbell-rdl' ? [4, 8] : [0, 4]);
      const kettlebell = exerciseMetadata[id].variants.find(
        (v) => v.id === 'kettlebell',
      );
      expect(kettlebell?.equipment).toEqual([{ type: 'kettlebell', count: 1 }]);
      expect(
        exercises[id].loadLadder[kettlebell?.loadIndices.at(-1) ?? -1]?.kg,
      ).toBe(16);
    }
  });
  it.each(exerciseList)(
    '$id has complete variants, attribution, anatomy and bounded poses',
    (exercise) => {
      const metadata = exerciseMetadata[exercise.id];
      expect(metadata.sources.length).toBeGreaterThan(0);
      for (const source of metadata.sources) {
        if (source.url) expect(source.url).toMatch(/^https:\/\//);
        else expect(source.publisher).toBe('Stomme');
      }
      if (
        exercise.id === 'prone-on-forearms' ||
        exercise.id === 'seated-knee-flexion'
      ) {
        expect(metadata.kind).toBe('mobility');
        expect(exerciseMuscles[exercise.id].primary).toEqual([]);
      } else
        expect(exerciseMuscles[exercise.id].primary.length).toBeGreaterThan(0);
      for (const variant of metadata.variants) {
        expect(variant.setup.length).toBeGreaterThan(10);
        expect(variant.technicalReason.length).toBeGreaterThan(10);
        expect(variant.easierOption.length).toBeGreaterThan(5);
        expect(variant.loadIndices).toContain(variant.defaultLoadIndex);
        for (const req of variant.equipment)
          expect(req.count).toBeGreaterThan(0);
      }
      exercise.loadLadder.forEach((_load, index) => {
        expect(variantForLoad(exercise.id, index).loadIndices).toContain(index);
      });
      const spec = figures[exercise.id];
      for (const pose of [spec.start, spec.middle ?? spec.start, spec.end])
        for (const key of POSE_KEYS)
          for (const value of pose[key]) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(14);
            expect(value).toBeLessThanOrEqual(188);
          }
    },
  );
  it('uses complete implement counts and does not infer types from labels', () => {
    expect(exerciseMetadata['bent-over-row'].variants[0]?.equipment).toEqual([
      { type: 'dumbbell', count: 2 },
    ]);
    expect(exerciseMetadata['bent-over-row'].easierExerciseId).toBe(
      'supported-row',
    );
    expect(exerciseMetadata['supported-row'].harderExerciseId).toBe(
      'bent-over-row',
    );
    expect(exerciseMetadata['floor-press'].variants[0]?.equipment).toEqual([
      { type: 'dumbbell', count: 2 },
    ]);
    expect(exerciseMetadata['supported-row'].variants[0]?.equipment).toEqual([
      { type: 'dumbbell', count: 1 },
      { type: 'support', count: 1 },
    ]);
    const translated = {
      ...exercises['goblet-chair-squat'],
      loadLadder: [
        { kg: 0, label: 'No load' },
        { kg: 10, label: 'A' },
        { kg: 16, label: 'B' },
      ],
    };
    expect(loadPresentation(translated, 2).equipment).toBe('kettlebell');
    expect(loadPresentation(exercises['band-leg-press'], 0).equipment).toBe(
      'band',
    );
    expect(
      loadPresentation(exercises['hamstring-curl'], 0).equipment,
    ).toBeNull();
  });
  it('separates AAOS membership, running curation and intra-repetition holds', () => {
    expect(
      exerciseMetadata['side-lying-hip-adduction'].purposes.knee,
    ).toBeTruthy();
    expect(
      exerciseMetadata['side-lying-hip-adduction'].purposes.running,
    ).toBeUndefined();
    expect(exerciseMetadata['straight-leg-raise'].holdSeconds).toBe(5);
    expect(exercises['straight-leg-raise'].unit).toBe('reps');
    expect(exerciseMetadata['calf-stretch'].kind).toBe('mobility');
    expect(exercises['calf-stretch'].unit).toBe('seconds');
    expect(exerciseMetadata['calf-stretch'].holdSeconds).toBeUndefined();
    expect(exerciseMetadata['band-leg-press'].variants).toHaveLength(1);
    expect(exerciseMetadata['band-leg-press'].variants[0]?.equipment).toEqual([
      { type: 'band', count: 1 },
    ]);
  });
  it('keeps hold and recovery timing within every displayed repetition sequence', () => {
    for (const exercise of exerciseList) {
      const metadata = exerciseMetadata[exercise.id];
      if (!metadata.holdSeconds) continue;
      for (const variant of metadata.variants) {
        const tips = loadPresentation(
          exercise,
          variant.defaultLoadIndex,
          variant.id,
        ).tips.join(' ');
        expect(tips).toContain(`${metadata.holdSeconds} sekunder`);
        if (metadata.relaxSeconds)
          expect(tips).toContain(`${metadata.relaxSeconds} sekunder`);
        expect(tips).toContain('repetition');
      }
    }
  });
  it('preserves movement and return steps across equipment variants', () => {
    for (const exercise of exerciseList) {
      for (const variant of exerciseMetadata[exercise.id].variants) {
        expect(
          loadPresentation(
            exercise,
            variant.defaultLoadIndex,
            variant.id,
          ).tips.slice(1),
        ).toEqual(exercise.tips.slice(1));
      }
    }
    expect(
      exerciseMetadata['goblet-squat'].variants.find(
        (variant) => variant.id === 'bodyweight',
      )?.setup,
    ).not.toMatch(/hantel|kettlebell|vikt nära bröstet/i);
  });
});

describe('technical levels used by the starting level', () => {
  it('rates supported row and the dumbbell floor press as basic', () => {
    for (const id of ['supported-row', 'floor-press'] as const)
      for (const variant of exerciseMetadata[id].variants)
        expect(variant.technicalLevel).toBe('basic');
    expect(
      exerciseMetadata['kettlebell-floor-press'].variants[0]?.technicalLevel,
    ).toBe('practiced');
  });
});
