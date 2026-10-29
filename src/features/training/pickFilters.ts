import {
  type ExerciseFilters,
  filtersFromParams,
  filtersToParams,
} from '../../rules/libraryFilters';

/**
 * Filters of the custom-workout picker, kept as a query string. Two filters
 * default to ON, so their "off" state is written out: `redskap=alla` means
 * all equipment (absent means the user's available equipment) and `vana=0`
 * means level fit off (absent means on).
 */
export function pickFiltersFrom(
  query: string,
  levelFitDefault: boolean,
): ExerciseFilters {
  const params = new URLSearchParams(query);
  const parsed = filtersFromParams(params);
  return {
    ...parsed,
    equipment: params.has('redskap') ? parsed.equipment : 'available',
    levelFit: params.has('vana') ? parsed.levelFit : levelFitDefault,
  };
}

export function pickFiltersPatch(
  query: string,
  patch: Partial<ExerciseFilters>,
): string {
  const { equipment, levelFit, ...rest } = patch;
  const next = filtersToParams(rest, query);
  if (equipment !== undefined) next.set('redskap', equipment || 'alla');
  if (levelFit !== undefined) next.set('vana', levelFit ? '1' : '0');
  return next.toString();
}
