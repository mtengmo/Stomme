import type { ExerciseId, TemplateId } from '../domain/types';
import { rehabAdditions } from './rehabAdditions';

export interface RosterSlot {
  id: string;
  /** Ordered from easiest to hardest. */
  candidates: ExerciseId[];
}

const pull: ExerciseId[] = [
  'back-extension',
  'bird-dog',
  'supported-row',
  'chin-up',
  'pull-up',
];

/** Ordered candidate lists per movement slot for the general programme. */
export const generalSlots: Record<TemplateId, RosterSlot[]> = {
  A: [
    {
      id: 'squat',
      candidates: ['goblet-chair-squat', 'goblet-squat', 'squat-jump'],
    },
    {
      id: 'hinge',
      candidates: [
        'glute-bridge',
        'dumbbell-rdl',
        'kettlebell-deadlift',
        'single-leg-rdl',
        'kettlebell-swing',
      ],
    },
    { id: 'pull', candidates: pull },
    {
      id: 'horizontal-press',
      // Floor press stays before the kettlebell version: it is the dumbbell default.
      candidates: [
        'floor-press',
        'kettlebell-floor-press',
        'knee-push-up',
        'push-up',
        'parallel-dip',
      ],
    },
    {
      id: 'carry',
      candidates: ['farmer-carry', 'suitcase-carry', 'kettlebell-rack-carry'],
    },
    {
      id: 'core',
      candidates: [
        'dead-bug',
        'plank',
        'side-plank',
        'lying-leg-raise',
        'mountain-climber',
        'burpee',
      ],
    },
  ],
  B: [
    {
      id: 'bridge',
      candidates: ['glute-bridge', 'single-leg-hip-thrust'],
    },
    {
      id: 'split-leg',
      candidates: [
        'step-up',
        'split-squat',
        'reverse-lunge',
        'forward-lunge',
        'jumping-lunge',
      ],
    },
    {
      id: 'overhead',
      candidates: ['lateral-raise', 'shoulder-press', 'kettlebell-press'],
    },
    { id: 'pull', candidates: pull },
    {
      id: 'arms',
      candidates: ['hammer-curl', 'biceps-curl', 'triceps-kickback'],
    },
    {
      id: 'side-core',
      candidates: ['plank', 'side-plank', 'lying-leg-raise'],
    },
  ],
};

/** Rehab library additions never enter a general roster; `optional` is not a reliable marker. */
export const rehabAdditionIds: ReadonlySet<ExerciseId> = new Set(
  rehabAdditions.map((exercise) => exercise.id),
);

/** Impact exercises are left out once pain or symptoms are on record. */
export const impactExercises: ReadonlySet<ExerciseId> = new Set([
  'squat-jump',
  'jumping-lunge',
  'burpee',
]);

/** Same-slot easier exercises used when a running template exercise is above the user's level. */
export const runningEasier: Partial<Record<ExerciseId, ExerciseId[]>> = {
  'single-leg-rdl': ['dumbbell-rdl', 'glute-bridge'],
  'side-plank': ['plank', 'dead-bug'],
  'split-squat': ['step-up', 'goblet-chair-squat', 'wall-sit'],
  'single-leg-hip-thrust': ['glute-bridge'],
  'single-leg-calf-raise': ['calf-raise'],
};
