import { describe, expect, it } from 'vitest';
import { beginnerExerciseIds } from '../content/beginnerSet';
import { readAuditLog } from '../content/exerciseAudit';
import { programExcludedIds } from '../content/programExclusions';
import { plyometricIds, runningSlots } from '../content/runningProposals';
import { ballisticIds, programPool, widePool } from '../content/widePool';
import type {
  ExerciseId,
  ProgramEmphasis,
  TrainingPreferences,
  TrainingProgram,
} from '../domain/types';
import { allowedLevels, chooseVariant, variantUsable } from './levelPolicy';
import { buildProgram, type DaysPerWeek } from './programPlan';

type Experience = TrainingPreferences['experience'];
const levels: Experience[] = ['new', 'some', 'regular'];
const emphases: ProgramEmphasis[] = ['full', 'run', 'upper'];
const days: DaysPerWeek[] = [1, 2, 3, 4, 5];
const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const home = ['bodyweight', 'chair', 'support'] as const;
const setups: [string, Partial<TrainingPreferences>][] = [
  ['bodyweight', {}],
  [
    'PRODUCT weights',
    {
      weights: [
        { type: 'dumbbell', kg: 5, count: 2 },
        { type: 'dumbbell', kg: 10, count: 2 },
        { type: 'kettlebell', kg: 16, count: 1 },
      ],
    },
  ],
  [
    'only 2x20 kg dumbbells',
    { weights: [{ type: 'dumbbell', kg: 20, count: 2 }] },
  ],
];
const prefs = (
  experience: Experience,
  extra: Partial<TrainingPreferences>,
): TrainingPreferences => ({
  programId: 'general',
  equipment: [...home],
  experience,
  ...extra,
});

function build(
  p: TrainingPreferences,
  emphasis: ProgramEmphasis,
  daysPerWeek: DaysPerWeek,
  seed?: number,
): TrainingProgram | null {
  return buildProgram({
    preferences: p,
    daysPerWeek,
    emphasis,
    startDate: '2026-11-03',
    now: '2026-11-03T08:00:00.000Z',
    id: 'variety',
    pool: programPool(p.experience, emphasis),
    curated: p.experience === 'new',
    ...(seed !== undefined ? { seed } : {}),
  });
}

const signature = (p: TrainingProgram | null) =>
  JSON.stringify(p?.passes.map((x) => x.exerciseIds));

const inLevel = (id: ExerciseId, p: TrainingPreferences) => {
  const variant = chooseVariant(id, p);
  return (
    !!variant &&
    variantUsable(p, variant) &&
    allowedLevels(p.experience).includes(variant.technicalLevel)
  );
};

describe('seeded programme variation', () => {
  it('builds the same programme for the same seed and another for another seed', () => {
    const p = prefs('some', {});
    expect(signature(build(p, 'full', 3, 7))).toBe(
      signature(build(p, 'full', 3, 7)),
    );
    expect(build(p, 'full', 3, 7)).toEqual(build(p, 'full', 3, 7));
    expect(build(p, 'full', 3, 7)?.seed).toBe(7);
    expect(build(p, 'full', 3)?.seed).toBeUndefined();
  });

  it('without a seed keeps the first candidate of every slot (as before)', () => {
    const p = prefs('new', {});
    expect(signature(build(p, 'full', 2))).toBe(signature(build(p, 'full', 2)));
    expect(build(p, 'full', 2)?.passes[0]?.exerciseIds).toEqual([
      'goblet-chair-squat',
      'glute-bridge',
      'back-extension',
      'knee-push-up',
      'dead-bug',
    ]);
  });

  describe.each(levels)('matrix · %s', (experience) => {
    const differing: boolean[] = [];
    describe.each(setups)('%s', (_name, extra) => {
      const p = prefs(experience, extra);
      for (const emphasis of emphases)
        for (const d of days)
          it(`${emphasis} · ${d} days: deterministic, rule-abiding, varied`, () => {
            const sigs = new Set<string>();
            for (const seed of seeds) {
              const program = build(p, emphasis, d, seed);
              expect(program).not.toBeNull();
              expect(signature(program)).toBe(
                signature(build(p, emphasis, d, seed)),
              );
              sigs.add(signature(program));
              const { curated } = program as TrainingProgram;
              expect(curated).toBe(experience === 'new');
              expect(program?.level).toBe(experience);
              const allowed = programPool(experience, emphasis);
              for (const pass of (program as TrainingProgram).passes) {
                const ids = pass.exerciseIds;
                expect(ids.length).toBeGreaterThanOrEqual(4);
                expect(ids.length).toBeLessThanOrEqual(6);
                expect(new Set(ids).size).toBe(ids.length);
                expect(ids.filter((id) => !allowed.has(id))).toEqual([]);
                expect(
                  ids.filter(
                    (id) => ballisticIds.has(id) && !plyometricIds.has(id),
                  ),
                ).toEqual([]);
                expect(
                  ids.filter(
                    (id) =>
                      programExcludedIds.has(id) && !plyometricIds.has(id),
                  ),
                ).toEqual([]);
                // Never above the level: the pool path has no fallback pick.
                expect(ids.filter((id) => !inLevel(id, p))).toEqual([]);
                if (experience === 'new')
                  expect(
                    ids.filter((id) => !beginnerExerciseIds.has(id)),
                  ).toEqual([]);
                if (ids.some((id) => plyometricIds.has(id))) {
                  expect(experience).not.toBe('new');
                  expect(emphasis).toBe('run');
                  expect(pass.template).toBe('B');
                }
              }
            }
            differing.push(sigs.size > 1);
          });
    });
    it('varies for a majority of day/emphasis/equipment combinations', () => {
      const share = differing.filter(Boolean).length / differing.length;
      expect(differing.length).toBe(
        setups.length * emphases.length * days.length,
      );
      // A one-day beginner programme has few interchangeable exercises; most others vary.
      expect(share).toBeGreaterThan(0.6);
    });
  });

  it('keeps A and B passes of the same focus different for every seed', () => {
    for (const experience of levels)
      for (const [, extra] of setups)
        for (const seed of seeds) {
          const program = build(prefs(experience, extra), 'run', 3, seed);
          const [lowerA, , lowerB] = (program as TrainingProgram).passes;
          expect(lowerA?.template).toBe('A');
          expect(lowerB?.template).toBe('B');
          expect(lowerA?.exerciseIds).not.toEqual(lowerB?.exerciseIds);
        }
  });
});

describe('Löpning emphasis', () => {
  const runningIds = new Set<ExerciseId>(
    runningSlots.flatMap((s) => [...s.options]),
  );
  runningIds.add('wall-sit');

  it.each(levels)(
    'draws lower passes from the running slots · %s',
    (experience) => {
      for (const [, extra] of setups)
        for (const seed of [undefined, ...seeds]) {
          const program = build(prefs(experience, extra), 'run', 4, seed);
          for (const pass of (program as TrainingProgram).passes.filter(
            (x) => x.focus === 'lower',
          )) {
            const hits = pass.exerciseIds.filter((id) => runningIds.has(id));
            expect(hits.length).toBeGreaterThanOrEqual(4);
          }
        }
    },
  );

  it('gives lower passes a squat pattern, a hip extension and a calf exercise', () => {
    const program = build(prefs('some', {}), 'run', 3, 5) as TrainingProgram;
    const lower = program.passes.filter((x) => x.focus === 'lower');
    const slotOf = (id: ExerciseId, slot: string) =>
      runningSlots.find((s) => s.id === slot)?.options.includes(id);
    for (const pass of lower) {
      for (const slot of ['squat', 'hip-extension', 'calf'])
        expect(pass.exerciseIds.some((id) => slotOf(id, slot))).toBe(true);
    }
  });

  it('leaves the upper passes as in the whole-body emphasis', () => {
    for (const experience of levels)
      for (const seed of seeds) {
        const run = build(
          prefs(experience, {}),
          'run',
          4,
          seed,
        ) as TrainingProgram;
        const full = build(
          prefs(experience, {}),
          'full',
          4,
          seed,
        ) as TrainingProgram;
        const upper = (p: TrainingProgram) =>
          p.passes.filter((x) => x.focus === 'upper').map((x) => x.exerciseIds);
        expect(upper(run)).toEqual(upper(full));
      }
  });

  it('never gives plyometrics to a beginner or outside the running emphasis, and does for others', () => {
    let seen = 0;
    for (const experience of levels)
      for (const emphasis of emphases)
        for (const d of days)
          for (const seed of seeds) {
            const program = build(prefs(experience, {}), emphasis, d, seed);
            const has = (program as TrainingProgram).passes.some((x) =>
              x.exerciseIds.some((id) => plyometricIds.has(id)),
            );
            if (experience === 'new' || emphasis !== 'run')
              expect(has).toBe(false);
            else if (has) seen += 1;
          }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('wide pool (content/widePool.ts)', () => {
  const log = readAuditLog();

  it('matches the ballistic group of the audit log', () => {
    const ballistic = log
      .filter((e) => e.group === 'ballistic')
      .map((e) => e.id);
    expect([...ballisticIds].sort()).toEqual(ballistic.sort());
  });

  it('holds no needs-fix exercise, no excluded exercise and no jump unless asked', () => {
    const needsFix = log
      .filter((e) => e.status === 'needs-fix')
      .map((e) => e.id);
    for (const plyo of [false, true]) {
      const pool = widePool(plyo);
      expect(needsFix.filter((id) => pool.has(id as ExerciseId))).toEqual([]);
      for (const id of programExcludedIds)
        expect(pool.has(id) && !plyometricIds.has(id)).toBe(false);
    }
    expect(widePool(false).has('plate-pogos')).toBe(false);
    expect(widePool(true).has('plate-pogos')).toBe(true);
  });

  it('is only used for levels past the beginner', () => {
    expect(programPool('new', 'run')).toBe(beginnerExerciseIds);
    expect(programPool('some', 'full')).toBe(widePool(false));
    expect(programPool('regular', 'run')).toBe(widePool(true));
  });
});
