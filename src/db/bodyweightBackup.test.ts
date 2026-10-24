import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { bodyweightIds } from '../content/bodyweightExercises';
import { exportAll, importAll, serializeBackup } from './backup';
import { StommeDB } from './db';
import { setMeta } from './repo';

it('round-trips the new exercises and apparatus without changing older IDs', async () => {
  const db = new StommeDB(`bodyweight-${Math.random()}`);
  try {
    await setMeta(db, 'training', {
      programId: 'general',
      experience: 'regular',
      equipment: ['bodyweight', 'pull-up-bar', 'dip-bars'],
    });
    await setMeta(db, 'customWorkouts', [
      {
        id: 'bodyweight',
        name: 'Kroppsvikt',
        exerciseIds: [...bodyweightIds],
      },
    ]);
    const snapshot = await exportAll(db);
    await db.meta.clear();
    await importAll(db, serializeBackup(snapshot));
    const result = await exportAll(db);
    expect(result.meta.find((row) => row.key === 'training')?.value).toEqual(
      snapshot.meta.find((row) => row.key === 'training')?.value,
    );
    expect(
      result.meta.find((row) => row.key === 'customWorkouts')?.value,
    ).toEqual(snapshot.meta.find((row) => row.key === 'customWorkouts')?.value);
  } finally {
    db.close();
    await db.delete();
  }
});
