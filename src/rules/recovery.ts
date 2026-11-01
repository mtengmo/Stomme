import {
  type FocusId,
  focusTargets,
  type WorkoutFocus,
} from '../content/focusPresets';
import {
  exerciseMuscles,
  type MuscleGroupId,
  muscleGroups,
} from '../content/muscles';
import type { Session } from '../domain/types';

/** Latest training instant for each primary muscle inside the advisory window. */
export function recentMuscles(
  sessions: readonly Session[],
  now: Date,
  hours = 48,
): Partial<Record<MuscleGroupId, number>> {
  const recent: Partial<Record<MuscleGroupId, number>> = {};
  for (const session of sessions) {
    const instant = Date.parse(session.finishedAt ?? session.startedAt);
    if (
      session.status === 'in_progress' ||
      instant > now.getTime() ||
      instant < now.getTime() - hours * 3_600_000
    )
      continue;
    for (const plan of session.plan) {
      if (session.feedback[plan.exerciseId]?.skipped) continue;
      for (const muscle of exerciseMuscles[plan.exerciseId].primary)
        recent[muscle] = Math.max(recent[muscle] ?? instant, instant);
    }
  }
  return recent;
}
export type RecentMuscles = ReturnType<typeof recentMuscles>;
export function suggestFocus(
  recent: RecentMuscles,
  available: readonly FocusId[],
): FocusId {
  for (const id of ['push', 'pull', 'legs', 'upper', 'lower'] as const)
    if (
      available.includes(id) &&
      !focusTargets({ id }).some((m) => recent[m] !== undefined)
    )
      return id;
  return 'full';
}
/** Advice only: never participates in readiness or start gates. */
export function recoveryNote(
  recent: RecentMuscles,
  focus: WorkoutFocus,
  now: Date,
): string {
  return muscleRecoveryNote(recent, focusTargets(focus), now);
}
export function muscleRecoveryNote(
  recent: RecentMuscles,
  targets: readonly MuscleGroupId[],
  now: Date,
): string {
  const overlap = targets.filter((m) => recent[m] !== undefined);
  if (!overlap.length) return '';
  const names = overlap.map((m) =>
    muscleGroups[m].label.toLocaleLowerCase('sv'),
  );
  const latest = Math.max(...overlap.map((m) => recent[m] as number));
  const days = Math.floor((now.getTime() - latest) / 86_400_000);
  const muscles =
    names.length === 1
      ? (names[0] as string)
      : `${names.slice(0, -1).join(', ')} och ${names.at(-1)}`;
  return `${muscles.charAt(0).toLocaleUpperCase('sv')}${muscles.slice(1)} tränades ${days === 0 ? 'idag' : `för ${days} dag${days === 1 ? '' : 'ar'} sedan`}. Anpassa efter hur det känns.`;
}
