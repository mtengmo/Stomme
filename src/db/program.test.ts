import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { programFixture } from '../test/programFixture';
import { StommeDB } from './db';
import {
  isTrainingProgram,
  readTrainingProgram,
  saveTrainingProgram,
} from './program';

let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`stomme-program-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

describe('isTrainingProgram', () => {
  const bad: [string, unknown][] = [
    ['null', null],
    ['an array', []],
    ['an unknown key', { ...programFixture(), extra: 1 }],
    ['a missing field', { ...programFixture(), curated: undefined }],
    ['a bad date', programFixture({ startDate: '2026-13-45' })],
    ['a bad instant', programFixture({ createdAt: 'yesterday' })],
    ['an unknown emphasis', { ...programFixture(), emphasis: 'legs' }],
    ['daysPerWeek 6', { ...programFixture(), daysPerWeek: 6 }],
    ['block 0', programFixture({ block: 0 })],
    ['too few weekdays', programFixture({ weekdays: [2] })],
    ['duplicate weekdays', programFixture({ weekdays: [2, 2] })],
    ['weekday 8', programFixture({ weekdays: [2, 8] })],
    [
      'too many passes',
      programFixture({ passes: Array(3).fill(programFixture().passes[0]) }),
    ],
    [
      'fewer than four exercises',
      programFixture({
        passes: [
          { focus: 'full', template: 'A', exerciseIds: ['plank', 'dead-bug'] },
          programFixture().passes[1] as never,
        ],
      }),
    ],
    [
      'more than six exercises',
      programFixture({
        passes: [
          {
            focus: 'full',
            template: 'A',
            exerciseIds: [
              'plank',
              'dead-bug',
              'glute-bridge',
              'wall-sit',
              'bird-dog',
              'side-plank',
              'calf-raise',
            ],
          },
          programFixture().passes[1] as never,
        ],
      }),
    ],
    [
      'a duplicate exercise',
      programFixture({
        passes: [
          {
            focus: 'full',
            template: 'A',
            exerciseIds: ['plank', 'plank', 'dead-bug', 'glute-bridge'],
          },
          programFixture().passes[1] as never,
        ],
      }),
    ],
    [
      'an unknown exercise',
      {
        ...programFixture(),
        passes: [
          {
            focus: 'full',
            template: 'A',
            exerciseIds: ['plank', 'nope', 'dead-bug', 'glute-bridge'],
          },
          programFixture().passes[1],
        ],
      },
    ],
    [
      'a custom focus',
      {
        ...programFixture(),
        passes: [
          { ...programFixture().passes[0], focus: 'custom' },
          programFixture().passes[1],
        ],
      },
    ],
  ];

  it('accepts a valid programme', () => {
    expect(isTrainingProgram(programFixture())).toBe(true);
  });

  it.each(bad)('rejects %s', (_name, value) => {
    expect(isTrainingProgram(value)).toBe(false);
  });
});

describe('training programme storage', () => {
  it('reads null when nothing is stored', async () => {
    expect(await readTrainingProgram(db)).toBeNull();
  });

  it('saves one active programme and replaces it', async () => {
    await saveTrainingProgram(db, programFixture());
    expect(await readTrainingProgram(db)).toEqual(programFixture());
    await saveTrainingProgram(db, programFixture({ id: 'prog-2', block: 2 }));
    expect(await readTrainingProgram(db)).toMatchObject({
      id: 'prog-2',
      block: 2,
    });
    expect(await db.meta.count()).toBe(1);
  });

  it('refuses to save an invalid programme', async () => {
    await expect(
      saveTrainingProgram(db, programFixture({ weekdays: [2, 2] })),
    ).rejects.toThrow();
    expect(await db.meta.count()).toBe(0);
  });

  it('reads an invalid stored value as no programme', async () => {
    await db.meta.put({
      key: 'trainingProgram',
      value: { ...programFixture(), daysPerWeek: 9 },
    });
    expect(await readTrainingProgram(db)).toBeNull();
  });
});
