import type { ExerciseId } from '../domain/types';
import type { WorkoutGroup } from './focusPresets';

/** A ready-made workout the user can add with one tap; it becomes an ordinary saved workout. */
export interface ReadyWorkout {
  id: string;
  name: string;
  group: WorkoutGroup;
  /** One sentence under the title. */
  summary: string;
  /** Safety text shown with it. */
  caution: string;
  exerciseIds: readonly ExerciseId[];
}

export const readyWorkouts: readonly ReadyWorkout[] = [
  {
    id: 'running-strength',
    name: 'Löpstyrka',
    group: 'legs',
    summary:
      'Åtta övningar för ben och höfter som liknar kraven i löpsteget: enbensstyrka, hållning och mjuka landningar.',
    caution:
      'Pogohopp är ett hopp och hoppövningar passar inte vid knä-, fot- eller vadbesvär. Hoppa över dem och avbryt vid smärta. Ändra utrustning, antal och vikt i passet före start.',
    exerciseIds: [
      'step-down',
      'rear-foot-split-squat',
      'single-leg-rdl',
      'single-leg-hip-thrust',
      'single-leg-calf-raise',
      'copenhagen-hold',
      'isometric-lunge-hold',
      'plate-pogos',
    ],
  },
];
