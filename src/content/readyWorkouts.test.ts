import { describe, expect, it } from 'vitest';
import { maxWorkoutExercises } from '../db/customWorkouts';
import { readAuditLog } from './exerciseAudit';
import { exercises } from './exercises';
import { readyWorkouts } from './readyWorkouts';
import { isRetiredExercise } from './retiredExercises';
import { plyometricIds, runningSlots } from './runningProposals';
import { ballisticIds, unresolvedFigureIssueIds } from './widePool';

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

  it('Snabbt helkroppspass is fixed, ordered and not a running start', () => {
    const workout = readyWorkouts.find((w) => w.id === 'dumbbell-full-body');
    expect(workout?.name).toBe('Snabbt helkroppspass med hantlar');
    expect(workout?.fixed).toBe(true);
    expect(workout?.group).toBe('full');
    expect(workout?.runningStart).toBeUndefined();
    expect(workout?.exerciseIds).toEqual([
      'thruster',
      'forward-lunge',
      'renegade-row',
      'push-up',
      'weighted-sit-up',
    ]);
    expect(
      readyWorkouts.filter((w) => w.runningStart).map((w) => w.id),
    ).toEqual(['running-strength', 'runner-ten', 'runner-home']);
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

/**
 * Ready workouts sit outside the beginner set and the wide pool on purpose
 * (copenhagen-hold and isometric-lunge-hold are programme-excluded). They
 * still need clean figures.
 */
describe('ready workouts as programme passes', () => {
  const needsFix = new Set(
    readAuditLog()
      .filter((e) => e.status === 'needs-fix')
      .map((e) => e.id),
  );
  const all = new Set([
    ...readyWorkouts.flatMap((w) => w.exerciseIds),
    ...runningSlots.flatMap((s) => s.options),
  ]);

  it('holds no needs-fix, unresolved, retired or ballistic exercise', () => {
    for (const id of all) {
      expect(needsFix.has(id), id).toBe(false);
      expect(unresolvedFigureIssueIds.has(id), id).toBe(false);
      expect(isRetiredExercise(id), id).toBe(false);
      // plate-pogos is the one allowed jump; level new drops it elsewhere.
      if (!plyometricIds.has(id)) expect(ballisticIds.has(id), id).toBe(false);
    }
  });
});
