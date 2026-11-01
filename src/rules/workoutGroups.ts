import type { WorkoutGroup } from '../content/focusPresets';
import {
  bodyRegions,
  exerciseMuscles,
  type MuscleGroupId,
} from '../content/muscles';
import type { ExerciseId } from '../domain/types';

export interface WorkoutGroupInput {
  exerciseIds: ExerciseId[];
  group?: WorkoutGroup;
}

const push = new Set<MuscleGroupId>(['chest', 'shoulders', 'triceps']);
const pull = new Set<MuscleGroupId>(['back', 'biceps', 'forearms']);
const legs = new Set<MuscleGroupId>(
  bodyRegions
    .filter((region) => region.id === 'legs')
    .flatMap((region) => region.muscles),
);
const upper = new Set<MuscleGroupId>([...push, ...pull]);

/** Primary muscles represented by a custom workout, with core excluded. */
export function workoutMuscles(
  workout: Pick<WorkoutGroupInput, 'exerciseIds'>,
): MuscleGroupId[] {
  const result = new Set<MuscleGroupId>();
  for (const id of workout.exerciseIds) {
    for (const muscle of exerciseMuscles[id].primary) {
      if (muscle !== 'core') result.add(muscle);
    }
  }
  return [...result];
}

/** Explicit group choice takes precedence; otherwise infer it from primary muscles. */
export function groupOf(workout: WorkoutGroupInput): WorkoutGroup {
  if (workout.group) return workout.group;
  const muscles = workoutMuscles(workout);
  if (muscles.length === 0) return 'other';
  if (muscles.every((muscle) => push.has(muscle))) return 'push';
  if (muscles.every((muscle) => pull.has(muscle))) return 'pull';
  if (muscles.every((muscle) => legs.has(muscle))) return 'legs';
  if (muscles.every((muscle) => upper.has(muscle))) return 'upper';
  if (
    muscles.some((muscle) => upper.has(muscle)) &&
    muscles.some((muscle) => legs.has(muscle))
  )
    return 'full';
  return 'other';
}
