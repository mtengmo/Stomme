import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import { templates } from '../content/templates';
import { interimPlan } from './prescription';

describe('interimPlan load fallback', () => {
  it('falls back to 0 kg when the load index has no ladder entry', () => {
    const first = templates.A.items[0]?.exerciseId;
    if (!first) throw new Error('template A has no items');
    const ex = exercises[first];
    const original = ex.week1LoadIndex;
    try {
      ex.week1LoadIndex = 999;
      expect(interimPlan(templates.A, 1)[0]?.weightKg).toBe(0);
    } finally {
      ex.week1LoadIndex = original;
    }
  });
});
