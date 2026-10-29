import { exerciseSearchText } from '../content/exerciseAliases';
import {
  type EquipmentType,
  equipmentLabels,
  exerciseMetadata,
  type Purpose,
  type TechnicalLevel,
} from '../content/exerciseMetadata';
import { exerciseReferences } from '../content/exerciseReferences';
import {
  bodyRegions,
  exerciseMuscles,
  type MuscleGroupId,
} from '../content/muscles';
import type {
  BodyRegionId,
  EquipmentChoice,
  Exercise,
  ExerciseId,
} from '../domain/types';
import { equipmentFits } from './equipment';

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
  inventory: EquipmentChoice[],
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
  region: BodyRegionId | '';
  muscle: MuscleGroupId | '';
  /** Strength or mobility, from the exercise metadata. */
  kind: 'strength' | 'mobility' | '';
  /** Counted in repetitions or held/timed in seconds. */
  unit: 'reps' | 'time' | '';
  /** Only exercises done one side at a time. */
  oneSide: boolean;
  favouritesOnly: boolean;
}

export const emptyExerciseFilters: ExerciseFilters = {
  purpose: '',
  equipment: '',
  level: '',
  term: '',
  region: '',
  muscle: '',
  kind: '',
  unit: '',
  oneSide: false,
  favouritesOnly: false,
};

export interface ExerciseFilterContext {
  inventory: EquipmentChoice[];
  mine?: Set<string>;
  /** Undefined while favourites are loading: "only favourites" then shows nothing. */
  favourites?: readonly ExerciseId[];
}

export interface FilteredExercises {
  /** Matches, or with a region/muscle the exercises that mainly train it. */
  primary: Exercise[];
  /** With a region/muscle: matches where it is only a supporting muscle. */
  supporting: Exercise[];
}

export function filterExercises(
  list: readonly Exercise[],
  filters: ExerciseFilters,
  context: ExerciseFilterContext,
): FilteredExercises {
  const mine = context.mine ?? new Set<string>();
  const muscles: readonly MuscleGroupId[] | null = filters.muscle
    ? [filters.muscle]
    : filters.region
      ? (bodyRegions.find((region) => region.id === filters.region)?.muscles ??
        [])
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
  inventory: EquipmentChoice[],
): string[] {
  let best: string[] | undefined;
  for (const variant of exerciseMetadata[id].variants) {
    const missing = variant.equipment
      .filter((item) => !equipmentFits([item], inventory))
      .map((item) => equipmentLabels[item.type]);
    if (!missing.length) return [];
    if (!best || missing.length < best.length) best = missing;
  }
  return best ?? [];
}
