import { describe, expect, it } from 'vitest';
import { maxWorkoutExercises } from '../db/customWorkouts';
import { readAuditLog } from './exerciseAudit';
import { exercises } from './exercises';
import { readyWorkouts } from './readyWorkouts';
import { isRetiredExercise } from './retiredExercises';
import {
  plyometricIds,
  readyBallisticIds,
  runningSlots,
} from './runningProposals';
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

  it('Löparens kraftpass has the seven exercises in order and warns about the ballistic work', () => {
    const workout = readyWorkouts.find((w) => w.id === 'runner-power-seven');
    expect(workout).toMatchObject({
      name: 'Löparens kraftpass',
      group: 'legs',
      fixed: true,
      runningStart: true,
    });
    expect(workout?.exerciseIds).toEqual([
      'skater-bound',
      'single-leg-calf-raise',
      'kettlebell-swing',
      'dumbbell-rdl',
      'rear-foot-split-squat',
      'single-leg-rdl',
      'kettlebell-goblet-squat',
    ]);
    expect(workout?.caution).toContain('ballistiska');
    expect(workout?.caution).toContain('knä-, fot- eller vadbesvär');
    expect(workout?.caution).toContain('neutral rygg');
  });

  it('Löparens fem has the five closest exercises in order and is honest about substitutions', () => {
    const workout = readyWorkouts.find((w) => w.id === 'runner-five-london');
    expect(workout).toMatchObject({
      name: 'Löparens fem',
      group: 'legs',
      fixed: true,
      runningStart: true,
    });
    expect(workout?.exerciseIds).toEqual([
      'lunge-with-rotation',
      'single-leg-rdl',
      'lateral-raise',
      'plate-pogos',
      'forward-lunge',
    ]);
    expect(workout?.exerciseIds).not.toContain('knee-drive');
    expect(workout?.summary).toContain('närmaste');
    expect(workout?.summary).toContain('progression');
    expect(workout?.caution).toContain('Pogohopp');
    expect(workout?.caution).toContain('armlyft');
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
    ).toEqual([
      'running-strength',
      'runner-ten',
      'runner-home',
      'runner-power-seven',
      'runner-five-london',
    ]);
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
  const slotIds = new Set(runningSlots.flatMap((s) => s.options));
  const workoutIds = new Set(readyWorkouts.flatMap((w) => w.exerciseIds));
  const all = new Set([...workoutIds, ...slotIds]);

  it('holds no needs-fix, unresolved or retired exercise', () => {
    for (const id of all) {
      expect(needsFix.has(id), id).toBe(false);
      expect(unresolvedFigureIssueIds.has(id), id).toBe(false);
      expect(isRetiredExercise(id), id).toBe(false);
    }
  });

  it('keeps ballistic work out of the Löpstyrka slots except the one jump', () => {
    for (const id of slotIds)
      if (!plyometricIds.has(id)) expect(ballisticIds.has(id), id).toBe(false);
  });

  it('holds ballistic work in fixed workouts only (and Löpstyrka), and only readyBallisticIds', () => {
    for (const workout of readyWorkouts)
      for (const id of workout.exerciseIds) {
        if (!ballisticIds.has(id)) continue;
        expect(readyBallisticIds.has(id), `${workout.id}: ${id}`).toBe(true);
        if (workout.id !== 'running-strength')
          expect(workout.fixed, `${workout.id}: ${id}`).toBe(true);
      }
  });
});
