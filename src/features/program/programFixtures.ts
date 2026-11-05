import { beginnerExerciseIds } from '../../content/beginnerSet';
import { getDb } from '../../db/db';
import { saveTrainingProgram } from '../../db/program';
import { createSession, setMeta } from '../../db/repo';
import type { TrainingPreferences, TrainingProgram } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { buildProgram } from '../../rules/programPlan';

export const programPrefs: TrainingPreferences = {
  programId: 'general',
  equipment: ['bodyweight', 'chair', 'support'],
  experience: 'new',
};

/** Test helper: a real generated programme saved with its preferences. */
export async function seedProgram(
  days: 1 | 2 | 3 | 4 | 5 = 3,
  prefs: TrainingPreferences = programPrefs,
): Promise<TrainingProgram> {
  const program = buildProgram({
    preferences: prefs,
    daysPerWeek: days,
    emphasis: 'full',
    startDate: toLocalDate(new Date()),
    now: new Date().toISOString(),
    id: 'prog-1',
    pool: beginnerExerciseIds,
  });
  if (!program) throw new Error('fixture programme failed');
  await setMeta(getDb(), 'training', prefs);
  await saveTrainingProgram(getDb(), program);
  return program;
}

/** Test helper: a session that belongs to the programme. */
export function programSession(
  program: TrainingProgram,
  pass: number,
  week: number,
  status: 'completed' | 'aborted' | 'in_progress' = 'completed',
  mode?: 'short',
) {
  return createSession(getDb(), {
    templateId: 'A',
    programId: 'general',
    date: toLocalDate(new Date()),
    startedAt: new Date().toISOString(),
    ...(status === 'in_progress'
      ? {}
      : { finishedAt: new Date().toISOString() }),
    status,
    programWeek: 1,
    plan: [],
    feedback: {},
    checkins: {},
    programPass: { programId: program.id, pass, week },
    ...(mode ? { workoutMode: mode } : {}),
  } as never);
}
