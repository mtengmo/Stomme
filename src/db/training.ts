import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import { kneeRehabExercises } from '../content/kneeRehab';

import { isTrainingPreferences } from '../content/programmes';

import type {
  PlannedExercise,
  Session,
  TemplateId,
  TrainingCheckin,
  TrainingPreferences,
} from '../domain/types';

import { toLocalDate } from '../lib/dates';

import { equipmentFits } from '../rules/equipment';

import { trainingDayAfterDue, validateCheckin } from '../rules/training';

import type { StommeDB } from './db';

import { getActiveSession } from './repo';

export async function saveTrainingPreferences(
  db: StommeDB,

  preferences: TrainingPreferences,
) {
  if (
    !isTrainingPreferences(preferences) ||
    new Set(preferences.equipment).size !== preferences.equipment.length ||
    preferences.equipment.length > 9
  )
    throw new Error('Invalid training preferences');

  await db.transaction('rw', db.sessions, db.meta, async () => {
    if (await getActiveSession(db))
      throw new Error(
        'Avsluta det pågående passet innan du byter träningsinriktning.',
      );

    await db.meta.put({ key: 'training', value: preferences });
  });
}

export function validateTrainingPlan(plan: PlannedExercise[]): boolean {
  return (
    plan.length > 0 &&
    plan.length <= 12 &&
    new Set(plan.map((p) => p.exerciseId)).size === plan.length &&
    plan.every((p) => {
      const ex = exercises[p.exerciseId];

      const variant = exerciseMetadata[p.exerciseId]?.variants.find(
        (value) => value.id === p.variantId,
      );

      const external = variant?.equipment.some(
        (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
      );

      return (
        ex &&
        Number.isInteger(p.sets) &&
        p.sets >= 1 &&
        p.sets <= 10 &&
        Number.isFinite(p.target) &&
        p.target >= 1 &&
        p.target <= 600 &&
        Number.isInteger(p.loadIndex) &&
        p.loadIndex >= 0 &&
        p.loadIndex < ex.loadLadder.length &&
        Number.isFinite(p.weightKg) &&
        p.weightKg >= 0 &&
        p.weightKg <= 500 &&
        !!variant &&
        variant.loadIndices.includes(p.loadIndex) &&
        (external ? p.weightKg > 0 : p.weightKg === 0) &&
        Number.isFinite(p.restSec) &&
        p.restSec >= 0 &&
        p.restSec <= 600 &&
        (!p.sides ||
          (p.sides.length > 0 &&
            new Set(p.sides).size === p.sides.length &&
            p.sides.every((side) =>
              ex.perSide
                ? side === 'right' || side === 'left'
                : side === 'both',
            )))
      );
    })
  );
}

export async function startTrainingSession(
  db: StommeDB,

  preferences: TrainingPreferences,

  templateId: TemplateId,

  plan: PlannedExercise[],

  now = new Date(),
  customWorkout?: { id: string; name: string },
): Promise<Session> {
  if (
    !isTrainingPreferences(preferences) ||
    !validateTrainingPlan(plan) ||
    (preferences.programId === 'rehab' &&
      preferences.rehabFocus === 'knee' &&
      plan.some(
        (p) => !kneeRehabExercises.some((ex) => ex.id === p.exerciseId),
      )) ||
    plan.some((item) => {
      const variant = exerciseMetadata[item.exerciseId].variants.find(
        (value) => value.id === item.variantId,
      );

      return (
        !variant || !equipmentFits(variant.equipment, preferences.equipment)
      );
    })
  )
    throw new Error('Kontrollera övningar, antal, vikt och sidor.');

  return db.transaction('rw', db.sessions, async () => {
    const active = await getActiveSession(db);

    if (active) return active;

    const session: Session = {
      id: crypto.randomUUID(),

      templateId,
      ...(customWorkout
        ? {
            customWorkoutId: customWorkout.id,
            customWorkoutName: customWorkout.name,
          }
        : {}),

      programId: preferences.programId,

      policyVersion: 1,

      ...(preferences.programId === 'rehab'
        ? { rehabFocus: preferences.rehabFocus ?? 'custom' }
        : {}),

      checkins: {},

      date: toLocalDate(now),

      startedAt: now.toISOString(),

      status: 'in_progress',

      programWeek: 1,

      plan,

      feedback: {},
    };

    await db.sessions.add(session);

    return session;
  });
}

export async function recordTrainingCheckin(
  db: StommeDB,

  id: string,

  timing: 'before' | 'after' | 'dayAfter',

  check: TrainingCheckin,
) {
  if (!validateCheckin(check, timing))
    throw new Error('Kontrollera dina svar.');

  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    const session = await db.sessions.get(id);

    if (!session?.programId) throw new Error('Unknown training session');

    if (session.checkins?.[timing]) throw new Error('Svaret är redan sparat.');

    if (timing !== 'before' && !session.checkins?.before)
      throw new Error('Svara på frågorna före passet först.');

    if (
      timing === 'dayAfter'
        ? !trainingDayAfterDue(session, toLocalDate(new Date()))
        : session.status !== 'in_progress'
    )
      throw new Error('Check-in is not due');

    if (
      timing === 'before' &&
      (await db.setLogs.where('sessionId').equals(id).count())
    )
      throw new Error('Passet har redan börjat.');

    await db.sessions.update(id, {
      checkins: { ...session.checkins, [timing]: check },

      ...(timing === 'after'
        ? { status: 'completed' as const, finishedAt: check.recordedAt }
        : {}),
    });
  });
}

/** Durable, explicitly saved plans; no automatic rehab progression. */

export async function saveRehabPlan(
  db: StommeDB,
  focus: 'custom' | 'knee',
  plan: PlannedExercise[],
) {
  if (!['custom', 'knee'].includes(focus) || !validateTrainingPlan(plan))
    throw new Error(
      'Kontrollera övningar, antal, vikt och sidor innan du sparar.',
    );

  await db.transaction('rw', db.sessions, db.meta, async () => {
    if (await getActiveSession(db))
      throw new Error(
        'Avsluta det pågående passet innan du ändrar programmet.',
      );

    const preferences = (await db.meta.get('training'))?.value;
    if (
      !isTrainingPreferences(preferences) ||
      preferences.programId !== 'rehab' ||
      (preferences.rehabFocus ?? 'custom') !== focus ||
      plan.some((p) => {
        const variant = exerciseMetadata[p.exerciseId].variants.find(
          (v) => v.id === p.variantId,
        );
        return (
          !variant ||
          !equipmentFits(variant.equipment, preferences.equipment) ||
          (focus === 'knee' &&
            !kneeRehabExercises.some((ex) => ex.id === p.exerciseId))
        );
      })
    )
      throw new Error(
        'Kontrollera rehabinriktning och tillgänglig utrustning.',
      );
    const previous = (await db.meta.get('rehabPlans'))?.value as
      | Partial<Record<'custom' | 'knee', PlannedExercise[]>>
      | undefined;

    await db.meta.put({
      key: 'rehabPlans',
      value: { ...previous, [focus]: structuredClone(plan) },
    });
  });
}
