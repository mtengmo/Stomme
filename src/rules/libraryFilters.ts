import { exerciseSearchText } from '../content/exerciseAliases';
import {
  type EquipmentType,
  equipmentLabels,
  exerciseMetadata,
  type Purpose,
  purposeLabels,
  type TechnicalLevel,
  technicalLevelLabels,
} from '../content/exerciseMetadata';
import { exerciseReferences } from '../content/exerciseReferences';
import {
  bodyRegions,
  exerciseMuscles,
  type MuscleGroupId,
  muscleGroups,
} from '../content/muscles';
import type {
  BodyRegionId,
  Exercise,
  ExerciseId,
  TrainingPreferences,
} from '../domain/types';
import {
  equipmentFits,
  type Inventory,
  missingRequirements,
} from './equipment';
import { allowedLevels } from './levelPolicy';

export interface LibraryFilters {
  aaos?: boolean;
  purpose: Purpose | 'mine' | '';
  equipment: EquipmentType | 'available' | '';
  level: TechnicalLevel | '';
  term: string;
}
export function matchesLibraryFilters(
  exercise: Exercise,
  filters: LibraryFilters,
  inventory: Inventory,
  mine: Set<string>,
) {
  const meta = exerciseMetadata[exercise.id];
  if (
    filters.aaos &&
    !meta.sources.some((source) => source.url?.includes('orthoinfo.aaos.org'))
  )
    return false;
  if (
    filters.purpose === 'mine'
      ? !mine.has(exercise.id)
      : filters.purpose && !meta.purposes[filters.purpose]
  )
    return false;
  const term = filters.term.trim().toLocaleLowerCase('sv');
  if (
    term &&
    !`${exercise.name} ${exerciseSearchText(exercise.id)} ${exerciseReferences[exercise.id]}`
      .toLocaleLowerCase('sv')
      .includes(term)
  )
    return false;
  return meta.variants.some(
    (variant) =>
      (!filters.level || variant.technicalLevel === filters.level) &&
      (!filters.equipment ||
        (filters.equipment === 'available'
          ? equipmentFits(variant.equipment, inventory)
          : variant.equipment.some(
              (required) => required.type === filters.equipment,
            ))),
  );
}

export interface ExerciseFilters extends LibraryFilters {
  /** Selected body regions; empty means no region filter. */
  regions: BodyRegionId[];
  muscle: MuscleGroupId | '';
  /** Strength or mobility, from the exercise metadata. */
  kind: 'strength' | 'mobility' | '';
  /** Counted in repetitions or held/timed in seconds. */
  unit: 'reps' | 'time' | '';
  /** Only exercises done one side at a time. */
  oneSide: boolean;
  favouritesOnly: boolean;
  /** Only exercises with a variant that fits the user's experience. */
  levelFit: boolean;
}

export const emptyExerciseFilters: ExerciseFilters = {
  purpose: '',
  equipment: '',
  level: '',
  term: '',
  regions: [],
  muscle: '',
  kind: '',
  unit: '',
  oneSide: false,
  favouritesOnly: false,
  levelFit: false,
};

export interface ExerciseFilterContext {
  inventory: Inventory;
  mine?: Set<string>;
  /** Undefined while favourites are loading: "only favourites" then shows nothing. */
  favourites?: readonly ExerciseId[];
  /** Needed for the levelFit filter; without it that filter is ignored. */
  experience?: TrainingPreferences['experience'];
}

/** True when no variant of the exercise is within the experience level. */
export function requiresGoodTechnique(
  id: ExerciseId,
  experience: TrainingPreferences['experience'],
): boolean {
  const levels = allowedLevels(experience);
  return !exerciseMetadata[id].variants.some((variant) =>
    levels.includes(variant.technicalLevel),
  );
}

export interface FilteredExercises {
  /** Matches, or with a region/muscle the exercises that mainly train it. */
  primary: Exercise[];
  /** With a region/muscle: matches where it is only a supporting muscle. */
  supporting: Exercise[];
}

/** Union of the muscles of the given regions. */
export function musclesOfRegions(
  regions: readonly BodyRegionId[],
): MuscleGroupId[] {
  return bodyRegions
    .filter((region) => regions.includes(region.id))
    .flatMap((region) => [...region.muscles]);
}

export function filterExercises(
  list: readonly Exercise[],
  filters: ExerciseFilters,
  context: ExerciseFilterContext,
): FilteredExercises {
  const mine = context.mine ?? new Set<string>();
  const muscles: readonly MuscleGroupId[] | null = filters.muscle
    ? [filters.muscle]
    : filters.regions.length
      ? musclesOfRegions(filters.regions)
      : null;
  const primary: Exercise[] = [];
  const supporting: Exercise[] = [];
  for (const exercise of list) {
    if (filters.favouritesOnly && !context.favourites?.includes(exercise.id))
      continue;
    if (filters.kind && exerciseMetadata[exercise.id].kind !== filters.kind)
      continue;
    if (
      filters.unit &&
      (filters.unit === 'time'
        ? exercise.unit !== 'seconds'
        : exercise.unit !== 'reps')
    )
      continue;
    if (filters.oneSide && !exercise.perSide) continue;
    if (
      filters.levelFit &&
      context.experience &&
      requiresGoodTechnique(exercise.id, context.experience)
    )
      continue;
    if (!matchesLibraryFilters(exercise, filters, context.inventory, mine))
      continue;
    if (!muscles) {
      primary.push(exercise);
      continue;
    }
    const tags = exerciseMuscles[exercise.id];
    if (tags.primary.some((muscle) => muscles.includes(muscle)))
      primary.push(exercise);
    else if (tags.secondary.some((muscle) => muscles.includes(muscle)))
      supporting.push(exercise);
  }
  return { primary, supporting };
}

/** Labels of the equipment a row lacks, for its closest-fitting variant. */
export function missingEquipment(
  id: ExerciseId,
  inventory: Inventory,
): string[] {
  let best: string[] | undefined;
  for (const variant of exerciseMetadata[id].variants) {
    const missing = missingRequirements(variant.equipment, inventory);
    if (!missing.length) return [];
    if (!best || missing.length < best.length) best = missing;
  }
  return best ?? [];
}

/** Hash/query parameter names, shared by the library and the start flow. */
export const filterParamNames: Record<keyof ExerciseFilters, string> = {
  aaos: 'kalla',
  term: 'sok',
  regions: 'omrade',
  muscle: 'muskel',
  purpose: 'syfte',
  level: 'niva',
  equipment: 'redskap',
  kind: 'typ',
  unit: 'utforande',
  oneSide: 'sida',
  favouritesOnly: 'favoriter',
  levelFit: 'vana',
};

/** Parses filters from a query string; unknown or invalid values are ignored. */
export function filtersFromParams(
  search: string | URLSearchParams,
): ExerciseFilters {
  const query =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  const get = (key: keyof ExerciseFilters) =>
    query.get(filterParamNames[key]) ?? '';
  const muscle = get('muscle');
  const regions = bodyRegions
    .map((item) => item.id)
    .filter((id) => get('regions').split(',').includes(id));
  const purpose = get('purpose');
  const equipment = get('equipment');
  const kind = get('kind');
  const unit = get('unit');
  return {
    aaos: get('aaos') === 'aaos',
    purpose:
      purpose === 'mine' || Object.hasOwn(purposeLabels, purpose)
        ? (purpose as ExerciseFilters['purpose'])
        : '',
    equipment:
      equipment === 'available' || Object.hasOwn(equipmentLabels, equipment)
        ? (equipment as ExerciseFilters['equipment'])
        : '',
    level: Object.hasOwn(technicalLevelLabels, get('level'))
      ? (get('level') as ExerciseFilters['level'])
      : '',
    term: get('term'),
    regions,
    muscle: Object.hasOwn(muscleGroups, muscle)
      ? (muscle as MuscleGroupId)
      : '',
    kind: kind === 'strength' || kind === 'mobility' ? kind : '',
    unit: unit === 'reps' || unit === 'time' ? unit : '',
    oneSide: get('oneSide') === '1',
    favouritesOnly: get('favouritesOnly') === '1',
    levelFit: get('levelFit') === '1',
  };
}

/** Applies a patch onto existing params; empty values remove the parameter. */
export function filtersToParams(
  patch: Partial<ExerciseFilters>,
  base: string | URLSearchParams = '',
): URLSearchParams {
  const next = new URLSearchParams(base);
  for (const [name, value] of Object.entries(patch)) {
    const param = filterParamNames[name as keyof ExerciseFilters];
    if (Array.isArray(value)) {
      const ids = bodyRegions
        .map((item) => item.id)
        .filter((id) => value.includes(id));
      if (ids.length) next.set(param, ids.join(','));
      else next.delete(param);
    } else if (value) next.set(param, value === true ? '1' : String(value));
    else next.delete(param);
  }
  return next;
}
