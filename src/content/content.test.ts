import { describe, expect, it } from 'vitest';
import { exerciseList, exercises } from './exercises';
import { templates } from './templates';

describe('exercise seed', () => {
  it('has 68 exercises with unique ids', () => {
    expect(exerciseList).toHaveLength(68);
    expect(new Set(exerciseList.map((e) => e.id)).size).toBe(68);
  });

  it.each(exerciseList)(
    '$id has valid ladder, indices, range and tips',
    (e) => {
      for (let i = 1; i < e.loadLadder.length; i++) {
        expect(e.loadLadder[i]?.kg).toBeGreaterThanOrEqual(
          e.loadLadder[i - 1]?.kg ?? 0,
        );
      }
      expect(e.startLoadIndex).toBeGreaterThanOrEqual(0);
      expect(e.startLoadIndex).toBeLessThan(e.loadLadder.length);
      expect(e.week1LoadIndex).toBeGreaterThanOrEqual(0);
      expect(e.week1LoadIndex).toBeLessThan(e.loadLadder.length);
      expect(e.range.start).toBeLessThanOrEqual(e.range.max);
      expect(e.tips).toHaveLength(3);
    },
  );
});

describe('templates', () => {
  it('resolve to known non-optional exercises', () => {
    for (const t of Object.values(templates)) {
      expect(t.items).toHaveLength(5);
      for (const item of t.items) {
        const ex = exercises[item.exerciseId];
        expect(ex).toBeDefined();
        expect(ex.optional).toBeUndefined();
      }
    }
  });

  it('uses 3 sets for the carry and 60 s rest everywhere', () => {
    const carry = templates.B.items.find(
      (i) => i.exerciseId === 'suitcase-carry',
    );
    expect(carry?.sets).toBe(3);
    for (const t of Object.values(templates)) {
      for (const i of t.items) expect(i.restSec).toBe(60);
    }
  });
});

describe('side-neutral copy', () => {
  it('has no fixed side words in tips of one-sided exercises', async () => {
    const { exerciseList } = await import('./exercises');
    for (const ex of exerciseList.filter((e) => e.perSide)) {
      // The balance clock names both foot-specific lists, in tip 2 only.
      const tips =
        ex.id === 'balance-clock'
          ? ex.tips.filter((_, index) => index !== 1)
          : ex.tips;
      const text = [...tips, ex.commonMistake, ex.easierVariant].join(' ');
      expect(text, ex.id).not.toMatch(/h(ö|o)ger|vänster/i);
    }
    expect(exerciseList.find((e) => e.id === 'balance-clock')?.tips[1]).toMatch(
      /höger fot.*vänster fot/,
    );
  });
});
