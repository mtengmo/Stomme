import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { defaultPlan } from '../features/training/defaultPlan';
import { exportAll, parseBackup, serializeBackup } from './backup';
import { StommeDB } from './db';
import {
  getTrainingRoutines,
  isTrainingRoutines,
  resetTrainingRoutine,
  saveTrainingRoutine,
} from './trainingRoutines';

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support'],
};
let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`routines-${crypto.randomUUID()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

describe('saved standard routines', () => {
  it('keeps each direction and programme separate, clones on read, and backs up', async () => {
    const a = defaultPlan(preferences, 'A', [], []);
    const b = defaultPlan(preferences, 'B', [], []);
    await saveTrainingRoutine(db, 'general', 'A', a);
    await saveTrainingRoutine(db, 'general', 'B', b);
    await saveTrainingRoutine(db, 'running', 'A', a);
    const stored = await getTrainingRoutines(db);
    expect(stored.general?.A).toEqual(a);
    expect(stored.general?.B).toEqual(b);
    expect(stored.running?.A).toEqual(a);
    stored.general?.A?.splice(0);
    expect((await getTrainingRoutines(db)).general?.A).toEqual(a);
    const backup = parseBackup(serializeBackup(await exportAll(db)));
    expect(
      backup.meta.find((row) => row.key === 'trainingRoutines')?.value,
    ).toEqual(await getTrainingRoutines(db));
    await resetTrainingRoutine(db, 'general', 'A');
    expect((await getTrainingRoutines(db)).general?.A).toBeUndefined();
    await resetTrainingRoutine(db, 'general', 'B');
    await resetTrainingRoutine(db, 'running', 'A');
    expect(await db.meta.get('trainingRoutines')).toBeUndefined();
    await resetTrainingRoutine(db, 'running', 'A');
  });

  it('rejects malformed routines and invalid saves', async () => {
    const a = defaultPlan(preferences, 'A', [], []);
    expect(isTrainingRoutines(null)).toBe(false);
    expect(isTrainingRoutines([])).toBe(false);
    expect(isTrainingRoutines({ rehab: { A: a } })).toBe(false);
    expect(isTrainingRoutines({ general: [] })).toBe(false);
    expect(isTrainingRoutines({ general: { C: a } })).toBe(false);
    expect(isTrainingRoutines({ general: { A: [] } })).toBe(false);
    await expect(saveTrainingRoutine(db, 'general', 'A', [])).rejects.toThrow();
    await db.meta.put({
      key: 'trainingRoutines',
      value: { general: { A: [] } },
    });
    expect(await getTrainingRoutines(db)).toEqual({});
    await expect(saveTrainingRoutine(db, 'general', 'A', a)).rejects.toThrow();
    await expect(resetTrainingRoutine(db, 'general', 'A')).rejects.toThrow();
  });

  it('rejects malformed routine metadata in a backup', async () => {
    const a = defaultPlan(preferences, 'A', [], []);
    await saveTrainingRoutine(db, 'general', 'A', a);
    const backup = await exportAll(db);
    const row = backup.meta.find((entry) => entry.key === 'trainingRoutines');
    if (!row) throw new Error('Missing routine fixture');
    row.value = { general: { A: a, C: a } };
    expect(() => parseBackup(serializeBackup(backup))).toThrow();
    row.value = { general: { A: [{ ...a[0], sets: 0 }] } };
    expect(() => parseBackup(serializeBackup(backup))).toThrow();
  });
});
