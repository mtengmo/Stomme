import type { TemplateId, WorkoutTemplate } from '../domain/types';

const REST_SEC = 60;

export const templates: Record<TemplateId, WorkoutTemplate> = {
  A: {
    id: 'A',
    name: 'Pass A',
    items: [
      { exerciseId: 'goblet-chair-squat', sets: 2, restSec: REST_SEC },
      { exerciseId: 'step-up', sets: 2, restSec: REST_SEC },
      { exerciseId: 'single-leg-rdl', sets: 2, restSec: REST_SEC },
      { exerciseId: 'dead-bug', sets: 2, restSec: REST_SEC },
      { exerciseId: 'side-plank', sets: 2, restSec: REST_SEC },
    ],
  },
  B: {
    id: 'B',
    name: 'Pass B',
    items: [
      { exerciseId: 'split-squat', sets: 2, restSec: REST_SEC },
      { exerciseId: 'single-leg-hip-thrust', sets: 2, restSec: REST_SEC },
      { exerciseId: 'single-leg-calf-raise', sets: 2, restSec: REST_SEC },
      { exerciseId: 'suitcase-carry', sets: 3, restSec: REST_SEC },
      { exerciseId: 'bird-dog', sets: 2, restSec: REST_SEC },
    ],
  },
};
