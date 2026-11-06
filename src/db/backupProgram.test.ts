// biome-ignore-all lint/suspicious/noExplicitAny: crafted JSON mutations
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rehabAdditionIds } from '../content/rosterSlots';
import type { Session, TrainingPreferences } from '../domain/types';
import { basePlan } from '../features/training/defaultPlan';
import { programFixture } from '../test/programFixture';
import {
  BACKUP_SCHEMA_VERSION,
  exportAll,
  importAll,
  parseBackup,
  serializeBackup,
} from './backup';
import { StommeDB } from './db';
import { saveTrainingProgram } from './program';

let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`stomme-backup-program-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support'],
};
const session = (over: Partial<Session> = {}): Session => ({
  id: 's1',
  templateId: 'A',
  programId: 'general',
  date: '2026-11-03',
  startedAt: '2026-11-03T08:00:00.000Z',
  finishedAt: '2026-11-03T08:30:00.000Z',
  status: 'completed',
  programWeek: 1,
  programPass: { programId: 'prog-1', pass: 1, week: 1 },
  experience: 'new',
  policyVersion: 1,
  checkins: {},
  plan: [basePlan('plank', preferences)],
  feedback: {},
  ...over,
});

async function seeded() {
  await db.sessions.clear();
  await saveTrainingProgram(db, programFixture());
  await db.sessions.add(session());
  return JSON.parse(serializeBackup(await exportAll(db)));
}
const text = (b: object) => JSON.stringify(b);

describe('backup schema v5: training programme', () => {
  it('writes version 5 and round trips the programme and programPass', async () => {
    const backup = await seeded();
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(BACKUP_SCHEMA_VERSION).toBe(6);
    const parsed = parseBackup(text(backup));
    expect(parsed.meta.find((m) => m.key === 'trainingProgram')?.value).toEqual(
      programFixture(),
    );
    expect(parsed.sessions[0]?.programPass).toEqual({
      programId: 'prog-1',
      pass: 1,
      week: 1,
    });
    const other = new StommeDB(`stomme-backup-program-b-${Math.random()}`);
    try {
      await importAll(other, text(backup));
      expect(await other.meta.get('trainingProgram')).toMatchObject({
        value: programFixture(),
      });
    } finally {
      other.close();
      await other.delete();
    }
  });

  it('round trips a programme with a seed and a level, and one without', async () => {
    for (const over of [{ seed: 123456, level: 'some' as const }, {}]) {
      const other = new StommeDB(`stomme-backup-seed-${Math.random()}`);
      try {
        await db.meta.clear();
        await saveTrainingProgram(db, programFixture(over));
        const backup = JSON.parse(serializeBackup(await exportAll(db)));
        const parsed = parseBackup(text(backup));
        expect(
          parsed.meta.find((m) => m.key === 'trainingProgram')?.value,
        ).toEqual(programFixture(over));
        await importAll(other, text(backup));
        expect(await other.meta.get('trainingProgram')).toMatchObject({
          value: programFixture(over),
        });
      } finally {
        other.close();
        await other.delete();
      }
    }
  });

  it('rejects a bad seed in a backup', async () => {
    const backup = await seeded();
    const entry = backup.meta.find((m: any) => m.key === 'trainingProgram');
    entry.value.seed = -5;
    expect(() => parseBackup(text(backup))).toThrow();
  });

  it('still imports version 4', async () => {
    const backup = await seeded();
    backup.schemaVersion = 4;
    backup.meta = [];
    backup.sessions = [];
    expect(parseBackup(text(backup)).schemaVersion).toBe(4);
  });

  it('rejects the jump exercise on import outside a template B lower pass', async () => {
    const ids = ['split-squat', 'glute-bridge', 'calf-raise', 'plate-pogos'];
    const wide = {
      curated: false,
      emphasis: 'run' as const,
      level: 'some' as const,
    };
    const importing = async (focus: string, template: string) => {
      const backup = await seeded();
      const entry = backup.meta.find((m: any) => m.key === 'trainingProgram');
      Object.assign(entry.value, wide);
      entry.value.passes[0] = { focus, template, exerciseIds: ids };
      return () => parseBackup(text(backup));
    };
    expect(await importing('lower', 'B')).not.toThrow();
    expect(await importing('lower', 'A')).toThrow();
    expect(await importing('upper', 'B')).toThrow();
  });

  it('still imports version 5', async () => {
    const backup = await seeded();
    backup.schemaVersion = 5;
    expect(parseBackup(text(backup)).schemaVersion).toBe(5);
  });

  it('rejects too many passes, duplicate weekdays and mismatched lengths', async () => {
    const mutate = async (change: (program: any) => void) => {
      const backup = await seeded();
      change(backup.meta.find((m: any) => m.key === 'trainingProgram').value);
      return () => parseBackup(text(backup));
    };
    expect(
      await mutate((p) => p.passes.push(structuredClone(p.passes[0]))),
    ).toThrow();
    expect(await mutate((p) => (p.weekdays = [2, 2]))).toThrow();
    expect(await mutate((p) => (p.weekdays = [2, 5, 6]))).toThrow();
    expect(await mutate((p) => (p.daysPerWeek = 3))).toThrow();
    expect(await mutate((p) => (p.weekdays = [0, 5]))).toThrow();
    expect(await mutate((p) => (p.passes[0].exerciseIds.length = 3))).toThrow();
  });

  it('rejects an unknown exercise, an unknown key and unknown programme fields', async () => {
    const mutate = async (change: (backup: any, program: any) => void) => {
      const backup = await seeded();
      change(
        backup,
        backup.meta.find((m: any) => m.key === 'trainingProgram').value,
      );
      return () => parseBackup(text(backup));
    };
    expect(
      await mutate((_b, p) => (p.passes[0].exerciseIds[0] = 'no-such-move')),
    ).toThrow();
    expect(await mutate((_b, p) => (p.surprise = true))).toThrow();
    expect(
      await mutate((b) => b.meta.push({ key: 'program', value: {} })),
    ).toThrow();
  });

  it('rejects excluded exercises: rehab addition, impact and knee E90', async () => {
    const [addition] = [...rehabAdditionIds];
    for (const bad of [addition, 'burpee', 'blast-off-push-up']) {
      const backup = await seeded();
      backup.meta.find(
        (m: any) => m.key === 'trainingProgram',
      ).value.passes[0].exerciseIds[0] = bad;
      expect(() => parseBackup(text(backup))).toThrow();
    }
  });

  it('validates programPass on sessions', async () => {
    const mutate = async (change: (s: any) => void) => {
      const backup = await seeded();
      change(backup.sessions[0]);
      return () => parseBackup(text(backup));
    };
    expect(await mutate((s) => (s.programPass.week = 5))).toThrow();
    expect(await mutate((s) => (s.programPass.pass = 0))).toThrow();
    expect(await mutate((s) => (s.programPass.extra = 1))).toThrow();
    expect(await mutate((s) => (s.programId = 'rehab'))).toThrow();
    expect(await mutate((s) => (s.customWorkoutId = 'one'))).toThrow();
  });
});
