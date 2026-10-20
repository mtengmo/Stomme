import { exerciseMetadata } from '../content/exerciseMetadata';
import { exerciseList } from '../content/exercises';
import { templates } from '../content/templates';
import type {
  ExerciseId,
  TemplateId,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits } from './equipment';

export function initialTrainingRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
): ExerciseId[] {
  if (preferences.programId === 'rehab') return [];
  const compatible = exerciseList.filter((exercise) =>
    exerciseMetadata[exercise.id].variants.some((variant) =>
      equipmentFits(variant.equipment, preferences.equipment),
    ),
  );
  const candidates: ExerciseId[] =
    preferences.programId === 'running'
      ? templates[template].items.map((item) => item.exerciseId)
      : template === 'A'
        ? [
            'goblet-squat',
            'dumbbell-rdl',
            'supported-row',
            'floor-press',
            'farmer-carry',
            'dead-bug',
          ]
        : [
            'glute-bridge',
            'step-up',
            'shoulder-press',
            'supported-row',
            'hammer-curl',
            'side-plank',
          ];
  const ids = candidates.filter((candidate) =>
    compatible.some((exercise) => exercise.id === candidate),
  );
  if (ids.length < 3)
    for (const exercise of compatible.filter((item) =>
      [
        'goblet-chair-squat',
        'glute-bridge',
        'dead-bug',
        'bird-dog',
        'side-plank',
      ].includes(item.id),
    )) {
      if (!ids.includes(exercise.id)) ids.push(exercise.id);
      if (ids.length >= 4) break;
    }
  return ids;
}
