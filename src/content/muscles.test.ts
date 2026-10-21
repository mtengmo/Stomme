import { describe, expect, it } from 'vitest';
import { exerciseList } from './exercises';
import {
  bodyRegions,
  exerciseMuscles,
  muscleGroups,
  parseMuscleFilter,
  primaryMuscleLabel,
  trainingQualities,
} from './muscles';

describe('muscle guidance content', () => {
  it('covers the catalogue with valid, distinct roles and qualities', () => {
    expect(Object.keys(exerciseMuscles).sort()).toEqual(
      exerciseList.map((exercise) => exercise.id).sort(),
    );
    for (const exercise of exerciseList) {
      const guidance = exerciseMuscles[exercise.id];
      if (exercise.id === 'prone-on-forearms')
        expect(guidance.primary).toEqual([]);
      else expect(guidance.primary.length, exercise.id).toBeGreaterThan(0);
      const groups = [...guidance.primary, ...guidance.secondary];
      expect(new Set(groups).size, exercise.id).toBe(groups.length);
      for (const group of groups) expect(muscleGroups[group]).toBeDefined();
      expect(new Set(guidance.qualities).size).toBe(guidance.qualities.length);
      for (const quality of guidance.qualities)
        expect(trainingQualities[quality]).toBeDefined();
      expect(primaryMuscleLabel(exercise.id)).not.toMatch(/Balans|Grepp/);
    }
  });

  it('treats unknown or prototype filter values as all exercises', () => {
    expect(parseMuscleFilter('')).toBeNull();
    expect(parseMuscleFilter('muskel=calves')).toBe('calves');
    for (const value of ['unknown', 'constructor', 'toString', '']) {
      expect(parseMuscleFilter(`muskel=${value}`)).toBeNull();
    }
  });
});

describe('broad body regions', () => {
  it('cover every muscle group exactly once', () => {
    const grouped = bodyRegions.flatMap((region) => [...region.muscles]);
    expect([...grouped].sort()).toEqual(Object.keys(muscleGroups).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('give every exercise with a primary muscle a region to be found in', () => {
    const grouped = new Set(bodyRegions.flatMap((region) => region.muscles));
    for (const exercise of exerciseList) {
      const { primary } = exerciseMuscles[exercise.id];
      for (const muscle of primary) expect(grouped.has(muscle)).toBe(true);
    }
  });
});
