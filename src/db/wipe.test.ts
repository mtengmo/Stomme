import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { StommeDB } from './db';
import { setMeta } from './repo';
import { deleteAllData } from './wipe';

it('deletes sessions, logs and meta', async () => {
  const db = new StommeDB(`stomme-wipe-${Math.random()}`);
  await setMeta(db, 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
  await db.sessions.add({
    id: 's',
    templateId: 'A',
    date: '2026-10-19',
    startedAt: '2026-10-19T08:00:00.000Z',
    status: 'in_progress',
    programWeek: 1,
    plan: [],
    feedback: {},
  });
  await deleteAllData(db);
  expect(await db.sessions.count()).toBe(0);
  expect(await db.meta.count()).toBe(0);
  db.close();
  await db.delete();
});
