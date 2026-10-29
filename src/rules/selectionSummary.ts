import { bodyRegions, exerciseMuscles } from '../content/muscles';
import type {
  BodyRegionId,
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../domain/types';
import { estimateWorkoutMinutes } from './shortWorkout';

export interface SelectionSummary {
  count: number;
  /** Regions with at least one pick, in the order of `bodyRegions`. */
  regions: { id: BodyRegionId; label: string; count: number }[];
  /** Undefined in rehab, without setup and before the first pick. */
  minutes?: number;
}

/** The region of an exercise's first primary muscle, if it has one. */
export function regionOfExercise(id: ExerciseId): BodyRegionId | undefined {
  const [first] = exerciseMuscles[id].primary;
  return first
    ? bodyRegions.find((region) => region.muscles.includes(first))?.id
    : undefined;
}

export function selectionSummary(
  ids: readonly ExerciseId[],
  preferences?: TrainingPreferences,
  /** Dose for the picks (the host owns the plan rules); no plan, no estimate. */
  planFor?: (ids: readonly ExerciseId[]) => PlannedExercise[] | undefined,
): SelectionSummary {
  const counts = new Map<BodyRegionId, number>();
  for (const id of ids) {
    const region = regionOfExercise(id);
    if (region) counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  const regions = bodyRegions
    .filter((region) => counts.has(region.id))
    .map((region) => ({
      id: region.id,
      label: region.label,
      count: counts.get(region.id) ?? 0,
    }));
  const plan =
    preferences && preferences.programId !== 'rehab' && ids.length
      ? planFor?.(ids)
      : undefined;
  const minutes = plan ? estimateWorkoutMinutes(plan) : undefined;
  return {
    count: ids.length,
    regions,
    ...(minutes !== undefined ? { minutes } : {}),
  };
}

/** "3 av 12 övningar · Ben & säte 2 · Bål 1 · ca 18 min" as separate parts. */
export function selectionSummaryText(
  summary: SelectionSummary,
  max: number,
): { head: string; regions: string; minutes: string } {
  return {
    head: summary.count
      ? `${summary.count} av ${max} övningar`
      : 'Inga övningar valda än.',
    regions: summary.regions
      .map((region) => `${region.label} ${region.count}`)
      .join(' · '),
    minutes: summary.minutes !== undefined ? `ca ${summary.minutes} min` : '',
  };
}
