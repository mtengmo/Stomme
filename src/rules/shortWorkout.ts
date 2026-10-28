import { exercises } from '../content/exercises';
import type { PlannedExercise, ProgramId } from '../domain/types';
import { repTempo } from './repTempo';

/** A planning estimate: includes movement, holds, all rests, setup and transitions. */
export function estimateWorkoutMinutes(
  plan: readonly PlannedExercise[],
): number {
  const seconds = plan.reduce((total, item, index) => {
    const exercise = exercises[item.exerciseId];
    const sides = item.sides?.length ?? (exercise.perSide ? 2 : 1);
    const perUnit =
      exercise.unit === 'reps'
        ? (repTempo(item.exerciseId)?.repMs ?? 5_000) / 1_000
        : { seconds: 1, meters: 1 / 1.2, laps: 30 }[exercise.unit];
    return (
      total +
      item.sets * sides * item.target * perUnit +
      Math.max(0, item.sets - 1) * item.restSec +
      item.sets * 15 +
      (index < plan.length - 1 ? item.restSec + 45 : 0)
    );
  }, 0);
  return Math.ceil(seconds / 60);
}

export interface ShortWorkoutResult {
  plan: PlannedExercise[];
  estimatedMinutes: number;
  fullEstimatedMinutes: number;
}

/** Spread up to four exercises across the full order; cap each at two sets. */
export function shortWorkoutPlan(
  fullPlan: readonly PlannedExercise[],
  programId: ProgramId,
  isCustom = false,
): ShortWorkoutResult | null {
  if (programId === 'rehab' || isCustom || !fullPlan.length) return null;
  const count = Math.min(4, fullPlan.length);
  const indices = Array.from({ length: count }, (_, index) =>
    count === 1 ? 0 : Math.round((index * (fullPlan.length - 1)) / (count - 1)),
  );
  const plan = indices.map((index) => ({
    ...(fullPlan[index] as PlannedExercise),
    sets: Math.min(2, (fullPlan[index] as PlannedExercise).sets),
    sides: fullPlan[index]?.sides ? [...fullPlan[index].sides] : undefined,
  }));
  const estimatedMinutes = estimateWorkoutMinutes(plan);
  const fullEstimatedMinutes = estimateWorkoutMinutes(fullPlan);
  if (estimatedMinutes >= fullEstimatedMinutes) return null;
  return { plan, estimatedMinutes, fullEstimatedMinutes };
}
