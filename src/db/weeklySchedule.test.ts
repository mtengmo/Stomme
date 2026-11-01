import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearWeeklySchedule,
  loadWeeklySchedule,
  saveWeeklySchedule,
} from '../features/week/WeeklyPlan';
import { StommeDB } from './db';

let db: StommeDB;
let serial = 0;

beforeEach(() => {
  serial += 1;
  db = new StommeDB(`stomme-weekly-schedule-${serial}-${Math.random()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('weekly schedule persistence', () => {
  it('saves, validates on read, and clears the local plan', async () => {
    const schedule = {
      days: [
        { day: 2, plan: { kind: 'standard' as const } },
        { day: 5, plan: { kind: 'standard' as const } },
      ],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    };
    await saveWeeklySchedule(schedule, db);
    expect(await loadWeeklySchedule(db)).toEqual(schedule);

    await db.meta.put({
      key: 'weeklySchedule',
      value: {
        days: [
          { day: 1, plan: { kind: 'standard' as const } },
          { day: 1, plan: { kind: 'standard' as const } },
        ],
      },
    });
    expect(await loadWeeklySchedule(db)).toBeNull();

    await saveWeeklySchedule(
      { days: [{ day: 1, plan: { kind: 'standard' as const } }] },
      db,
    );
    await clearWeeklySchedule(db);
    expect(await db.meta.get('weeklySchedule')).toBeUndefined();
  });

  it('refuses to persist malformed values', async () => {
    await expect(
      saveWeeklySchedule(
        {
          days: [
            { day: 1, plan: { kind: 'standard' as const } },
            { day: 1, plan: { kind: 'standard' as const } },
          ],
        },
        db,
      ),
    ).rejects.toThrow('Ogiltig veckoplan');
    expect(await db.meta.get('weeklySchedule')).toBeUndefined();
  });
});
