// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APPEARANCE_KEY, setAppearance } from '../lib/appearance';
import {
  BACKUP_SCHEMA_VERSION,
  exportAll,
  importAll,
  serializeBackup,
} from './backup';
import { StommeDB } from './db';
import { setMeta } from './repo';
import { deleteAllData } from './wipe';

let db: StommeDB;
beforeEach(() => {
  localStorage.clear();
  db = new StommeDB(`stomme-appearance-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

describe('appearance is a device preference, not data', () => {
  it('"Radera all data" also clears the stored appearance', async () => {
    await setMeta(db, 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
    setAppearance({ scheme: 'dark' });
    expect(localStorage.getItem(APPEARANCE_KEY)).not.toBeNull();
    await deleteAllData(db);
    expect(localStorage.getItem(APPEARANCE_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('rutat');
    expect(await db.meta.count()).toBe(0);
  });

  it('a backup never contains the appearance and its schema is unchanged', async () => {
    setAppearance({ scheme: 'dark' });
    const backup = await exportAll(db, new Date('2026-10-20T10:00:00Z'));
    expect(BACKUP_SCHEMA_VERSION).toBe(2);
    expect(Object.keys(backup).sort()).toEqual([
      'exportedAt',
      'meta',
      'painLogs',
      'schemaVersion',
      'sessions',
      'setLogs',
    ]);
    expect(serializeBackup(backup)).not.toContain('appearance');
    expect(serializeBackup(backup)).not.toContain('dark');
  });

  it('a backup made before themes still imports and leaves the appearance alone', async () => {
    const legacy = JSON.stringify({
      schemaVersion: 2,
      exportedAt: '2026-10-01T10:00:00.000Z',
      sessions: [],
      setLogs: [],
      painLogs: [],
      meta: [{ key: 'program', value: { startDate: '2026-09-28' } }],
    });
    setAppearance({ scheme: 'dark' });
    const result = await importAll(db, legacy);
    expect(result.counts.meta).toBe(1);
    expect(JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? '')).toEqual({
      theme: 'rutat',
      scheme: 'dark',
    });
  });
});
