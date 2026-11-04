import { z } from 'zod';
import { exerciseList } from '../content/exercises';
import { routineFocusIds } from '../content/focusPresets';
import { programExcludedIds } from '../content/programExclusions';
import type { ExerciseId, TrainingProgram } from '../domain/types';
import { isRealDate } from '../lib/dates';
import type { StommeDB } from './db';

const exerciseIds = exerciseList.map((e) => e.id) as [
  ExerciseId,
  ...ExerciseId[],
];

/**
 * The stored programme: strict shape plus the relations between fields.
 * Shared by the reader, the writer and backup validation.
 */
export const trainingProgramSchema = z
  .strictObject({
    id: z.string().min(1).max(100),
    block: z.number().int().min(1).max(1000),
    createdAt: z.iso.datetime(),
    startDate: z.string().refine(isRealDate, { message: 'not a real date' }),
    daysPerWeek: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    emphasis: z.enum(['full', 'run', 'upper']),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(5),
    passes: z
      .array(
        z.strictObject({
          focus: z.enum(routineFocusIds as [string, ...string[]]),
          template: z.enum(['A', 'B']),
          exerciseIds: z
            .array(z.enum(exerciseIds))
            .min(4)
            .max(6)
            .refine((ids) => new Set(ids).size === ids.length, {
              message: 'Duplicate exercise in a programme pass',
            }),
        }),
      )
      .min(1)
      .max(5),
    curated: z.boolean(),
  })
  .superRefine((program, ctx) => {
    if (
      program.passes.length !== program.daysPerWeek ||
      program.weekdays.length !== program.daysPerWeek
    )
      ctx.addIssue({
        code: 'custom',
        message: 'passes and weekdays must match daysPerWeek',
      });
    if (new Set(program.weekdays).size !== program.weekdays.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate weekday' });
    for (const pass of program.passes)
      for (const id of pass.exerciseIds)
        if (programExcludedIds.has(id))
          ctx.addIssue({
            code: 'custom',
            message: `Exercise ${id} is not allowed in a programme`,
          });
  });

export function isTrainingProgram(value: unknown): value is TrainingProgram {
  return trainingProgramSchema.safeParse(value).success;
}

/** An invalid or absent stored value reads as no programme. */
export async function readTrainingProgram(
  db: StommeDB,
): Promise<TrainingProgram | null> {
  const value = (await db.meta.get('trainingProgram'))?.value;
  return isTrainingProgram(value) ? structuredClone(value) : null;
}

/**
 * Stores the one active programme, replacing any earlier one. Also usable
 * inside the transaction that saves the training preferences.
 */
export async function saveTrainingProgram(
  db: StommeDB,
  program: TrainingProgram,
): Promise<void> {
  if (!isTrainingProgram(program))
    throw new Error('Kontrollera programmet innan du sparar.');
  await db.meta.put({
    key: 'trainingProgram',
    value: structuredClone(program),
  });
}
