import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { inventory } from '../test/inventory';
import {
  appendToCustomWorkout,
  createCustomWorkout,
  createNamedCustomWorkout,
  deleteCustomWorkout,
  maxCustomWorkouts,
  orderByRecentUse,
  readCustomWorkouts,
  renameCustomWorkout,
  saveStartWithCustomWorkout,
  setCustomWorkoutGroup,
  uniqueWorkoutName,
  WorkoutNameClashError,
} from './customWorkouts';
import { getDb } from './db';

const prefs: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  ...inventory({ dumbbells: [[5, 2]] }),
};

beforeEach(async () => {
  await getDb().delete();
  await getDb().open();
});

it('keeps a manual group through rename and append, drops invalid group alone, and clears deleted assignments atomically', async () => {
  const id = await createNamedCustomWorkout('Press', ['push-up']);
  await setCustomWorkoutGroup(id, 'push');
  await renameCustomWorkout(id, 'Mitt presspass', ['push-up'], undefined);
  await appendToCustomWorkout(id, ['dead-bug'], undefined);
  const read = async () =>
    readCustomWorkouts((await getDb().meta.get('customWorkouts'))?.value);
  expect((await read())[0]?.group).toBe('push');
  expect(
    readCustomWorkouts([{ ...(await read())[0], group: 'invalid' }])[0],
  ).not.toHaveProperty('group');
  await getDb().meta.put({
    key: 'weeklySchedule',
    value: {
      days: [
        { day: 2, plan: { kind: 'workout', workoutId: id } },
        { day: 5, plan: { kind: 'focus', focus: 'pull' } },
      ],
      moved: { from: '2026-10-27', to: '2026-10-30' },
    },
  });
  await deleteCustomWorkout(id);
  expect((await getDb().meta.get('weeklySchedule'))?.value).toEqual({
    days: [{ day: 5, plan: { kind: 'focus', focus: 'pull' } }],
  });
  expect(await read()).toEqual([]);
  const other = await createNamedCustomWorkout('Annat', ['dead-bug']);
  await getDb().meta.put({
    key: 'weeklySchedule',
    value: { days: [{ day: 2, plan: { kind: 'workout', workoutId: other } }] },
  });
  await deleteCustomWorkout(other);
  expect(await getDb().meta.get('weeklySchedule')).toBeUndefined();
});

describe('saveStartWithCustomWorkout', () => {
  it('saves preferences and one workout together, without sessions', async () => {
    const id = await saveStartWithCustomWorkout(
      prefs,
      ['goblet-squat', 'dead-bug'],
      undefined,
      '2026-10-29',
    );
    const db = getDb();
    expect((await db.meta.get('training'))?.value).toEqual(prefs);
    const saved = readCustomWorkouts(
      (await db.meta.get('customWorkouts'))?.value,
    );
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id,
      exerciseIds: ['goblet-squat', 'dead-bug'],
    });
    expect(await db.sessions.count()).toBe(0);
  });

  it('writes nothing when the workout cannot be saved', async () => {
    const db = getDb();
    await db.meta.put({
      key: 'customWorkouts',
      value: Array.from({ length: maxCustomWorkouts }, (_, i) => ({
        id: `w${i}`,
        name: `Pass ${i}`,
        exerciseIds: ['dead-bug'],
      })),
    });
    await expect(
      saveStartWithCustomWorkout(prefs, ['goblet-squat'], undefined),
    ).rejects.toThrow('limit');
    expect(await db.meta.get('training')).toBeUndefined();
  });
});

const names = async () =>
  readCustomWorkouts((await getDb().meta.get('customWorkouts'))?.value).map(
    (item) => item.name,
  );

describe('uniqueWorkoutName', () => {
  it('returns the name when free and numbers clashes', () => {
    expect(uniqueWorkoutName('Ben', [])).toBe('Ben');
    expect(uniqueWorkoutName('Ben', [' ben '])).toBe('Ben (2)');
    expect(uniqueWorkoutName('Ben', ['Ben', 'Ben (2)'])).toBe('Ben (3)');
  });
  it('keeps the full name within 60 characters', () => {
    const base = 'x'.repeat(60);
    const next = uniqueWorkoutName(base, [base]);
    expect(next).toHaveLength(60);
    expect(next.endsWith(' (2)')).toBe(true);
    expect(uniqueWorkoutName('y'.repeat(80), [])).toHaveLength(60);
  });
});

describe('orderByRecentUse', () => {
  const w = (id: string) => ({
    id,
    name: id,
    exerciseIds: ['dead-bug' as const],
  });
  it('puts recently used first, then newest saved', () => {
    const out = orderByRecentUse(
      [w('a'), w('b'), w('c'), w('d')],
      [
        { customWorkoutId: 'a', startedAt: '2026-10-01T10:00' },
        { customWorkoutId: 'b', startedAt: '2026-10-05T10:00' },
        { customWorkoutId: 'a', startedAt: '2026-10-03T10:00' },
        { startedAt: '2026-10-09T10:00' },
      ],
    );
    expect(out.map((x) => x.id)).toEqual(['b', 'a', 'd', 'c']);
  });
});

describe('automatic and named names', () => {
  it('makes automatic names unique', async () => {
    await createCustomWorkout(['dead-bug'], undefined, '2026-10-29');
    await createCustomWorkout(['goblet-squat'], undefined, '2026-10-29');
    expect(await names()).toEqual(['Eget pass 29 okt', 'Eget pass 29 okt (2)']);
  });
  it('blocks a rename onto another pass but allows the same name', async () => {
    const a = await createNamedCustomWorkout('A', ['dead-bug']);
    await createNamedCustomWorkout('B', ['goblet-squat']);
    await renameCustomWorkout(a, 'A', ['dead-bug'], undefined);
    await expect(
      renameCustomWorkout(a, ' b ', ['dead-bug'], undefined),
    ).rejects.toThrow(new WorkoutNameClashError('b').message);
    await renameCustomWorkout(a, 'C', ['dead-bug'], undefined);
    expect(await names()).toEqual(['C', 'B']);
  });
  it('is idempotent for the same named workout', async () => {
    const first = await createNamedCustomWorkout('Rehab', ['dead-bug']);
    const second = await createNamedCustomWorkout('Rehab', ['dead-bug']);
    expect(second).toBe(first);
    expect(await names()).toEqual(['Rehab']);
    await expect(
      createNamedCustomWorkout('rehab', ['goblet-squat']),
    ).rejects.toBeInstanceOf(WorkoutNameClashError);
  });
});

it('renames and sets or clears the group in one call', async () => {
  const id = await createNamedCustomWorkout('Grupp', ['push-up']);
  const read = async () =>
    readCustomWorkouts((await getDb().meta.get('customWorkouts'))?.value)[0];
  await renameCustomWorkout(id, 'Grupp', ['push-up'], undefined, 'push');
  expect((await read())?.group).toBe('push');
  await renameCustomWorkout(id, 'Grupp 2', ['push-up'], undefined);
  expect((await read())?.group).toBe('push');
  await renameCustomWorkout(id, 'Grupp 2', ['push-up'], undefined, null);
  expect(await read()).not.toHaveProperty('group');
  expect((await read())?.name).toBe('Grupp 2');
});
