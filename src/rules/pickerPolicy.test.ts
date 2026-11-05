import { describe, expect, it } from 'vitest';
import { retiredExerciseIds } from '../content/retiredExercises';
import { rehabImpactExercises } from '../content/rosterSlots';
import { pickableInProgramme } from './pickerPolicy';

describe('pickableInProgramme', () => {
  it('hides every impact exercise in rehab', () => {
    for (const id of rehabImpactExercises)
      expect(pickableInProgramme(id, { programId: 'rehab' })).toBe(false);
    expect(pickableInProgramme('box-jump', { programId: 'rehab' })).toBe(false);
    expect(
      pickableInProgramme('single-leg-lateral-hop', { programId: 'rehab' }),
    ).toBe(false);
  });

  it('hides the quick feet drills in rehab and offers them in general training', () => {
    for (const id of [
      'in-and-out-jump',
      'lateral-shuffle',
      'knee-drive',
    ] as const) {
      expect(pickableInProgramme(id, { programId: 'rehab' })).toBe(false);
      expect(pickableInProgramme(id, { programId: 'general' })).toBe(true);
    }
  });

  it('hides pogo hops in rehab and leaves the static lunge hold out of the impact set', () => {
    expect(pickableInProgramme('plate-pogos', { programId: 'rehab' })).toBe(
      false,
    );
    expect(rehabImpactExercises.has('isometric-lunge-hold')).toBe(false);
    expect(pickableInProgramme('plate-pogos', { programId: 'general' })).toBe(
      true,
    );
  });

  it('never offers a retired exercise, in any programme', () => {
    for (const id of retiredExerciseIds)
      for (const programId of ['general', 'rehab'] as const)
        expect(pickableInProgramme(id, { programId })).toBe(false);
  });

  it('allows ordinary exercises in rehab', () => {
    expect(pickableInProgramme('step-up', { programId: 'rehab' })).toBe(true);
    expect(pickableInProgramme('dead-bug', { programId: 'rehab' })).toBe(true);
  });

  it('allows impact exercises outside rehab', () => {
    for (const programId of ['general'] as const)
      expect(pickableInProgramme('box-jump', { programId })).toBe(true);
    expect(pickableInProgramme('burpee', { programId: 'general' })).toBe(true);
  });
});
