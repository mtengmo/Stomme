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
  /** A fixed list shown as is, with no proposals to choose between. */
  fixed?: boolean;
}

export const readyWorkouts: readonly ReadyWorkout[] = [
  {
    id: 'running-strength',
    name: 'Löpstyrka',
    group: 'legs',
    summary:
      'Ben och höfter som liknar kraven i löpsteget: enbensstyrka, hållning och mjuka landningar. Välj ett av tre förslag eller slumpa ett nytt.',
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
  {
    id: 'runner-ten',
    name: 'Löparens tio',
    group: 'legs',
    fixed: true,
    summary:
      'Tio övningar för löpare, i den ordning de brukar visas: enbensstyrka, vader, hållning och reaktiv styrka.',
    caution:
      'Pogohopp är ett hopp och hoppövningar passar inte vid knä-, fot- eller vadbesvär. Hoppa över dem och avbryt vid smärta. Ändra utrustning, antal och vikt i passet före start.',
    exerciseIds: [
      'rear-foot-split-squat',
      'kettlebell-goblet-squat',
      'plate-pogos',
      'single-leg-rdl',
      'single-leg-calf-raise',
      'walking-lunge',
      'single-leg-hip-thrust',
      'wall-tibialis-raise',
      'isometric-lunge-hold',
      'copenhagen-hold',
    ],
  },
  {
    id: 'runner-home',
    name: 'Hemmapass för löpare',
    group: 'legs',
    fixed: true,
    summary:
      'Kort hempass med kroppsvikt: stolsknäböj, två bryggor och utfall. Kör 2–3 varv med långsamma, kontrollerade rörelser.',
    caution:
      'Närmaste övningar i appen: tvåbent stolsknäböj, vanlig brygga och utfall utan rotation. Gör varje rörelse långsamt och avbryt vid smärta.',
    exerciseIds: [
      'goblet-chair-squat',
      'glute-bridge',
      'single-leg-floor-bridge',
      'split-squat',
    ],
  },
];
