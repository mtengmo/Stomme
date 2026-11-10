import { exercises } from '../../content/exercises';
import { focusLabel } from '../../content/focusPresets';
import type {
  ExerciseId,
  PlannedExercise,
  ProgramEmphasis,
  ProgramPass,
  Session,
  SetLog,
  TrainingPreferences,
  TrainingProgram,
} from '../../domain/types';
import { addDays, weekDates, weekdayIndex } from '../../lib/dates';
import { estimateWorkoutMinutes } from '../../rules/shortWorkout';
import { customWorkoutPlan } from '../training/defaultPlan';
import type { PassCardExercise } from './PassCard';

/** Fewest exercises a pass may keep after equipment changes before the programme must be redone. */
export const MIN_USABLE_EXERCISES = 3;

export const emphasisLabels: Record<ProgramEmphasis, string> = {
  full: 'Hela kroppen',
  run: 'Ben & bål för löpning',
  upper: 'Mer överkropp',
};

/** What a pass is called: the ready workout's name when it is one, otherwise its focus. */
export function passFocusLabel(
  pass: Pick<ProgramPass, 'focus' | 'ready'>,
): string {
  return pass.ready?.name ?? focusLabel(pass.focus);
}

/** The level a programme was built for; older programmes follow the saved preferences. */
export function programLevel(
  program: TrainingProgram,
  preferences: TrainingPreferences,
): TrainingPreferences['experience'] {
  return program.level ?? preferences.experience;
}

const ABBR = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'];

/** Short weekday for an ISO weekday (1 = Monday), e.g. "lör". */
export function weekdayAbbr(isoWeekday: number): string {
  return ABBR[isoWeekday - 1] ?? '';
}

export interface PassPlan {
  /** Exercises that still fit the equipment, with today's dose. */
  plan: PlannedExercise[];
  /** Exercises that no longer have a variant that fits. */
  removed: ExerciseId[];
}

/** The dose is computed when the pass is shown; only ids are stored in the programme. */
export function passPlan(
  program: TrainingProgram,
  passIndex: number,
  preferences: TrainingPreferences,
  sessions: Session[],
  logs: SetLog[],
): PassPlan {
  return planForIds(
    program.passes[passIndex]?.exerciseIds ?? [],
    preferences,
    sessions,
    logs,
  );
}

/** Splits exercise ids into those that still fit the equipment and those that do not. */
export function planForIds(
  ids: readonly ExerciseId[],
  preferences: TrainingPreferences,
  sessions: Session[],
  logs: SetLog[],
): PassPlan {
  const all = customWorkoutPlan(ids, preferences, sessions, logs);
  return {
    plan: all.filter((item) => item.variantId !== undefined),
    removed: all
      .filter((item) => item.variantId === undefined)
      .map((item) => item.exerciseId),
  };
}

export function passMinutes(plan: readonly PlannedExercise[]): number {
  return estimateWorkoutMinutes(plan);
}

/** Rows for a PassCard: names without E-codes. */
export function cardExercises(
  plan: readonly PlannedExercise[],
): PassCardExercise[] {
  return plan.map((item) => {
    const exercise = exercises[item.exerciseId];
    return {
      exerciseId: item.exerciseId,
      name: exercise.name,
      sets: item.sets,
      target: item.target,
      timed: exercise.unit === 'seconds',
      perSide: exercise.perSide || undefined,
      restSec: item.restSec,
    };
  });
}

export interface ProgramDays {
  /** Dates this calendar week that match a suggested weekday. */
  plannedDates: string[];
  /** Dates this calendar week with a finished programme pass. */
  doneDates: string[];
  /** The next suggested date (today included) without a finished pass; may be next week. */
  nextDate?: string;
}

/** Weekdays are only suggestions: the strip marks them but never blocks anything. */
export function programDays(
  program: TrainingProgram,
  sessions: readonly Session[],
  today: string,
): ProgramDays {
  const week = weekDates(today);
  const finished = new Set(
    sessions
      .filter(
        (s) =>
          s.status === 'completed' && s.programPass?.programId === program.id,
      )
      .map((s) => s.date),
  );
  const planned = (date: string) =>
    program.weekdays.includes(weekdayIndex(date) + 1);
  let nextDate: string | undefined;
  for (let i = 0; i < 7 && !nextDate; i++) {
    const date = addDays(today, i);
    if (planned(date) && !finished.has(date)) nextDate = date;
  }
  return {
    plannedDates: week.filter(planned),
    doneDates: week.filter((d) => finished.has(d)),
    ...(nextDate ? { nextDate } : {}),
  };
}
