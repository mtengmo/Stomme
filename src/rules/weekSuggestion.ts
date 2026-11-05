import {
  focusTargets,
  type RoutineFocus,
  workoutGroups,
} from '../content/focusPresets';
import type { MuscleGroupId } from '../content/muscles';
import type { ExerciseId } from '../domain/types';

interface SuggestionWorkout {
  id: string;
  exerciseIds: ExerciseId[];
  group?: import('../content/focusPresets').WorkoutGroup;
}

import type { WeeklyDayPlan, WeeklySchedule } from '../domain/types';
import { toLocalDate } from '../lib/dates';
import type { RecentMuscles } from './recovery';
import { nextOccurrence } from './weeklySchedule';
import { groupOf, workoutMuscles } from './workoutGroups';

const templates = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
};
const fallback: RoutineFocus[] = [
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full',
];

export function musclesForPlan(
  plan: WeeklyDayPlan,
  workouts: readonly SuggestionWorkout[],
): MuscleGroupId[] {
  if (plan.kind === 'focus')
    return focusTargets({ id: plan.focus }).filter((m) => m !== 'core');
  if (plan.kind === 'workout') {
    const workout = workouts.find((w) => w.id === plan.workoutId);
    return workout ? workoutMuscles(workout) : [];
  }
  return [];
}
export function adjacent(a: number, b: number): boolean {
  return Math.abs(a - b) === 1 || Math.abs(a - b) === 6;
}
export function overlaps(
  a: readonly MuscleGroupId[],
  b: readonly MuscleGroupId[],
): boolean {
  return a.some((m) => b.includes(m));
}

/** User-facing advice for manually assigned days. Standard plans have unknown muscles. */
export function weekConflicts(
  schedule: WeeklySchedule,
  workouts: readonly SuggestionWorkout[],
): string[] {
  const messages: string[] = [];
  const labels = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];
  for (let i = 0; i < schedule.days.length; i++)
    for (const b of schedule.days.slice(i + 1)) {
      const a = schedule.days[i] as WeeklySchedule['days'][number];
      if (!adjacent(a.day, b.day)) continue;
      if (a.plan.kind === 'standard' || b.plan.kind === 'standard') {
        messages.push(
          `${labels[a.day - 1]} och ${labels[b.day - 1]}: kontrollera muskelvilan i förhandsvisningen`,
        );
        continue;
      }
      if (
        overlaps(
          musclesForPlan(a.plan, workouts),
          musclesForPlan(b.plan, workouts),
        )
      )
        messages.push(
          `${labels[a.day - 1]} och ${labels[b.day - 1]} tränar samma muskler`,
        );
    }
  return messages;
}

/** Deterministic, bounded search. A proposal is never persisted here. */
export function suggestWeek({
  workouts,
  daysPerWeek,
  preferredDays,
  recent,
  now,
  searchLimit = 3000,
}: {
  workouts: readonly SuggestionWorkout[];
  daysPerWeek: 2 | 3 | 4 | 5;
  preferredDays?: readonly number[];
  recent: RecentMuscles;
  now: Date;
  searchLimit?: number;
}): { schedule: WeeklySchedule; notes: string[] } {
  const requested = [...new Set(preferredDays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);
  const days = [
    ...new Set([...requested, ...templates[daysPerWeek], 1, 2, 3, 4, 5, 6, 7]),
  ]
    .slice(0, daysPerWeek)
    .sort((a, b) => a - b);
  const notes: string[] = [];
  const candidates: {
    plan: WeeklyDayPlan;
    muscles: MuscleGroupId[];
    group: number;
    saved: boolean;
  }[] = workouts.map((workout) => ({
    plan: { kind: 'workout', workoutId: workout.id },
    saved: true,
    muscles: workoutMuscles(workout),
    group: workoutGroups.indexOf(groupOf(workout)),
  }));
  for (const focus of fallback)
    candidates.push({
      plan: { kind: 'focus', focus },
      saved: false,
      muscles: musclesForPlan({ kind: 'focus', focus }, workouts),
      group: workoutGroups.indexOf(focus === 'lower' ? 'legs' : focus),
    });
  const selected: typeof candidates = [];
  let nodes = 0;
  const search = (index: number): boolean => {
    if (index === days.length) return true;
    const seen = new Set<string>();
    // Rotate groups; within a group saved workouts retain the user's order.
    const ordered = [...candidates].sort(
      (a, b) =>
        Number(b.saved) - Number(a.saved) ||
        ((a.group - index + 6) % 6) - ((b.group - index + 6) % 6),
    );
    for (const candidate of ordered) {
      const signature = [...candidate.muscles].sort().join(',');
      if (seen.has(signature)) continue;
      seen.add(signature);
      nodes++;
      if (nodes > searchLimit) return false;
      if (
        selected.some(
          (previous, i) =>
            adjacent(days[i] as number, days[index] as number) &&
            overlaps(previous.muscles, candidate.muscles),
        )
      )
        continue;
      selected.push(candidate);
      if (search(index + 1)) return true;
      selected.pop();
    }
    return false;
  };
  const solved = search(0);
  const schedule: WeeklySchedule = {
    days: days.map((day, index) => ({
      day,
      plan: solved
        ? (selected[index] as (typeof candidates)[number]).plan
        : { kind: 'standard' },
    })),
  };
  if (!solved)
    notes.push(
      'Kontrollera muskelvilan i varje förhandsvisning; ett komplett förslag kunde inte räknas fram.',
    );
  const today = toLocalDate(now);
  for (let checked = 0; checked < schedule.days.length; checked++) {
    const first = [...schedule.days].sort((a, b) =>
      (nextOccurrence(today, a.day) as string).localeCompare(
        nextOccurrence(today, b.day) as string,
      ),
    )[0] as WeeklySchedule['days'][number];
    const conflictAt = (day: number) => {
      const date = nextOccurrence(today, day) as string;
      const instant =
        date === today ? now.getTime() : new Date(`${date}T00:00:00`).getTime();
      return musclesForPlan(first.plan, workouts).some(
        (m) =>
          recent[m] !== undefined &&
          instant < (recent[m] as number) + 48 * 3_600_000,
      );
    };
    if (!conflictAt(first.day)) break;
    const alternatives = Array.from({ length: 7 }, (_, i) => i + 1)
      .filter(
        (day) =>
          !schedule.days.some((item) => item.day === day) &&
          !conflictAt(day) &&
          !schedule.days.some(
            (item) =>
              item !== first &&
              adjacent(item.day, day) &&
              overlaps(
                musclesForPlan(item.plan, workouts),
                musclesForPlan(first.plan, workouts),
              ),
          ),
      )
      .sort((a, b) =>
        (nextOccurrence(today, a) as string).localeCompare(
          nextOccurrence(today, b) as string,
        ),
      );
    const replacement = alternatives[0];
    if (!replacement) {
      notes.push(
        'Första dagen överlappar nyligen tränade muskler. Anpassa dag eller pass efter hur det känns.',
      );
      break;
    }
    first.day = replacement;
    schedule.days.sort((a, b) => a.day - b.day);
    notes.push(
      'Första dagen flyttades i förslaget för att ge musklerna 48 timmars vila.',
    );
    // Recheck the new earliest occurrence: another occupied day may now be first.
  }
  return { schedule, notes };
}
