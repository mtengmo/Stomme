import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rehabAdditionIds } from '../content/rosterSlots';
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

const passOf = (exerciseIds: string[], focus = 'full', template = 'A') =>
  ({ focus, template, exerciseIds }) as never;
const withIds = (exerciseIds: string[]) => passOf(exerciseIds);
const rehabAdditionExample = [...rehabAdditionIds][0] as string;

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
      'a rehab addition',
      programFixture({
        passes: [
          withIds(['plank', 'dead-bug', 'glute-bridge', rehabAdditionExample]),
          programFixture().passes[1] as never,
        ],
      }),
    ],
    [
      'a rehab impact exercise',
      programFixture({
        passes: [
          withIds(['plank', 'dead-bug', 'glute-bridge', 'burpee']),
          programFixture().passes[1] as never,
        ],
      }),
    ],
    [
      'a knee exercise E90',
      programFixture({
        passes: [
          withIds(['plank', 'dead-bug', 'glute-bridge', 'blast-off-push-up']),
          programFixture().passes[1] as never,
        ],
      }),
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

  it('accepts a programme without seed and level (made before they existed)', () => {
    const old = programFixture();
    expect('seed' in old).toBe(false);
    expect('level' in old).toBe(false);
    expect(isTrainingProgram(old)).toBe(true);
  });

  it('accepts a seed and a level, and rejects bad ones', () => {
    expect(
      isTrainingProgram(programFixture({ seed: 4294967295, level: 'some' })),
    ).toBe(true);
    expect(isTrainingProgram(programFixture({ seed: 0 }))).toBe(true);
    for (const seed of [-1, 1.5, 4294967296, Number.NaN])
      expect(isTrainingProgram(programFixture({ seed }))).toBe(false);
    expect(isTrainingProgram({ ...programFixture(), level: 'expert' })).toBe(
      false,
    );
    expect(isTrainingProgram({ ...programFixture(), seed: '7' })).toBe(false);
  });

  it('allows the jump exercise only in a wide running programme above beginner level', () => {
    const pass = (ids: string[]) => [
      passOf(ids, 'lower', 'B'),
      passOf(ids, 'lower', 'B'),
    ];
    const ids = ['split-squat', 'glute-bridge', 'calf-raise', 'plate-pogos'];
    const wide = {
      curated: false,
      emphasis: 'run' as const,
      level: 'regular' as const,
      passes: pass(ids),
    };
    expect(isTrainingProgram(programFixture(wide))).toBe(true);
    expect(isTrainingProgram(programFixture({ ...wide, level: 'some' }))).toBe(
      true,
    );
    expect(isTrainingProgram(programFixture({ ...wide, level: 'new' }))).toBe(
      false,
    );
    expect(isTrainingProgram(programFixture({ ...wide, curated: true }))).toBe(
      false,
    );
    expect(
      isTrainingProgram(programFixture({ ...wide, emphasis: 'full' })),
    ).toBe(false);
    expect(
      isTrainingProgram(
        programFixture((({ level: _l, ...rest }) => rest)(wide)),
      ),
    ).toBe(false);
  });

  it('allows the jump exercise only in a template B lower or legs pass', () => {
    const ids = ['split-squat', 'glute-bridge', 'calf-raise', 'plate-pogos'];
    const wide = {
      curated: false,
      emphasis: 'run' as const,
      level: 'regular' as const,
    };
    const pass = (focus: string, template: string) =>
      passOf(ids, focus, template);
    const other = passOf(
      ['split-squat', 'glute-bridge', 'calf-raise', 'dead-bug'],
      'lower',
      'A',
    );
    const make = (focus: string, template: string) =>
      programFixture({ ...wide, passes: [pass(focus, template), other] });
    expect(isTrainingProgram(make('lower', 'B'))).toBe(true);
    expect(isTrainingProgram(make('legs', 'B'))).toBe(true);
    expect(isTrainingProgram(make('lower', 'A'))).toBe(false);
    expect(isTrainingProgram(make('upper', 'B'))).toBe(false);
    expect(isTrainingProgram(make('full', 'B'))).toBe(false);
  });

  it('rejects ballistic and retired exercises that no exclusion list covers', () => {
    for (const bad of ['kettlebell-swing', 'mountain-climber', 'fast-feet'])
      expect(
        isTrainingProgram(
          programFixture({
            passes: [
              withIds(['split-squat', 'glute-bridge', 'calf-raise', bad]),
              withIds(['split-squat', 'glute-bridge', 'calf-raise', 'plank']),
            ],
          }),
        ),
        bad,
      ).toBe(false);
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
