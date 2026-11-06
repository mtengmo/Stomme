import { describe, expect, it } from 'vitest';
import { beginnerExerciseIds } from '../content/beginnerSet';
import { readAuditLog } from '../content/exerciseAudit';
import { exerciseReferences } from '../content/exerciseReferences';
import { exerciseList } from '../content/exercises';
import { exerciseMuscles } from '../content/muscles';
import { programExcludedIds } from '../content/programExclusions';
import { plyometricIds, runningSlots } from '../content/runningProposals';
import {
  ballisticIds,
  programPool,
  unresolvedFigureIssueIds,
  widePool,
} from '../content/widePool';
import type {
  ExerciseId,
  ProgramEmphasis,
  TrainingPreferences,
  TrainingProgram,
} from '../domain/types';
import { missingCoverage } from './coverage';
import {
  allowedLevels,
  chooseStartingWeight,
  chooseVariant,
  heavyStartAllowed,
  variantUsable,
} from './levelPolicy';
import { buildProgram, type DaysPerWeek } from './programPlan';
import { programWeightCeilingKg } from './programRosters';
import { adjacent } from './weekSuggestion';

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
  ['bodyweight only, no chair or wall', { equipment: ['bodyweight'] }],
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
/** Order inside a pass does not count as variety: compare the sets. */
const setSignature = (p: TrainingProgram | null) =>
  JSON.stringify(p?.passes.map((x) => [...x.exerciseIds].sort()));

/** Share of combinations whose seeds give different exercise sets (floors, with headroom). */
const minVariedShare: Record<Experience, number> = {
  new: 0.3,
  some: 0.6,
  regular: 0.6,
};

const inLevel = (id: ExerciseId, p: TrainingPreferences) => {
  const variant = chooseVariant(id, p);
  return (
    !!variant &&
    variantUsable(p, variant) &&
    allowedLevels(p.experience).includes(variant.technicalLevel)
  );
};

/** Per-hand start weight of every ceiling-listed exercise stays within its ceiling (M1). */
function expectCeilings(program: TrainingProgram, p: TrainingPreferences) {
  for (const pass of program.passes)
    for (const id of pass.exerciseIds) {
      const ceiling = programWeightCeilingKg[id];
      const variant = chooseVariant(id, p);
      const tool = variant?.equipment.find(
        (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
      );
      if (ceiling === undefined || !variant || !tool) continue;
      const { totalKg } = chooseStartingWeight(p, variant, {
        heavyAllowed: heavyStartAllowed(id),
      });
      expect(totalKg / tool.count, id).toBeLessThanOrEqual(ceiling);
    }
}

/** Passes on adjacent days share no primary muscle but core, exercise by exercise (S2). */
function expectAdjacency(program: TrainingProgram) {
  const muscles = program.passes.map(
    (pass) =>
      new Set(
        pass.exerciseIds.flatMap((id) =>
          exerciseMuscles[id].primary.filter((m) => m !== 'core'),
        ),
      ),
  );
  for (let i = 0; i < muscles.length; i++)
    for (let j = i + 1; j < muscles.length; j++)
      if (
        adjacent(program.weekdays[i] as number, program.weekdays[j] as number)
      )
        expect(
          [...(muscles[i] as Set<string>)].filter((m) =>
            (muscles[j] as Set<string>).has(m),
          ),
          `${program.emphasis} ${program.daysPerWeek} d: ${program.passes[i]?.focus}${program.passes[i]?.template} / ${program.passes[j]?.focus}${program.passes[j]?.template} ${program.passes[i]?.exerciseIds} | ${program.passes[j]?.exerciseIds}`,
        ).toEqual([]);
}

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
              expectCeilings(program as TrainingProgram, p);
              expectAdjacency(program as TrainingProgram);
              for (const pass of (program as TrainingProgram).passes)
                if (pass.focus === 'full')
                  expect(missingCoverage(pass.exerciseIds)).toEqual([]);
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
            expect(sigs.size).toBeGreaterThan(0);
          });
    });
    it('varies for a share of day/emphasis/equipment combinations that depends on the level', () => {
      let differing = 0;
      let total = 0;
      for (const [, extra] of setups)
        for (const emphasis of emphases)
          for (const d of days) {
            const sets = new Set(
              seeds.map((seed) =>
                setSignature(
                  build(prefs(experience, extra), emphasis, d, seed),
                ),
              ),
            );
            total += 1;
            if (sets.size > 1) differing += 1;
          }
      expect(total).toBe(setups.length * emphases.length * days.length);
      // Beginners have few interchangeable exercises; wider pools vary more.
      expect(differing / total).toBeGreaterThan(minVariedShare[experience]);
    });
  });

  it('keeps A and B passes of the same focus different for every seed', () => {
    // Bare bodyweight leaves a beginner too few lower-body options to differ.
    for (const experience of levels)
      for (const [, extra] of setups.filter(
        ([name]) => !name.startsWith('bodyweight only'),
      ))
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
      for (const [name, extra] of setups)
        for (const seed of [undefined, ...seeds]) {
          const program = build(prefs(experience, extra), 'run', 4, seed);
          for (const pass of (program as TrainingProgram).passes.filter(
            (x) => x.focus === 'lower',
          )) {
            const hits = pass.exerciseIds.filter((id) => runningIds.has(id));
            // Bare bodyweight has no squat or hinge variant without a chair or weights.
            expect(hits.length).toBeGreaterThanOrEqual(
              name.startsWith('bodyweight only') ? 3 : 4,
            );
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

  it('holds no exercise whose audit entry still lists a factual figure or text error', () => {
    // Same rule as beginnerSet.test.ts: process gaps are not factual errors.
    const processGaps = [
      /^Beginner comprehension check and full-loop visual acceptance outstanding/,
      /^Not covered individually by any audit doc/,
    ];
    const unresolved = log
      .filter((e) =>
        e.openIssues.some((i) => !processGaps.some((p) => p.test(i))),
      )
      .map((e) => e.id);
    expect(unresolved.length).toBeGreaterThan(0);
    for (const plyo of [false, true])
      expect(
        unresolved.filter((id) => widePool(plyo).has(id as ExerciseId)),
      ).toEqual([]);
    // The static list names no exercise the log no longer flags.
    for (const id of unresolvedFigureIssueIds)
      expect(unresolved, id).toContain(id);
  });

  it('keeps the AAOS knee group E28-E38 out', () => {
    const knee = exerciseList
      .map((e) => e.id)
      .filter((id) => {
        const n = Number(exerciseReferences[id].slice(1));
        return n >= 28 && n <= 38;
      });
    expect(knee.length).toBe(11);
    for (const plyo of [false, true])
      expect(knee.filter((id) => widePool(plyo).has(id))).toEqual([]);
  });

  it('is only used for levels past the beginner', () => {
    expect(programPool('new', 'run')).toBe(beginnerExerciseIds);
    expect(programPool('some', 'full')).toBe(widePool(false));
    expect(programPool('regular', 'run')).toBe(widePool(true));
  });
});
