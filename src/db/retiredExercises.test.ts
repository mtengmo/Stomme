import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { retiredExerciseIds } from '../content/retiredExercises';
import type { Session, TrainingPreferences } from '../domain/types';
import { basePlan } from '../features/training/defaultPlan';
import { exportAll, importAll, serializeBackup } from './backup';
import { StommeDB } from './db';

let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`stomme-retired-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support'],
};

describe('retired exercises in stored data', () => {
  it('round trips history, favourites and saved workouts through a backup', async () => {
    const ids = [...retiredExerciseIds];
    const session: Session = {
      id: 's-retired',
      templateId: 'A',
      programId: 'general',
      date: '2026-11-03',
      startedAt: '2026-11-03T08:00:00.000Z',
      finishedAt: '2026-11-03T08:30:00.000Z',
      status: 'completed',
      programWeek: 1,
      experience: 'regular',
      policyVersion: 1,
      checkins: {},
      plan: ids.map((id) => {
        const variant = exerciseMetadata[id].variants[0];
        if (!variant) throw new Error(`no variant for ${id}`);
        const loadIndex = variant.loadIndices[0] ?? 0;
        const external = variant.equipment.some(
          (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
        );
        return {
          ...basePlan(id, preferences),
          variantId: variant.id,
          loadIndex,
          weightKg: external ? 5 : 0,
        };
      }),
      feedback: {},
    };
    await db.sessions.add(session);
    await db.meta.put({ key: 'favourites', value: ids });
    await db.meta.put({
      key: 'customWorkouts',
      value: [{ id: 'w1', name: 'Gammalt pass', exerciseIds: ids }],
    });
    const text = serializeBackup(await exportAll(db));
    const target = new StommeDB(`stomme-retired-target-${Math.random()}`);
    try {
      await importAll(target, text);
      expect(
        (await target.sessions.get('s-retired'))?.plan.map((p) => p.exerciseId),
      ).toEqual(ids);
      expect((await target.meta.get('favourites'))?.value).toEqual(ids);
      expect((await target.meta.get('customWorkouts'))?.value).toEqual([
        { id: 'w1', name: 'Gammalt pass', exerciseIds: ids },
      ]);
    } finally {
      target.close();
      await target.delete();
    }
  });
});
