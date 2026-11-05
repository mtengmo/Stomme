import type { ExerciseId, TemplateId } from '../domain/types';
import type { MuscleGroupId } from './muscles';
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
        'decline-push-up',
        'diamond-push-up',
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
        'plank-arm-lift',
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

/** Impact exercises the pickers leave out in rehab. */
export const rehabImpactExercises: ReadonlySet<ExerciseId> = new Set([
  'squat-jump',
  'jumping-lunge',
  'burpee',
  'single-leg-lateral-hop',
  'box-jump',
  'fast-feet',
  'in-and-out-jump',
  'lateral-shuffle',
  'knee-drive',
  'plate-pogos',
]);

/** Explicit opt-in for daily focus. Library and clinician-only additions stay out. */
export const focusSlots: (RosterSlot & { targets: MuscleGroupId[] })[] = [
  {
    id: 'squat',
    targets: ['quads', 'glutes'],
    candidates: [
      'goblet-chair-squat',
      'goblet-squat',
      'kettlebell-goblet-squat',
      'sumo-squat',
      'squat-jump',
    ],
  },
  {
    id: 'hinge',
    targets: ['glutes', 'hamstrings'],
    candidates: [
      'glute-bridge',
      'weighted-glute-bridge',
      'dumbbell-rdl',
      'kettlebell-deadlift',
      'single-leg-rdl',
      'kettlebell-swing',
      'one-arm-kettlebell-swing',
    ],
  },
  {
    id: 'split-leg',
    targets: ['quads', 'glutes'],
    candidates: [
      'step-up',
      'split-squat',
      'reverse-lunge',
      'forward-lunge',
      'side-lunge',
      'walking-lunge',
      'jumping-lunge',
    ],
  },
  {
    id: 'horizontal-press',
    targets: ['chest', 'triceps'],
    candidates: [
      'floor-press',
      'kettlebell-floor-press',
      'knee-push-up',
      'push-up',
      'decline-push-up',
      'diamond-push-up',
      'parallel-dip',
    ],
  },
  {
    id: 'overhead',
    targets: ['shoulders'],
    candidates: ['shoulder-press', 'kettlebell-press'],
  },
  {
    id: 'row',
    targets: ['back'],
    candidates: [
      'back-extension',
      'bird-dog',
      'supported-row',
      'bent-over-row',
    ],
  },
  {
    id: 'vertical-pull',
    targets: ['back', 'biceps'],
    candidates: ['chin-up', 'pull-up'],
  },
  {
    id: 'lateral-raise',
    targets: ['shoulders'],
    candidates: ['lateral-raise'],
  },
  {
    id: 'curl',
    targets: ['biceps', 'forearms'],
    candidates: ['hammer-curl', 'biceps-curl'],
  },
  {
    id: 'arm-extension',
    targets: ['triceps'],
    candidates: ['triceps-kickback', 'overhead-triceps-extension'],
  },
  {
    id: 'calf',
    targets: ['calves'],
    candidates: ['calf-raise', 'single-leg-calf-raise'],
  },
  {
    id: 'carry',
    targets: ['core', 'forearms'],
    candidates: ['farmer-carry', 'suitcase-carry', 'kettlebell-rack-carry'],
  },
  {
    id: 'core',
    targets: ['core'],
    candidates: [
      'dead-bug',
      'plank',
      'lying-leg-raise',
      'mountain-climber',
      'plank-arm-lift',
    ],
  },
  {
    id: 'side-core',
    targets: ['core'],
    candidates: ['side-plank', 'russian-twist', 'woodchop'],
  },
];
