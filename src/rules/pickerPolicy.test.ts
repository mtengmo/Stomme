import { describe, expect, it } from 'vitest';
import { impactExercises } from '../content/rosterSlots';
import { pickableInProgramme } from './pickerPolicy';

describe('pickableInProgramme', () => {
  it('hides every impact exercise in rehab', () => {
    for (const id of impactExercises)
      expect(pickableInProgramme(id, { programId: 'rehab' })).toBe(false);
    expect(pickableInProgramme('box-jump', { programId: 'rehab' })).toBe(false);
    expect(
      pickableInProgramme('single-leg-lateral-hop', { programId: 'rehab' }),
    ).toBe(false);
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
