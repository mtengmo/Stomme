import { describe, expect, it } from 'vitest';
import { exerciseSideCue } from './exerciseSideCues';
import { exerciseList } from './exercises';

describe('exerciseSideCue', () => {
  it('describes every unilateral catalogue exercise', () => {
    const missing = exerciseList
      .filter((exercise) => exercise.perSide)
      .filter((exercise) =>
        (['right', 'left'] as const).some(
          (side) => !exerciseSideCue(exercise.id, side),
        ),
      )
      .map((exercise) => exercise.id);

    expect(missing).toEqual([]);
  });

  it('keeps the explicit opposite-limb pairing for E04 and E10', () => {
    for (const id of ['dead-bug', 'bird-dog'] as const) {
      expect(exerciseSideCue(id, 'right')).toEqual({
        label: 'höger arm + vänster ben',
        explanation:
          id === 'dead-bug'
            ? 'Sträck höger arm och vänster ben; håll den andra armen upp och det andra knät böjt.'
            : 'Sträck höger arm och vänster ben; motsatt arm och knä ger stöd.',
      });
      expect(exerciseSideCue(id, 'left')).toEqual({
        label: 'vänster arm + höger ben',
        explanation:
          id === 'dead-bug'
            ? 'Sträck vänster arm och höger ben; håll den andra armen upp och det andra knät böjt.'
            : 'Sträck vänster arm och höger ben; motsatt arm och knä ger stöd.',
      });
    }
  });

  it('uses exercise-specific meanings for supporting and moving limbs', () => {
    expect(exerciseSideCue('single-leg-rdl', 'right')?.label).toBe(
      'Stå på höger ben',
    );
    expect(exerciseSideCue('kneeling-hip-flexor-stretch', 'left')?.label).toBe(
      'vänster knä i golvet',
    );
    expect(exerciseSideCue('side-lying-hip-abduction', 'right')?.label).toBe(
      'höger ben överst',
    );
    expect(exerciseSideCue('side-lying-hip-adduction', 'left')?.label).toBe(
      'vänster sida nedåt',
    );
    expect(exerciseSideCue('balance-clock', 'right')?.label).toBe(
      'höger fot rör sig · stå på vänster ben',
    );
    expect(exerciseSideCue('side-lunge', 'right')?.label).toBe('Kliv åt höger');
    expect(exerciseSideCue('side-lunge', 'left')?.explanation).toContain(
      'vänstra benet',
    );
  });

  it('returns no cue for both sides', () => {
    expect(exerciseSideCue('bird-dog', 'both')).toBeUndefined();
  });
});
