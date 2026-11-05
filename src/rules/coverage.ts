import { legMuscles, pushMuscles } from '../content/focusPresets';
import { exerciseMuscles, type MuscleGroupId } from '../content/muscles';
import type { ExerciseId } from '../domain/types';

export type CoverageArea = 'legs' | 'press' | 'back' | 'core';

/** Muscle-based areas a whole-body pass should cover: back as primary is pull. */
export const coverageAreas: Record<CoverageArea, readonly MuscleGroupId[]> = {
  legs: legMuscles,
  press: pushMuscles,
  back: ['back'],
  core: ['core'],
};

export const coverageLabels: Record<CoverageArea, string> = {
  legs: 'ben',
  press: 'press',
  back: 'drag',
  core: 'bål',
};

/** Areas that no exercise in the list trains as a primary muscle. */
export function missingCoverage(ids: readonly ExerciseId[]): CoverageArea[] {
  const trained = new Set(ids.flatMap((id) => exerciseMuscles[id].primary));
  return (Object.keys(coverageAreas) as CoverageArea[]).filter(
    (area) => !coverageAreas[area].some((m) => trained.has(m)),
  );
}
