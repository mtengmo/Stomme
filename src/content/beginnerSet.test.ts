import { describe, expect, it } from 'vitest';
import type {
  ExerciseId,
  TemplateId,
  TrainingPreferences,
  TrainingProgram,
} from '../domain/types';
import { missingCoverage } from '../rules/coverage';
import {
  allowedLevels,
  chooseVariant,
  variantUsable,
} from '../rules/levelPolicy';
import { buildProgram } from '../rules/programPlan';
import { buildRoster } from '../rules/programRosters';
import { repTempo } from '../rules/repTempo';
import { beginnerExerciseIds } from './beginnerSet';
import { type AuditEntry, readAuditLog } from './exerciseAudit';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exercises } from './exercises';
import { focusPresets, focusTargets } from './focusPresets';
import { exerciseMuscles } from './muscles';
import { programExcludedIds } from './programExclusions';
import {
  focusSlots,
  generalSlots,
  rehabAdditionIds,
  rehabImpactExercises,
} from './rosterSlots';

const ids = [...beginnerExerciseIds];
const log = new Map(readAuditLog().map((e) => [e.id, e]));
const entry = (id: ExerciseId) => log.get(id) as AuditEntry;

/**
 * Members without a `basic` variant. They are only in-level for `some` and
 * `regular`; adding another one here is a deliberate choice, not a side effect.
 */
const PRACTICED_ONLY: readonly ExerciseId[] = [
  'split-squat',
  'reverse-lunge',
  'push-up',
  'shoulder-press',
  'side-plank',
];

/** Open issues that name a missing check, not a factual error in text or figure. */
const PROCESS_GAPS = [
  /^Beginner comprehension check and full-loop visual acceptance outstanding/,
  /^Not covered individually by any audit doc/,
];

const isWeight = (type: string) => type === 'dumbbell' || type === 'kettlebell';

/** A 2 s up / 2 s down beat (or a prescribed hold), a static hold or a walk. */
function controlledTempo(id: ExerciseId): boolean {
  const { unit } = exercises[id];
  // Holds and carries have no rep beat; ballistic timed work is excluded by group.
  if (unit === 'seconds' || unit === 'meters') return true;
  const t = repTempo(id);
  return (
    !!t &&
    !t.sequence &&
    t.upMs >= 1_500 &&
    t.downMs >= 1_500 &&
    (t.hasHold || t.upMs >= 2_000)
  );
}

/** Why a high-risk exercise may not be in the set; empty when it may. */
function highRiskProblems(e: AuditEntry): string[] {
  const id = e.id as ExerciseId;
  const problems: string[] = [];
  if (e.group === 'ballistic' || rehabImpactExercises.has(id))
    problems.push('risk comes from ballistics');
  const loaded = exerciseMetadata[id].variants.some((v) =>
    v.equipment.some((q) => isWeight(q.type)),
  );
  if (!loaded && !exercises[id].kneeLoaded)
    problems.push('risk is neither load nor knee load');
  const fixDate = e.fixes.at(-1)?.date ?? '';
  for (const scope of ['text', 'animation'] as const) {
    const latest = e.reviews
      .filter(
        (r) => r.date >= fixDate && (r.scope === scope || r.scope === 'all'),
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    if (latest?.result !== 'ok')
      problems.push(`no ok ${scope} review on or after the last fix`);
  }
  return problems.map((p) => `${id}: ${p}`);
}

describe('beginner set (content/beginnerSet.ts)', () => {
  it('has 20-25 catalogue exercises, each in the audit log', () => {
    expect(ids.length).toBeGreaterThanOrEqual(20);
    expect(ids.length).toBeLessThanOrEqual(25);
    expect(ids.filter((id) => !exercises[id])).toEqual([]);
    expect(ids.filter((id) => !log.has(id))).toEqual([]);
  });

  it('leaves out rehab additions, impact, ballistic, E90-E98 and needs-fix', () => {
    const kneeRange = (id: ExerciseId) => {
      const n = Number(exerciseReferences[id].slice(1));
      return n >= 90 && n <= 98;
    };
    expect(ids.filter((id) => programExcludedIds.has(id))).toEqual([]);
    expect(ids.filter((id) => rehabAdditionIds.has(id))).toEqual([]);
    expect(ids.filter((id) => rehabImpactExercises.has(id))).toEqual([]);
    expect(ids.filter((id) => entry(id).group === 'ballistic')).toEqual([]);
    expect(ids.filter(kneeRange)).toEqual([]);
    expect(ids.filter((id) => entry(id).status === 'needs-fix')).toEqual([]);
  });

  it('admits high risk only for load or knee load with ok text and animation reviews after the last fix', () => {
    const high = ids.map(entry).filter((e) => e.risk === 'high');
    expect(high.flatMap(highRiskProblems)).toEqual([]);
  });

  it('has no open issue that describes a factual error', () => {
    const factual = ids.flatMap((id) =>
      entry(id)
        .openIssues.filter((issue) => !PROCESS_GAPS.some((p) => p.test(issue)))
        .map((issue) => `${id}: ${issue}`),
    );
    expect(factual).toEqual([]);
  });

  it('moves at a controlled tempo', () => {
    expect(ids.filter((id) => !controlledTempo(id))).toEqual([]);
    // The criterion is not vacuous: fixed beats and hand-counted reps fail it.
    for (const id of [
      'kettlebell-swing',
      'squat-jump',
      'jumping-lunge',
      'burpee',
      'plank-arm-lift',
    ] as const)
      expect(controlledTempo(id)).toBe(false);
  });

  it('has a basic variant, except the practiced exercises for some and regular', () => {
    const levels = (id: ExerciseId) =>
      exerciseMetadata[id].variants.map((v) => v.technicalLevel);
    const withoutBasic = ids.filter((id) => !levels(id).includes('basic'));
    expect(withoutBasic.sort()).toEqual([...PRACTICED_ONLY].sort());
    for (const id of PRACTICED_ONLY) expect(levels(id)).toContain('practiced');
    expect(ids.flatMap(levels)).not.toContain('technical');
  });

  it('has dumbbell and kettlebell work for the PRODUCT weights', () => {
    const owns = (type: 'dumbbell' | 'kettlebell') =>
      ids.filter((id) =>
        exerciseMetadata[id].variants.some(
          (v) =>
            v.technicalLevel === 'basic' &&
            v.equipment.some((q) => q.type === type),
        ),
      );
    expect(owns('dumbbell').length).toBeGreaterThanOrEqual(5);
    expect(owns('kettlebell').length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Direct coverage from content/rosterSlots.ts, without the generator: which
 * set members each slot could offer under the existing equipment, weight and
 * level policy. Counts mirror pickFromSlot (no repeats) without its
 * above-level fallback, which would add a warning to the pass.
 */
describe('beginner set coverage from roster slots', () => {
  const inSet = (id: ExerciseId) => beginnerExerciseIds.has(id);
  type Experience = TrainingPreferences['experience'];
  const levels: Experience[] = ['new', 'some', 'regular'];
  const homeBase = ['bodyweight', 'chair', 'support'] as const;
  const bodyweight = (experience: Experience): TrainingPreferences => ({
    programId: 'general',
    equipment: [...homeBase],
    experience,
  });
  // PRODUCT.md: 2×5 kg and 2×10 kg dumbbells and a 16 kg kettlebell.
  const productWeights = (experience: Experience): TrainingPreferences => ({
    ...bodyweight(experience),
    weights: [
      { type: 'dumbbell', kg: 5, count: 2 },
      { type: 'dumbbell', kg: 10, count: 2 },
      { type: 'kettlebell', kg: 16, count: 1 },
    ],
  });

  const inLevel = (id: ExerciseId, p: TrainingPreferences) => {
    if (!beginnerExerciseIds.has(id) || rehabAdditionIds.has(id)) return false;
    const variant = chooseVariant(id, p);
    return (
      !!variant &&
      variantUsable(p, variant) &&
      allowedLevels(p.experience).includes(variant.technicalLevel)
    );
  };

  /** Helkropp A/B: one pick per general slot. */
  const wholeBody = (template: TemplateId, p: TrainingPreferences) => {
    const picked: ExerciseId[] = [];
    for (const slot of generalSlots[template]) {
      const id = slot.candidates.find(
        (c) => !picked.includes(c) && inLevel(c, p),
      );
      if (id) picked.push(id);
    }
    return picked;
  };

  /** A focus preset: every in-level candidate of its slots that hits its targets. */
  const focusPicks = (
    focus: 'upper' | 'lower' | 'push' | 'pull',
    p: TrainingPreferences,
  ) => {
    const preset = focusPresets.find((x) => x.id === focus);
    const targets = focusTargets({ id: focus });
    const picked = new Set<ExerciseId>();
    for (const slotId of preset?.slots ?? []) {
      const slot = focusSlots.find((s) => s.id === slotId);
      if (!slot?.targets.some((m) => targets.includes(m))) continue;
      for (const id of slot.candidates)
        if (
          exerciseMuscles[id].primary.some((m) => targets.includes(m)) &&
          inLevel(id, p)
        )
          picked.add(id);
    }
    return [...picked];
  };

  /** Core-only whole-body candidates: the filler plan rule 4 accepts ("… & bål"). */
  const coreFiller = (p: TrainingPreferences) => [
    ...new Set(
      [...generalSlots.A, ...generalSlots.B]
        .flatMap((s) => s.candidates)
        .filter(
          (id) =>
            exerciseMuscles[id].primary.every((m) => m === 'core') &&
            inLevel(id, p),
        ),
    ),
  ];
  const withFiller = (
    focus: 'upper' | 'push' | 'pull',
    p: TrainingPreferences,
  ) => [...new Set([...focusPicks(focus, p), ...coreFiller(p)])];

  describe.each(levels)('bodyweight, chair and wall · %s', (experience) => {
    const p = bodyweight(experience);
    it('fills Helkropp A and Underkropp & bål from slots alone', () => {
      expect(wholeBody('A', p).length).toBeGreaterThanOrEqual(4);
      expect(focusPicks('lower', p).length).toBeGreaterThanOrEqual(4);
    });
    it('fills Överkropp & bål with a press and a back exercise', () => {
      const upper = focusPicks('upper', p);
      const hits = (muscles: string[]) =>
        upper.some((id) =>
          exerciseMuscles[id].primary.some((m) => muscles.includes(m)),
        );
      expect(hits(['chest', 'triceps', 'shoulders'])).toBe(true);
      expect(hits(['back'])).toBe(true);
      expect(withFiller('upper', p).length).toBeGreaterThanOrEqual(4);
    });
    it('fills Drag with core filler', () => {
      expect(withFiller('pull', p).length).toBeGreaterThanOrEqual(4);
    });
    // Known gaps for `new`, left to the T2 fallback chain (plan rule 4):
    // - Helkropp B: glute bridge, back extension and plank only, because no
    //   basic split-leg exercise needs just a chair or wall and overhead and
    //   arm slots need weights.
    // - Press: knee push-up is the only basic bodyweight press in the slots
    //   (wall push-up is in none), so even with core filler it stays at 3.
    // No beginner set can close these: the whole catalogue gives the same
    // counts. Adding wall-push-up to the horizontal-press slot would close Press.
    it.runIf(experience !== 'new')(
      'fills Helkropp B and Press for experienced users',
      () => {
        expect(wholeBody('B', p).length).toBeGreaterThanOrEqual(4);
        expect(withFiller('push', p).length).toBeGreaterThanOrEqual(4);
      },
    );
  });

  describe.each(levels)('PRODUCT weights · %s', (experience) => {
    const p = productWeights(experience);
    it('fills Helkropp A/B, Underkropp, Överkropp and Drag from slots alone', () => {
      expect(wholeBody('A', p).length).toBeGreaterThanOrEqual(4);
      expect(wholeBody('B', p).length).toBeGreaterThanOrEqual(4);
      for (const focus of ['lower', 'upper', 'pull'] as const)
        expect(focusPicks(focus, p).length).toBeGreaterThanOrEqual(4);
    });
    it('fills Press, with core filler for new trainees', () => {
      const push =
        experience === 'new' ? withFiller('push', p) : focusPicks('push', p);
      expect(push.length).toBeGreaterThanOrEqual(4);
    });
  });

  // The programme generator draws from the set: every level × emphasis ×
  // 1-5 days, with the home base and with the PRODUCT weights, gives 4-6 set
  // exercises per pass and no warning. Whole-body passes cover legs, press,
  // back and core by the muscle-based rules/coverage.ts.
  describe.each(levels)('generated programmes · %s', (experience) => {
    const only =
      (weights: NonNullable<TrainingPreferences['weights']>) =>
      (experience: Experience): TrainingPreferences => ({
        ...bodyweight(experience),
        weights,
      });
    describe.each([
      ['bodyweight, chair and wall', bodyweight],
      ['PRODUCT weights', productWeights],
      [
        'only 2×20 kg dumbbells',
        only([{ type: 'dumbbell', kg: 20, count: 2 }]),
      ],
      [
        'only 2×10 kg dumbbells',
        only([{ type: 'dumbbell', kg: 10, count: 2 }]),
      ],
      [
        'only a 16 kg kettlebell',
        only([{ type: 'kettlebell', kg: 16, count: 1 }]),
      ],
    ] as const)('%s', (_name, prefsFor) => {
      const p = prefsFor(experience);
      for (const emphasis of ['full', 'run', 'upper'] as const)
        for (const days of [1, 2, 3, 4, 5] as const)
          it(`${emphasis} · ${days} days: 4-6 clean set exercises per pass`, () => {
            const program = buildProgram({
              preferences: p,
              daysPerWeek: days,
              emphasis,
              startDate: '2026-11-03',
              now: '2026-11-03T08:00:00.000Z',
              id: 'matrix',
              pool: beginnerExerciseIds,
            });
            expect(program).not.toBeNull();
            for (const pass of (program as TrainingProgram).passes) {
              const { exerciseIds } = pass;
              expect(exerciseIds.length).toBeGreaterThanOrEqual(4);
              expect(exerciseIds.length).toBeLessThanOrEqual(6);
              expect(new Set(exerciseIds).size).toBe(exerciseIds.length);
              expect(exerciseIds.filter((id) => !inSet(id))).toEqual([]);
              // No above-level pick and no warning: the pass is in-level.
              expect(exerciseIds.filter((id) => !inLevel(id, p))).toEqual([]);
              if (pass.focus === 'full')
                expect(missingCoverage(exerciseIds)).toEqual([]);
              const roster = buildRoster(p, pass.template, {
                focus: { id: pass.focus },
                pool: beginnerExerciseIds,
              });
              expect(roster.notes).toEqual({});
              expect(roster.note).toBeUndefined();
            }
          });
    });
  });
});
