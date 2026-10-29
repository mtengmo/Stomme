import { exercises } from '../content/exercises';
import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../domain/types';
import { formatShortDate, toLocalDate } from '../lib/dates';
import { getDb } from './db';
import { saveTrainingPreferences } from './training';

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

export const maxWorkoutNameLength = 60;

function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase('sv-SE');
}

/** Thrown when a typed name already belongs to ANOTHER saved workout. */
export class WorkoutNameClashError extends Error {
  constructor(name: string) {
    super(`Du har redan ett pass som heter ${name}. Välj ett annat namn.`);
    this.name = 'WorkoutNameClashError';
  }
}

/**
 * Appends " (2)", " (3)"... until the name is free (trimmed, case-insensitive,
 * sv-SE). The base is shortened so the whole name stays within 60 characters,
 * because readCustomWorkouts drops longer names.
 */
export function uniqueWorkoutName(base: string, existing: string[]): string {
  const taken = new Set(existing.map(nameKey));
  const trimmed = base.trim().slice(0, maxWorkoutNameLength);
  if (!taken.has(nameKey(trimmed))) return trimmed;
  for (let n = 2; ; n += 1) {
    const suffix = ` (${n})`;
    const candidate = `${trimmed.slice(0, maxWorkoutNameLength - suffix.length).trimEnd()}${suffix}`;
    if (!taken.has(nameKey(candidate))) return candidate;
  }
}

/** Saved workouts, most recently used first, then newest saved. */
export function orderByRecentUse(
  saved: CustomWorkout[],
  sessions: { customWorkoutId?: string; startedAt?: string }[],
): CustomWorkout[] {
  const lastUsed = new Map<string, string>();
  for (const session of sessions) {
    const id = session.customWorkoutId;
    if (!id || !session.startedAt) continue;
    const prev = lastUsed.get(id);
    if (prev === undefined || session.startedAt > prev)
      lastUsed.set(id, session.startedAt);
  }
  return saved
    .map((workout, index) => ({ workout, index }))
    .sort((a, b) => {
      const x = lastUsed.get(a.workout.id);
      const y = lastUsed.get(b.workout.id);
      if (x !== undefined && y !== undefined && x !== y) return x < y ? 1 : -1;
      if ((x !== undefined) !== (y !== undefined))
        return x !== undefined ? -1 : 1;
      return b.index - a.index;
    })
    .map((item) => item.workout);
}

async function writeWorkouts(
  change: (current: CustomWorkout[]) => CustomWorkout[],
): Promise<void> {
  const db = getDb();
  const current = readCustomWorkouts(
    (await db.meta.get('customWorkouts'))?.value,
  );
  await db.meta.put({ key: 'customWorkouts', value: change(current) });
}

async function updateWorkouts(
  change: (current: CustomWorkout[]) => CustomWorkout[],
): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.meta, () => writeWorkouts(change));
}

/**
 * First-run start flow: saves the chosen setup and one custom workout in ONE
 * transaction, so preferences without a workout can never be left behind.
 */
export async function saveStartWithCustomWorkout(
  preferences: TrainingPreferences,
  exerciseIds: ExerciseId[],
  plan: PlannedExercise[] | undefined,
  date = toLocalDate(new Date()),
): Promise<string> {
  const id = crypto.randomUUID();
  await saveTrainingPreferences(getDb(), preferences, () =>
    writeWorkouts((current) => {
      if (current.length >= maxCustomWorkouts) throw new Error('limit');
      return [
        ...current,
        {
          id,
          name: uniqueWorkoutName(
            autoWorkoutName(date),
            current.map((item) => item.name),
          ),
          exerciseIds,
          ...(plan ? { plan } : {}),
        },
      ];
    }),
  );
  return id;
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
        name: uniqueWorkoutName(
          autoWorkoutName(date),
          current.map((item) => item.name),
        ),
        exerciseIds,
        ...(plan ? { plan } : {}),
      },
    ];
  });
  return id;
}

/**
 * Creates a workout with a given name. Idempotent: when a workout with the
 * same name and the same exercises exists, its id is returned instead. A name
 * used by a different workout throws WorkoutNameClashError.
 */
export async function createNamedCustomWorkout(
  name: string,
  exerciseIds: ExerciseId[],
  plan?: PlannedExercise[],
): Promise<string> {
  let id: string = crypto.randomUUID();
  await updateWorkouts((current) => {
    const clash = current.find((item) => nameKey(item.name) === nameKey(name));
    if (clash) {
      if (clash.exerciseIds.join() === exerciseIds.join()) {
        id = clash.id;
        return current;
      }
      throw new WorkoutNameClashError(name.trim());
    }
    if (current.length >= maxCustomWorkouts) throw new Error('limit');
    return [
      ...current,
      { id, name: name.trim(), exerciseIds, ...(plan ? { plan } : {}) },
    ];
  });
  return id;
}

/** Renames and saves a workout; the clash check runs inside the transaction. */
export async function renameCustomWorkout(
  id: string,
  name: string,
  exerciseIds: ExerciseId[],
  plan: PlannedExercise[] | undefined,
): Promise<void> {
  await updateWorkouts((current) => {
    if (!current.some((item) => item.id === id))
      throw new Error('Passet finns inte kvar.');
    if (
      current.some(
        (item) => item.id !== id && nameKey(item.name) === nameKey(name),
      )
    )
      throw new WorkoutNameClashError(name.trim());
    return current.map((item) =>
      item.id === id
        ? { ...item, name: name.trim(), exerciseIds, ...(plan ? { plan } : {}) }
        : item,
    );
  });
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
