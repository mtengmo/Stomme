import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import {
  maxCustomWorkouts,
  readCustomWorkouts,
  saveStartWithCustomWorkout,
} from './customWorkouts';
import { getDb } from './db';

const prefs: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight', 'dumbbell-2'],
};

beforeEach(async () => {
  await getDb().delete();
  await getDb().open();
});

describe('saveStartWithCustomWorkout', () => {
  it('saves preferences and one workout together, without sessions', async () => {
    const id = await saveStartWithCustomWorkout(
      prefs,
      ['goblet-squat', 'dead-bug'],
      undefined,
      '2026-10-29',
    );
    const db = getDb();
    expect((await db.meta.get('training'))?.value).toEqual(prefs);
    const saved = readCustomWorkouts(
      (await db.meta.get('customWorkouts'))?.value,
    );
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id,
      exerciseIds: ['goblet-squat', 'dead-bug'],
    });
    expect(await db.sessions.count()).toBe(0);
  });

  it('writes nothing when the workout cannot be saved', async () => {
    const db = getDb();
    await db.meta.put({
      key: 'customWorkouts',
      value: Array.from({ length: maxCustomWorkouts }, (_, i) => ({
        id: `w${i}`,
        name: `Pass ${i}`,
        exerciseIds: ['dead-bug'],
      })),
    });
    await expect(
      saveStartWithCustomWorkout(prefs, ['goblet-squat'], undefined),
    ).rejects.toThrow('limit');
    expect(await db.meta.get('training')).toBeUndefined();
  });
});
