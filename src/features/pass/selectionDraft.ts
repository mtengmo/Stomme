import { selectedTemplate } from '../../content/alternatives';
import type { ExerciseId, TemplateId } from '../../domain/types';

const key = (id: TemplateId) => `stomme.pass-choice.v1.${id}`;

/** A pre-start draft belongs to this tab; it is not a workout or a backup field. */
export function readChoiceDraft(id: TemplateId): ExerciseId[] | undefined {
  try {
    const stored = sessionStorage.getItem(key(id));
    if (!stored) return undefined;
    const raw: unknown = JSON.parse(stored);
    if (!Array.isArray(raw)) throw new Error('Invalid exercise draft');
    return selectedTemplate(id, raw).items.map((item) => item.exerciseId);
  } catch {
    writeChoiceDraft(id);
    return undefined;
  }
}

export function writeChoiceDraft(
  id: TemplateId,
  selection?: readonly ExerciseId[],
): void {
  try {
    if (selection) {
      selectedTemplate(id, selection);
      sessionStorage.setItem(key(id), JSON.stringify(selection));
    } else {
      sessionStorage.removeItem(key(id));
    }
  } catch {
    // Private browsing may deny storage. The current preview still works.
  }
}
