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
  'goblet-squat': 'E12',
  'kettlebell-deadlift': 'E13',
  'dumbbell-rdl': 'E14',
  'supported-row': 'E15',
  'floor-press': 'E16',
  'shoulder-press': 'E17',
  'farmer-carry': 'E18',
  'biceps-curl': 'E19',
  'hammer-curl': 'E20',
  'lateral-raise': 'E21',
  'triceps-kickback': 'E22',
  'glute-bridge': 'E23',
  'reverse-lunge': 'E24',
  'forward-lunge': 'E25',
  'kettlebell-swing': 'E26',
  'kettlebell-press': 'E27',
  'half-squat': 'E28',
  'hamstring-curl': 'E29',
  'seated-knee-extension': 'E30',
  'straight-leg-raise': 'E31',
  'prone-leg-raise': 'E32',
  'side-lying-hip-abduction': 'E33',
  'side-lying-hip-adduction': 'E34',
  'calf-stretch': 'E35',
  'quadriceps-stretch': 'E36',
  'hamstring-stretch': 'E37',
  'band-leg-press': 'E38',
  'kettlebell-floor-press': 'E39',
  'kettlebell-rack-carry': 'E40',
};

export function exerciseReviewHref(id: ExerciseId): string {
  return `/granska?ovning=${exerciseReferences[id]}`;
}
