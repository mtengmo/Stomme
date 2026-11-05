import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PlannedExercise, TrainingPreferences } from '../domain/types';
import { basePlan } from '../features/training/defaultPlan';
import { inventory } from '../test/inventory';
import { programFixture } from '../test/programFixture';
import { StommeDB } from './db';
import { saveTrainingProgram } from './program';
import { startTrainingSession } from './training';

const now = new Date('2026-11-03T08:00:00.000Z');
const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'new',
  ...inventory({ support: ['chair', 'support'] }),
};
const plan: PlannedExercise = basePlan('plank', preferences);

let db: StommeDB;
beforeEach(async () => {
  db = new StommeDB(`stomme-training-program-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const start = (
  programPass: { programId: string; pass: number; week: number } | undefined,
  prefs = preferences,
  customWorkout?: { id: string; name: string },
) =>
  startTrainingSession(db, prefs, 'A', [plan], now, customWorkout, {
    ...(programPass ? { programPass } : {}),
  });

describe('startTrainingSession with a programme pass', () => {
  it('saves programPass with the pass focus and template', async () => {
    await saveTrainingProgram(db, programFixture());
    const session = await start({ programId: 'prog-1', pass: 2, week: 1 });
    expect(session).toMatchObject({
      programPass: { programId: 'prog-1', pass: 2, week: 1 },
      focus: 'full',
      templateId: 'B',
      programWeek: 1,
    });
    expect(session.regions).toBeUndefined();
    expect(await db.sessions.get(session.id)).toEqual(session);
  });

  it('does not add regions from legacy body parts', async () => {
    await saveTrainingProgram(db, programFixture());
    const session = await start(
      { programId: 'prog-1', pass: 1, week: 1 },
      { ...preferences, bodyParts: ['legs'] },
    );
    expect(session.regions).toBeUndefined();
  });

  it('leaves ordinary sessions without programPass', async () => {
    const session = await start(undefined);
    expect(session.programPass).toBeUndefined();
  });

  it('rejects a pass that the stored programme does not have', async () => {
    await saveTrainingProgram(db, programFixture());
    for (const pass of [
      { programId: 'prog-1', pass: 3, week: 1 },
      { programId: 'prog-1', pass: 0, week: 1 },
      { programId: 'prog-1', pass: 1.5, week: 1 },
      { programId: 'prog-1', pass: 1, week: 5 },
      { programId: 'prog-1', pass: 1, week: 0 },
      { programId: 'prog-1', pass: 1, week: 1.5 },
      { programId: 'other', pass: 1, week: 1 },
      { programId: 7 as never, pass: 1, week: 1 },
    ])
      await expect(start(pass)).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
  });

  it('rejects a pass without a stored programme', async () => {
    await expect(
      start({ programId: 'prog-1', pass: 1, week: 1 }),
    ).rejects.toThrow();
  });

  it('rejects a pass for rehab and for saved own workouts', async () => {
    await saveTrainingProgram(db, programFixture());
    const pass = { programId: 'prog-1', pass: 1, week: 1 };
    await expect(
      start(pass, { ...preferences, programId: 'rehab', rehabFocus: 'custom' }),
    ).rejects.toThrow();
    await expect(
      start(pass, preferences, { id: 'w', name: 'Eget' }),
    ).rejects.toThrow();
  });
});

describe('startTrainingSession with a programme pass while another session runs', () => {
  it('returns the active session instead of starting a new one', async () => {
    await saveTrainingProgram(db, programFixture());
    const active = await start(undefined);
    await db.setLogs.add({
      id: 'l1',
      sessionId: active.id,
      exerciseId: plan.exerciseId,
      setNumber: 1,
      amount: 20,
      loadIndex: 0,
      weightKg: 0,
      variantId: plan.variantId,
      loggedAt: now.toISOString(),
    } as never);
    const again = await start({ programId: 'prog-1', pass: 1, week: 1 });
    expect(again.id).toBe(active.id);
    expect(again.programPass).toBeUndefined();
    expect(await db.sessions.count()).toBe(1);
  });
});
