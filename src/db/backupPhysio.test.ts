// biome-ignore-all lint/suspicious/noExplicitAny: crafted JSON mutations
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { physioKneePlan } from '../content/physioKneeProgramme';
import type { Session, TrainingPreferences } from '../domain/types';
import {
  BACKUP_SCHEMA_VERSION,
  exportAll,
  importAll,
  serializeBackup,
} from './backup';
import { StommeDB } from './db';

let db: StommeDB;
let n = 0;

beforeEach(() => {
  n += 1;
  db = new StommeDB(`stomme-backup-physio-${n}-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const preferences: TrainingPreferences = {
  programId: 'rehab',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support', 'band'],
  rehabFocus: 'knee-physio',
  rehabSide: 'left',
};
const plan = physioKneePlan(preferences);
const physioSession: Session = {
  id: 'physio-1',
  templateId: 'A',
  programId: 'rehab',
  experience: 'new',
  policyVersion: 1,
  rehabFocus: 'knee-physio',
  date: '2026-09-14',
  startedAt: '2026-09-14T08:00:00.000Z',
  finishedAt: '2026-09-14T08:30:00.000Z',
  status: 'completed',
  programWeek: 1,
  plan,
  feedback: {},
};

async function seeded() {
  await db.meta.put({ key: 'training', value: preferences });
  await db.meta.put({ key: 'rehabPlans', value: { 'knee-physio': plan } });
  await db.sessions.add(physioSession);
  return JSON.parse(serializeBackup(await exportAll(db)));
}

describe('backup of the physiotherapist knee programme', () => {
  it('keeps schema version 2', () => {
    expect(BACKUP_SCHEMA_VERSION).toBe(2);
  });

  it('round-trips focus, saved plan and session', async () => {
    const backup = await seeded();
    await db.meta.clear();
    await db.sessions.clear();
    await importAll(db, JSON.stringify(backup));
    expect((await db.meta.get('training'))?.value).toEqual(preferences);
    expect((await db.meta.get('rehabPlans'))?.value).toEqual({
      'knee-physio': plan,
    });
    expect((await db.sessions.get('physio-1'))?.rehabFocus).toBe('knee-physio');
  });

  it('imports a backup without any physio data unchanged', async () => {
    await db.meta.put({
      key: 'training',
      value: { ...preferences, rehabFocus: 'custom' },
    });
    const backup = JSON.parse(serializeBackup(await exportAll(db)));
    await db.meta.clear();
    await expect(importAll(db, JSON.stringify(backup))).resolves.toBeDefined();
    expect((await db.meta.get('training'))?.value).toMatchObject({
      rehabFocus: 'custom',
    });
  });

  it.each([
    [
      'session focus is unknown',
      (b: any) => (b.sessions[0].rehabFocus = 'knee-physios'),
    ],
    [
      'training focus is unknown',
      (b: any) => {
        for (const entry of b.meta)
          if (entry.key === 'training') entry.value.rehabFocus = 'hip';
      },
    ],
    [
      'saved plans have an unknown focus key',
      (b: any) => {
        for (const entry of b.meta)
          if (entry.key === 'rehabPlans') entry.value.hip = plan;
      },
    ],
    [
      'the physio session is not a rehab session',
      (b: any) => (b.sessions[0].programId = 'general'),
    ],
    [
      'the saved physio plan is invalid',
      (b: any) => {
        for (const entry of b.meta)
          if (entry.key === 'rehabPlans')
            entry.value['knee-physio'][0].sets = 0;
      },
    ],
  ])('rejects when %s', async (_name, mutate) => {
    const backup = await seeded();
    mutate(backup);
    await expect(importAll(db, JSON.stringify(backup))).rejects.toMatchObject({
      code: 'invalid',
    });
  });
});
