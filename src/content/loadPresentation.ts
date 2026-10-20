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
  if (exercise.id === 'goblet-chair-squat') tips[1] = cue;
  if (exercise.id === 'single-leg-rdl' && !equipment) tips[2] = cue;
  if (exercise.id === 'split-squat' && equipment)
    tips[2] = 'Upprätt överkropp. Välj kroppsvikt om du behöver handstöd.';
  if (exercise.id === 'goblet-squat' && !equipment)
    tips[0] =
      'Stå stadigt med hela fötterna i golvet och armarna framför kroppen.';
  return {
    load: exercise.loadLadder[index] ?? load,
    equipment,
    cue,
    tips,
    variant,
  };
}
