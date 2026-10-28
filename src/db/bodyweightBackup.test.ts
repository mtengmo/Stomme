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
    // A custom workout holds at most 12 exercises: two workouts cover every id.
    await setMeta(db, 'customWorkouts', [
      {
        id: 'bodyweight-1',
        name: 'Kroppsvikt 1',
        exerciseIds: bodyweightIds.slice(0, 8),
      },
      {
        id: 'bodyweight-2',
        name: 'Kroppsvikt 2',
        exerciseIds: bodyweightIds.slice(8),
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
