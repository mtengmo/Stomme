import { describe, expect, it } from 'vitest';
import { initialTrainingRoster } from './programRosters';

describe('initial training roster', () => {
  it('is empty for rehab', () => {
    expect(
      initialTrainingRoster(
        { programId: 'rehab', experience: 'new', equipment: [] },
        'A',
      ),
    ).toEqual([]);
  });

  it('keeps template candidates that fit the equipment', () => {
    const ids = initialTrainingRoster(
      {
        programId: 'general',
        experience: 'regular',
        equipment: ['bodyweight', 'dumbbell-2', 'chair', 'step', 'support'],
      },
      'A',
    );
    expect(ids).toContain('goblet-squat');
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  it('tops up a thin roster with bodyweight basics, without duplicates, to four', () => {
    for (const template of ['A', 'B'] as const) {
      const ids = initialTrainingRoster(
        { programId: 'general', experience: 'new', equipment: ['bodyweight'] },
        template,
      );
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(ids.length).toBeLessThanOrEqual(4);
    }
  });

  it('uses the template items for running', () => {
    const ids = initialTrainingRoster(
      {
        programId: 'running',
        experience: 'some',
        equipment: ['bodyweight', 'dumbbell-2', 'chair', 'step', 'support'],
      },
      'A',
    );
    expect(ids.length).toBeGreaterThan(0);
  });
});
