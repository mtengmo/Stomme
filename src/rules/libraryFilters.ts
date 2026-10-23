import { exerciseSearchText } from '../content/exerciseAliases';
import {
  type EquipmentType,
  exerciseMetadata,
  type Purpose,
  type TechnicalLevel,
} from '../content/exerciseMetadata';
import { exerciseReferences } from '../content/exerciseReferences';
import type { EquipmentChoice, Exercise } from '../domain/types';
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
