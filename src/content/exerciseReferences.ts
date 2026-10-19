import type { ExerciseId } from '../domain/types';

/** Permanent display references, independent of catalogue or workout order. */
export const exerciseReferences: Record<ExerciseId, string> = {
  'goblet-chair-squat': 'E01',
  'step-up': 'E02',
  'single-leg-rdl': 'E03',
  'dead-bug': 'E04',
  'side-plank': 'E05',
  'split-squat': 'E06',
  'single-leg-hip-thrust': 'E07',
  'single-leg-calf-raise': 'E08',
  'suitcase-carry': 'E09',
  'bird-dog': 'E10',
  'wall-sit': 'E11',
};

export function exerciseReviewHref(id: ExerciseId): string {
  return `/granska?ovning=${exerciseReferences[id]}`;
}
