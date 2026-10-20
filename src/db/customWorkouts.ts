import { exercises } from '../content/exercises';
import type { ExerciseId, PlannedExercise } from '../domain/types';

export interface CustomWorkout {
  id: string;
  name: string;
  exerciseIds: ExerciseId[];
  plan?: PlannedExercise[];
}
export function readCustomWorkouts(value: unknown): CustomWorkout[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CustomWorkout =>
      item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0 &&
      item.name.length <= 60 &&
      Array.isArray(item.exerciseIds) &&
      item.exerciseIds.length > 0 &&
      item.exerciseIds.length <= 12 &&
      new Set(item.exerciseIds).size === item.exerciseIds.length &&
      item.exerciseIds.every((id: string) => Object.hasOwn(exercises, id)),
  );
}
