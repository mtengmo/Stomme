import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { isTrainingPreferences } from '../content/programmes';
import type { TrainingPreferences } from '../domain/types';
import { exportAll, importAll, serializeBackup } from './backup';
import { StommeDB } from './db';
import { setMeta } from './repo';
import { saveTrainingPreferences } from './training';

const base = {
  programId: 'general' as const,
  experience: 'some' as const,
  equipment: ['bodyweight' as const],
};

async function roundTrip(training: unknown) {
  const db = new StommeDB(`parts-${Math.random()}`);
  try {
    await setMeta(db, 'training', training as TrainingPreferences);
    const snapshot = await exportAll(db);
    await db.meta.clear();
    await importAll(db, serializeBackup(snapshot));
    return (await exportAll(db)).meta.find((row) => row.key === 'training')
      ?.value;
  } finally {
    db.close();
    await db.delete();
  }
}

it('round-trips a body-part focus', async () => {
  const training = { ...base, bodyParts: ['legs', 'core'] };
  expect(await roundTrip(training)).toEqual(training);
});

it('imports a backup that has no body-part focus', async () => {
  expect(await roundTrip(base)).toEqual(base);
});

it('rejects unknown, duplicate and empty body-part lists', async () => {
  for (const bodyParts of [['feet'], ['legs', 'legs'], []])
    await expect(roundTrip({ ...base, bodyParts })).rejects.toThrow();
});

it('validates body parts in the preferences guard and when saving', async () => {
  expect(isTrainingPreferences({ ...base, bodyParts: ['legs'] })).toBe(true);
  expect(isTrainingPreferences({ ...base, bodyParts: ['feet'] })).toBe(false);
  expect(isTrainingPreferences({ ...base, bodyParts: ['legs', 'legs'] })).toBe(
    false,
  );
  expect(isTrainingPreferences({ ...base, bodyParts: [] })).toBe(false);
  const db = new StommeDB(`parts-save-${Math.random()}`);
  try {
    await expect(
      saveTrainingPreferences(db, {
        ...base,
        bodyParts: ['feet' as 'legs'],
      }),
    ).rejects.toThrow('Ogiltiga träningsval');
    // All eleven equipment choices are accepted, matching the backup schema.
    await saveTrainingPreferences(db, {
      ...base,
      equipment: [
        'bodyweight',
        'dumbbell-1',
        'dumbbell-2',
        'kettlebell-1',
        'kettlebell-2',
        'chair',
        'support',
        'step',
        'band',
        'pull-up-bar',
        'dip-bars',
      ],
    });
  } finally {
    db.close();
    await db.delete();
  }
});
