import type { RoutineFocus } from '../content/focusPresets';
import type {
  ExerciseId,
  ProgramEmphasis,
  ProgramPass,
  TemplateId,
  TrainingPreferences,
  TrainingProgram,
} from '../domain/types';
import { addDays, weekdayIndex } from '../lib/dates';
import {
  buildRoster,
  MIN_PASS_EXERCISES,
  type RosterContext,
} from './programRosters';

export type DaysPerWeek = TrainingProgram['daysPerWeek'];

interface PassSpec {
  focus: RoutineFocus;
  template: TemplateId;
}
const spec = (focus: RoutineFocus, template: TemplateId = 'A'): PassSpec => ({
  focus,
  template,
});
const full = (template: TemplateId) => spec('full', template);

/** Day offsets from the start date; same gaps as the weekSuggestion templates. */
const offsets: Record<DaysPerWeek, readonly number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
};

/**
 * Plan table: emphasis x days per week. "Underkropp" is the `lower` preset,
 * "Helkropp" is `full`. Adjacent offsets never share a primary muscle but core,
 * and the running row has at most two leg passes.
 */
export const programFocusPlan: Record<
  ProgramEmphasis,
  Record<DaysPerWeek, readonly PassSpec[]>
> = {
  full: {
    1: [full('A')],
    2: [full('A'), full('B')],
    3: [full('A'), full('B'), full('A')],
    4: [
      spec('upper', 'A'),
      spec('lower', 'A'),
      spec('upper', 'B'),
      spec('lower', 'B'),
    ],
    5: [spec('push'), spec('pull'), spec('legs'), spec('upper'), spec('lower')],
  },
  run: {
    1: [full('A')],
    2: [spec('lower', 'A'), full('B')],
    3: [spec('lower', 'A'), spec('upper', 'A'), spec('lower', 'B')],
    4: [
      spec('lower', 'A'),
      spec('upper', 'A'),
      spec('lower', 'B'),
      spec('upper', 'B'),
    ],
    5: [
      spec('lower', 'A'),
      spec('push'),
      spec('pull'),
      spec('lower', 'B'),
      spec('upper'),
    ],
  },
  upper: {
    1: [full('A')],
    2: [spec('upper', 'A'), full('B')],
    3: [spec('upper', 'A'), spec('lower', 'A'), spec('upper', 'B')],
    4: [spec('push'), spec('pull'), spec('lower', 'A'), spec('upper', 'A')],
    5: [spec('push'), spec('pull'), spec('legs'), spec('upper'), spec('lower')],
  },
};

/** ISO weekday (1 = Monday) per pass, with pass 1 on the start date. */
export function weekdaysFor(
  startDate: string,
  daysPerWeek: DaysPerWeek,
): number[] {
  return offsets[daysPerWeek].map(
    (o) => weekdayIndex(addDays(startDate, o)) + 1,
  );
}

/** Reserve 1: alternate upper and lower body, upper first at five days. */
function upperLowerRow(daysPerWeek: DaysPerWeek): PassSpec[] {
  const firstUpper = daysPerWeek === 5;
  const seen: Record<string, number> = {};
  return offsets[daysPerWeek].map((_, i) => {
    const focus: RoutineFocus =
      (i % 2 === 0) === firstUpper ? 'upper' : 'lower';
    const n = seen[focus] ?? 0;
    seen[focus] = n + 1;
    return spec(focus, n % 2 === 0 ? 'A' : 'B');
  });
}

/** Reserve 2: whole body, A and B in turn. */
function wholeBodyRow(daysPerWeek: DaysPerWeek): PassSpec[] {
  return offsets[daysPerWeek].map((_, i) => full(i % 2 === 0 ? 'A' : 'B'));
}

function rosterRow(
  row: readonly PassSpec[],
  preferences: TrainingPreferences,
  context: Omit<RosterContext, 'focus'>,
): ProgramPass[] | null {
  const passes: ProgramPass[] = [];
  for (const { focus, template } of row) {
    const { ids } = buildRoster(preferences, template, {
      ...context,
      focus: { id: focus },
    });
    if (ids.length < MIN_PASS_EXERCISES) return null;
    passes.push({ focus, template, exerciseIds: ids });
  }
  return passes;
}

export interface BuildProgramInput {
  preferences: TrainingPreferences;
  daysPerWeek: DaysPerWeek;
  emphasis: ProgramEmphasis;
  /** Local date of pass 1. */
  startDate: string;
  /** ISO instant. */
  now: string;
  id: string;
  block?: number;
  /** Candidate pool; the beginner set or the wide pool (content/widePool.ts). Absent: the whole library. */
  pool?: ReadonlySet<ExerciseId>;
  /** true (default with a pool): `pool` is the beginner set. false: the wide pool. */
  curated?: boolean;
  /** Variation seed (uint32). Absent: the first candidate of every slot. */
  seed?: number;
  /** A ready-made pass (rules/readyProgramPass.ts); it replaces pass 1 in every row. */
  ready?: ProgramPass;
}

/**
 * A fixed programme, or null for rehab and when no row gives every pass at
 * least four exercises. Reserve chain (plan rule 4): the table, then upper and
 * lower body in turn, then whole body A/B in turn.
 */
export function buildProgram(input: BuildProgramInput): TrainingProgram | null {
  const { preferences, daysPerWeek, emphasis, pool, seed } = input;
  if (preferences.programId === 'rehab') return null;
  const curated = pool !== undefined && input.curated !== false;
  const context: Omit<RosterContext, 'focus'> = {
    ...(pool ? { pool } : {}),
    ...(seed !== undefined ? { seed } : {}),
    ...(pool && emphasis === 'run' ? { running: true } : {}),
    // Jumps: running only, wide pool only, never for a beginner.
    ...(pool &&
    !curated &&
    emphasis === 'run' &&
    preferences.experience !== 'new'
      ? { plyo: true }
      : {}),
  };
  const rows = [
    programFocusPlan[emphasis][daysPerWeek],
    upperLowerRow(daysPerWeek),
    wholeBodyRow(daysPerWeek),
  ];
  for (const row of rows) {
    // A ready pass is pass 1; only the rest of the row is generated.
    const generated = rosterRow(
      input.ready ? row.slice(1) : row,
      preferences,
      context,
    );
    const passes =
      generated && input.ready ? [input.ready, ...generated] : generated;
    if (passes)
      return {
        id: input.id,
        block: input.block ?? 1,
        createdAt: input.now,
        startDate: input.startDate,
        daysPerWeek,
        emphasis,
        weekdays: weekdaysFor(input.startDate, daysPerWeek),
        passes,
        curated,
        ...(seed !== undefined ? { seed } : {}),
        level: preferences.experience,
      };
  }
  return null;
}
