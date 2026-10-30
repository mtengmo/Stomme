import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { kneeStrengthExercises } from '../content/kneeStrengthExercises';
import { equipmentChoices } from '../content/programmes';
import { exportAll, importAll, serializeBackup } from './backup';
import { StommeDB } from './db';

it('round trips every equipment choice and new exercise while rejecting unknown gear', async () => {
  const db = new StommeDB(`knee-strength-${Math.random()}`);
  try {
    const training = {
      programId: 'general',
      experience: 'regular',
      equipment: Object.keys(equipmentChoices),
    };
    await db.meta.put({ key: 'training', value: training });
    await db.meta.put({
      key: 'customWorkouts',
      value: [
        {
          id: 'knee-library',
          name: 'Egna övningar',
          exerciseIds: kneeStrengthExercises.map((e) => e.id),
        },
      ],
    });
    const snapshot = await exportAll(db);
    await db.meta.clear();
    await importAll(db, serializeBackup(snapshot));
    expect((await db.meta.get('training'))?.value).toEqual(training);
    expect((await db.meta.get('customWorkouts'))?.value).toEqual(
      snapshot.meta.find((row) => row.key === 'customWorkouts')?.value,
    );
    const bad = JSON.parse(serializeBackup(snapshot));
    bad.meta
      .find((row: { key: string }) => row.key === 'training')
      .value.equipment.push('unsafe-anchor');
    await expect(importAll(db, JSON.stringify(bad))).rejects.toThrow();
  } finally {
    db.close();
    await db.delete();
  }
});
