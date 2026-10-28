import type {
  PlannedExercise,
  StandardProgramId,
  TemplateId,
  TrainingRoutines,
} from '../domain/types';
import type { StommeDB } from './db';
import { validateTrainingPlan } from './training';

const programs: readonly StandardProgramId[] = ['general', 'running'];
const templates: readonly TemplateId[] = ['A', 'B'];

/** Strict shape guard used for stored data and backup import. */
export function isTrainingRoutines(value: unknown): value is TrainingRoutines {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const routines = value as Record<string, unknown>;
  return Object.entries(routines).every(([program, plans]) => {
    if (!programs.includes(program as StandardProgramId)) return false;
    if (!plans || typeof plans !== 'object' || Array.isArray(plans))
      return false;
    return Object.entries(plans).every(
      ([template, plan]) =>
        templates.includes(template as TemplateId) &&
        Array.isArray(plan) &&
        plan.every((item) => item && typeof item === 'object') &&
        validateTrainingPlan(plan as PlannedExercise[]),
    );
  });
}

export async function getTrainingRoutines(
  db: StommeDB,
): Promise<TrainingRoutines> {
  const value = (await db.meta.get('trainingRoutines'))?.value;
  return isTrainingRoutines(value) ? structuredClone(value) : {};
}

export async function saveTrainingRoutine(
  db: StommeDB,
  programId: StandardProgramId,
  templateId: TemplateId,
  plan: PlannedExercise[],
): Promise<void> {
  if (
    !programs.includes(programId) ||
    !templates.includes(templateId) ||
    !validateTrainingPlan(plan)
  )
    throw new Error(
      'Kontrollera övningar, antal, vikt och sidor innan du sparar.',
    );
  await db.transaction('rw', db.meta, async () => {
    const existing = (await db.meta.get('trainingRoutines'))?.value;
    if (existing !== undefined && !isTrainingRoutines(existing))
      throw new Error('Sparade träningspass behöver granskas.');
    const routines = existing ?? {};
    await db.meta.put({
      key: 'trainingRoutines',
      value: {
        ...routines,
        [programId]: {
          ...routines[programId],
          [templateId]: structuredClone(plan),
        },
      },
    });
  });
}

export async function resetTrainingRoutine(
  db: StommeDB,
  programId: StandardProgramId,
  templateId: TemplateId,
): Promise<void> {
  if (!programs.includes(programId) || !templates.includes(templateId))
    throw new Error('Ogiltigt träningspass.');
  await db.transaction('rw', db.meta, async () => {
    const existing = (await db.meta.get('trainingRoutines'))?.value;
    if (existing === undefined) return;
    if (!isTrainingRoutines(existing))
      throw new Error('Sparade träningspass behöver granskas.');
    const routines = structuredClone(existing);
    delete routines[programId]?.[templateId];
    if (routines[programId] && !Object.keys(routines[programId]).length)
      delete routines[programId];
    if (Object.keys(routines).length)
      await db.meta.put({ key: 'trainingRoutines', value: routines });
    else await db.meta.delete('trainingRoutines');
  });
}
