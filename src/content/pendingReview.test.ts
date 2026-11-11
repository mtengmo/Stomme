import { describe, expect, it } from 'vitest';
import { buildProgram } from '../rules/programPlan';
import { beginnerExerciseIds } from './beginnerSet';
import { readAuditLog } from './exerciseAudit';
import { pendingReviewIds, programExcludedIds } from './programExclusions';
import { programPool, widePool } from './widePool';

describe('exercises pending review', () => {
  it('lists the exercises added for cross-review', () => {
    expect(pendingReviewIds.has('renegade-row')).toBe(true);
    expect(pendingReviewIds.has('weighted-sit-up')).toBe(true);
  });

  it('are never approved in the audit log', () => {
    const log = readAuditLog();
    for (const id of pendingReviewIds) {
      const entry = log.find((e) => e.id === id);
      expect(entry, id).toBeDefined();
      expect(entry?.status, id).not.toBe('approved');
    }
  });

  it('stay out of the pools and are excluded from programmes', () => {
    for (const id of pendingReviewIds) {
      expect(programExcludedIds.has(id)).toBe(true);
      expect(beginnerExerciseIds.has(id)).toBe(false);
      expect(widePool(false).has(id)).toBe(false);
      expect(widePool(true).has(id)).toBe(false);
    }
  });

  it('never appear in generated programmes', () => {
    for (const experience of ['new', 'some', 'regular'] as const)
      for (const emphasis of ['full', 'run', 'upper'] as const)
        for (const seed of [1, 2, 3, 4, 5, 6]) {
          const program = buildProgram({
            preferences: {
              programId: 'general',
              equipment: ['bodyweight', 'chair', 'support'],
              experience,
              weights: [
                { type: 'dumbbell', kg: 5, count: 2 },
                { type: 'dumbbell', kg: 10, count: 2 },
              ],
            },
            daysPerWeek: 3,
            emphasis,
            startDate: '2026-11-03',
            now: '2026-11-03T08:00:00.000Z',
            id: 'pending',
            pool: programPool(experience, emphasis),
            curated: experience === 'new',
            seed,
          });
          for (const pass of program?.passes ?? [])
            for (const id of pendingReviewIds)
              expect(pass.exerciseIds).not.toContain(id);
        }
  });
});
