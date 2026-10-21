import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import {
  BackupError,
  exportAll,
  importAll,
  parseBackup,
  serializeBackup,
} from './backup';
import { StommeDB } from './db';
import { readFavourites, toggleFavourite } from './favourites';

let db: StommeDB;
let name = '';
let serial = 0;

beforeEach(() => {
  serial += 1;
  name = `stomme-favourites-${serial}-${Math.random()}`;
  db = new StommeDB(name);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('favourites', () => {
  it('toggles an exercise, persists it, and avoids duplicate IDs', async () => {
    await toggleFavourite(db, 'step-up');
    await toggleFavourite(db, 'step-up');
    expect(await readFavourites(db)).toEqual([]);

    await db.meta.put({
      key: 'favourites',
      value: ['step-up', 'step-up', 'unknown'],
    });
    expect(await readFavourites(db)).toEqual(['step-up']);
    await toggleFavourite(db, 'goblet-squat');
    expect(await readFavourites(db)).toEqual(['step-up', 'goblet-squat']);

    db.close();
    db = new StommeDB(name);
    expect(await readFavourites(db)).toEqual(['step-up', 'goblet-squat']);
    expect(exercises['step-up'].id).toBe('step-up');
  });

  it('exports, validates, and imports favourites in a backup', async () => {
    await toggleFavourite(db, 'single-leg-rdl');
    const backup = await exportAll(db, new Date('2026-10-21T12:00:00.000Z'));
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.meta).toContainEqual({
      key: 'favourites',
      value: ['single-leg-rdl'],
    });

    const other = new StommeDB(`${name}-import`);
    try {
      await importAll(other, serializeBackup(parsed));
      expect(await readFavourites(other)).toEqual(['single-leg-rdl']);
    } finally {
      other.close();
      await other.delete();
    }
  });

  it('rejects duplicate favourite IDs in a backup', async () => {
    const backup = await exportAll(db, new Date('2026-10-21T12:00:00.000Z'));
    backup.meta.push({
      key: 'favourites',
      value: ['step-up', 'step-up'],
    });
    expect(() => parseBackup(serializeBackup(backup))).toThrow(BackupError);
  });
});
