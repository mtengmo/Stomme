import type { Exercise } from '../domain/types';
import { variantEquipment } from './exerciseMetadata';

/** Implement identity comes from structured variants, never from translated labels. */
export function loadPresentation(
  exercise: Exercise,
  index: number,
  variantId?: string,
) {
  const { load, equipment, variant } = variantEquipment(
    exercise.id,
    index,
    variantId,
  );
  const cue = variant.cue;
  const tips = [...exercise.tips];
  if (exercise.id === 'goblet-chair-squat' && equipment)
    tips[0] = `Ställ en stadig stol bakom dig och stå med fötterna ungefär höftbrett. ${cue}`;
  if (exercise.id === 'goblet-squat' && equipment)
    tips[0] = `Stå med fötterna ungefär axelbrett och hela fötterna i golvet. ${cue}`;
  return {
    load: exercise.loadLadder[index] ?? load,
    equipment,
    cue,
    tips,
    variant,
  };
}
