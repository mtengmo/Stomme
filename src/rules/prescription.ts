import { exercises } from '../content/exercises';
import type {
  PlannedExercise,
  ReasonCode,
  WorkoutTemplate,
} from '../domain/types';

/** Week 3 and later: at least three sets, never fewer than the template. */
export function setsForWeek(templateSets: number, programWeek: number): number {
  return programWeek >= 3 ? Math.max(templateSets, 3) : templateSets;
}

/**
 * Interim prescription (replaced by progression rules in M4): target is the
 * start of the range, the load follows the programme week, sets follow setsForWeek.
 */
export function interimPlan(
  template: WorkoutTemplate,
  programWeek: number,
): PlannedExercise[] {
  return template.items.map((item) => {
    const ex = exercises[item.exerciseId];
    const week1 = programWeek <= 1;
    const loadIndex = week1 ? ex.week1LoadIndex : ex.startLoadIndex;
    const reason: ReasonCode = week1
      ? ex.week1LoadIndex !== ex.startLoadIndex
        ? 'week1_bodyweight'
        : 'first_time'
      : 'start_load';
    return {
      exerciseId: item.exerciseId,
      sets: setsForWeek(item.sets, programWeek),
      target: ex.range.start,
      loadIndex,
      weightKg: ex.loadLadder[loadIndex]?.kg ?? 0,
      restSec: item.restSec,
      reason,
    };
  });
}
