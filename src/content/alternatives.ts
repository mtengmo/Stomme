import type {
  ExerciseId,
  Session,
  TemplateId,
  TemplateItem,
  WorkoutTemplate,
} from '../domain/types';
import { templates } from './templates';

// Deliberate choices for these programme slots, not a same-muscle swap rule.
// Each replacement has its own base prescription; progression reads its ID.
const alternatives: Partial<Record<ExerciseId, readonly TemplateItem[]>> = {
  'goblet-chair-squat': [
    { exerciseId: 'step-up', sets: 2, restSec: 60 },
    { exerciseId: 'split-squat', sets: 2, restSec: 60 },
  ],
  'step-up': [
    { exerciseId: 'goblet-chair-squat', sets: 2, restSec: 60 },
    { exerciseId: 'split-squat', sets: 2, restSec: 60 },
  ],
  'split-squat': [
    { exerciseId: 'goblet-chair-squat', sets: 2, restSec: 60 },
    { exerciseId: 'step-up', sets: 2, restSec: 60 },
  ],
  'dead-bug': [{ exerciseId: 'bird-dog', sets: 2, restSec: 60 }],
  'bird-dog': [{ exerciseId: 'dead-bug', sets: 2, restSec: 60 }],
};

export function exerciseChoices(
  templateId: TemplateId,
  slot: number,
): readonly TemplateItem[] {
  const item = templates[templateId]?.items[slot];
  return item ? [item, ...(alternatives[item.exerciseId] ?? [])] : [];
}

/** Reject the entire selection before starting a transaction or writing meta. */
export function selectedTemplate(
  templateId: TemplateId,
  selection?: readonly ExerciseId[],
): WorkoutTemplate {
  const template = templates[templateId];
  if (!Object.hasOwn(templates, templateId)) {
    throw new Error('Unknown workout template');
  }
  if (selection === undefined) return template;
  if (
    !Array.isArray(selection) ||
    selection.length !== template.items.length ||
    new Set(selection).size !== selection.length
  ) {
    throw new Error('Incomplete or duplicate exercise selection');
  }
  const items = Array.from(selection).map((id, slot) => {
    const choice = exerciseChoices(templateId, slot).find(
      (item) => item.exerciseId === id,
    );
    if (!choice) throw new Error('Exercise is not available for this slot');
    return { ...choice };
  });
  return { ...template, items };
}

/**
 * Rebuild the chosen roster, never the default roster. For known slots recover
 * base sets (a week-3 snapshot may already contain an extra set). Preserve
 * snapshot rest and unfamiliar older/imported prescriptions as they were.
 * Wall sit is an optional extra, handled separately by the caller.
 */
export function snapshotTemplate(session: Session): WorkoutTemplate {
  const roster = session.plan.filter((item) => item.exerciseId !== 'wall-sit');
  // Older or interrupted sessions may have no saved roster to recover.
  if (roster.length === 0) return templates[session.templateId];
  return {
    ...templates[session.templateId],
    items: roster.map((item, slot) => ({
      exerciseId: item.exerciseId,
      sets:
        exerciseChoices(session.templateId, slot).find(
          (choice) => choice.exerciseId === item.exerciseId,
        )?.sets ?? item.sets,
      restSec: item.restSec,
    })),
  };
}
