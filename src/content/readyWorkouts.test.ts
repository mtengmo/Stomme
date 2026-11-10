import { describe, expect, it } from 'vitest';
import { maxWorkoutExercises } from '../db/customWorkouts';
import { exercises } from './exercises';
import { readyWorkouts } from './readyWorkouts';
import { isRetiredExercise } from './retiredExercises';

describe('ready-made workouts', () => {
  it('have unique ids and names, and Löpstyrka stays first', () => {
    expect(readyWorkouts[0]?.id).toBe('running-strength');
    expect(new Set(readyWorkouts.map((w) => w.id)).size).toBe(
      readyWorkouts.length,
    );
    expect(new Set(readyWorkouts.map((w) => w.name)).size).toBe(
      readyWorkouts.length,
    );
  });

  it('only use existing, active exercises, once each, within the size limit', () => {
    for (const workout of readyWorkouts) {
      expect(new Set(workout.exerciseIds).size).toBe(
        workout.exerciseIds.length,
      );
      expect(workout.exerciseIds.length).toBeLessThanOrEqual(
        maxWorkoutExercises,
      );
      for (const id of workout.exerciseIds) {
        expect(exercises[id], `${workout.id}: ${id}`).toBeDefined();
        expect(isRetiredExercise(id), `${workout.id}: ${id} retired`).toBe(
          false,
        );
      }
    }
  });

  it('Löparens tio has the ten exercises in order and warns about the hop', () => {
    const workout = readyWorkouts.find((w) => w.id === 'runner-ten');
    expect(workout?.fixed).toBe(true);
    expect(workout?.exerciseIds).toEqual([
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
    ]);
    expect(workout?.caution).toContain('Pogohopp');
  });

  it('Hemmapass för löpare is four bodyweight exercises and says what was substituted', () => {
    const workout = readyWorkouts.find((w) => w.id === 'runner-home');
    expect(workout?.fixed).toBe(true);
    expect(workout?.exerciseIds).toEqual([
      'goblet-chair-squat',
      'glute-bridge',
      'single-leg-floor-bridge',
      'split-squat',
    ]);
    expect(workout?.caution).toContain('Närmaste övningar');
  });
});
