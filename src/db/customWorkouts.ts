import { exercises } from '../content/exercises';
import type { ExerciseId, PlannedExercise } from '../domain/types';
import { formatShortDate, toLocalDate } from '../lib/dates';
import { getDb } from './db';

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

export const maxWorkoutExercises = 12;
export const maxCustomWorkouts = 30;

/** "Eget pass 29 okt" from a local ISO date. */
export function autoWorkoutName(date: string): string {
  return `Eget pass ${formatShortDate(date).replace(/\.$/, '')}`;
}

async function updateWorkouts(
  change: (current: CustomWorkout[]) => CustomWorkout[],
): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.meta, async () => {
    const current = readCustomWorkouts(
      (await db.meta.get('customWorkouts'))?.value,
    );
    await db.meta.put({ key: 'customWorkouts', value: change(current) });
  });
}

export async function createCustomWorkout(
  exerciseIds: ExerciseId[],
  plan: PlannedExercise[] | undefined,
  date = toLocalDate(new Date()),
): Promise<string> {
  const id = crypto.randomUUID();
  await updateWorkouts((current) => {
    if (current.length >= maxCustomWorkouts) throw new Error('limit');
    return [
      ...current,
      {
        id,
        name: autoWorkoutName(date),
        exerciseIds,
        ...(plan ? { plan } : {}),
      },
    ];
  });
  return id;
}

export async function deleteCustomWorkout(id: string): Promise<void> {
  await updateWorkouts((current) => current.filter((item) => item.id !== id));
}

/** Appends exercises; the stored dose is only extended when it exists. */
export async function appendToCustomWorkout(
  id: string,
  exerciseIds: ExerciseId[],
  plan: PlannedExercise[] | undefined,
): Promise<void> {
  await updateWorkouts((current) => {
    const target = current.find((item) => item.id === id);
    if (!target) throw new Error('missing');
    const merged = [...target.exerciseIds, ...exerciseIds];
    if (
      new Set(merged).size !== merged.length ||
      merged.length > maxWorkoutExercises
    )
      throw new Error('limit');
    const keepPlan =
      target.plan &&
      plan &&
      target.plan.map((item) => item.exerciseId).join() ===
        target.exerciseIds.join();
    const { plan: _old, ...rest } = target;
    const next: CustomWorkout = {
      ...rest,
      exerciseIds: merged,
      ...(keepPlan ? { plan: [...(target.plan ?? []), ...plan] } : {}),
    };
    return current.map((item) => (item.id === id ? next : item));
  });
}
