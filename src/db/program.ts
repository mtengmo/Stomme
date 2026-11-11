import { z } from 'zod';
import { exerciseList } from '../content/exercises';
import { routineFocusIds } from '../content/focusPresets';
import { programExcludedIds } from '../content/programExclusions';
import { readyWorkouts } from '../content/readyWorkouts';
import { isRetiredExercise } from '../content/retiredExercises';
import { plyometricIds, runningSlots } from '../content/runningProposals';
import { ballisticIds, unresolvedFigureIssueIds } from '../content/widePool';
import type { ExerciseId, TrainingProgram } from '../domain/types';
import { isRealDate } from '../lib/dates';
import type { StommeDB } from './db';

const exerciseIds = exerciseList.map((e) => e.id) as [
  ExerciseId,
  ...ExerciseId[],
];

/** A ready pass can hold a whole ready workout; a generated pass 4-6. */
const MAX_READY_PASS_EXERCISES = 12;

/** Every exercise a ready workout may hold; Löpstyrka: any option of any slot. */
function readyAllowedIds(readyId: string): ReadonlySet<string> | null {
  const workout = readyWorkouts.find((w) => w.id === readyId);
  if (!workout?.runningStart) return null;
  return new Set<string>(
    workout.id === 'running-strength'
      ? [
          ...runningSlots.flatMap((slot) => slot.options),
          ...workout.exerciseIds,
        ]
      : workout.exerciseIds,
  );
}

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
          ready: z
            .strictObject({
              id: z.string().min(1).max(100),
              name: z.string().min(1).max(100),
            })
            .optional(),
          // 4-6 in a generated pass; a ready pass has its own bounds below.
          exerciseIds: z
            .array(z.enum(exerciseIds))
            .min(1)
            .max(MAX_READY_PASS_EXERCISES)
            .refine((ids) => new Set(ids).size === ids.length, {
              message: 'Duplicate exercise in a programme pass',
            }),
        }),
      )
      .min(1)
      .max(5),
    curated: z.boolean(),
    seed: z.number().int().min(0).max(4294967295).optional(),
    level: z.enum(['new', 'some', 'regular']).optional(),
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
    // The one jump exercise is allowed only in a template B lower pass of a wide
    // running programme for a user who is not new (rules/programRosters.ts,
    // running mode). Ballistic and retired exercises are never allowed.
    const plyoProgramme =
      !program.curated &&
      program.emphasis === 'run' &&
      (program.level === 'some' || program.level === 'regular');
    for (const [index, pass] of program.passes.entries()) {
      if (pass.ready) {
        // A ready pass is a copy of a ready workout. It sits outside the
        // programme exclusions on purpose (copenhagen-hold, isometric-lunge-hold),
        // but ballistic, retired and unresolved exercises stay out, and the
        // jump is not for a beginner.
        const allowed = readyAllowedIds(pass.ready.id);
        if (!allowed)
          ctx.addIssue({
            code: 'custom',
            path: ['passes', index, 'ready'],
            message: `Unknown ready workout ${pass.ready.id}`,
          });
        for (const id of pass.exerciseIds)
          if (
            (allowed && !allowed.has(id)) ||
            (ballisticIds.has(id) && !plyometricIds.has(id)) ||
            unresolvedFigureIssueIds.has(id) ||
            isRetiredExercise(id) ||
            (plyometricIds.has(id) && program.level === 'new')
          )
            ctx.addIssue({
              code: 'custom',
              path: ['passes', index, 'exerciseIds'],
              message: `Exercise ${id} is not allowed in ready workout ${pass.ready.id}`,
            });
        continue;
      }
      if (pass.exerciseIds.length < 4 || pass.exerciseIds.length > 6)
        ctx.addIssue({
          code: 'custom',
          path: ['passes', index, 'exerciseIds'],
          message: 'A programme pass holds 4-6 exercises',
        });
      const plyoPass =
        plyoProgramme &&
        pass.template === 'B' &&
        (pass.focus === 'lower' || pass.focus === 'legs');
      for (const id of pass.exerciseIds)
        if (
          (programExcludedIds.has(id) ||
            ballisticIds.has(id) ||
            isRetiredExercise(id)) &&
          !(plyoPass && plyometricIds.has(id))
        )
          ctx.addIssue({
            code: 'custom',
            message: `Exercise ${id} is not allowed in a programme`,
          });
    }
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
