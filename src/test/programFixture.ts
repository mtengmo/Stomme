import type { TrainingProgram } from '../domain/types';

/** A valid two-day programme with a pass id of prog-1. */
export const programFixture = (
  over: Partial<TrainingProgram> = {},
): TrainingProgram => ({
  id: 'prog-1',
  block: 1,
  createdAt: '2026-11-03T08:00:00.000Z',
  startDate: '2026-11-03',
  daysPerWeek: 2,
  emphasis: 'full',
  weekdays: [2, 5],
  passes: [
    {
      focus: 'full',
      template: 'A',
      exerciseIds: [
        'goblet-chair-squat',
        'glute-bridge',
        'back-extension',
        'knee-push-up',
        'dead-bug',
      ],
    },
    {
      focus: 'full',
      template: 'B',
      exerciseIds: ['glute-bridge', 'wall-sit', 'wall-push-up', 'plank'],
    },
  ],
  curated: true,
  ...over,
});
