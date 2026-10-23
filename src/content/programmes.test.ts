import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import {
  isTrainingPreferences,
  rehabGroup,
  rehabGroupOf,
  trainingName,
} from './programmes';

const base: TrainingPreferences = {
  programId: 'rehab',
  experience: 'new',
  equipment: ['bodyweight'],
};

describe('rehab groups', () => {
  it('maps every focus to exactly one group', () => {
    expect(rehabGroup(base)).toBe('custom');
    expect(rehabGroup({ rehabFocus: 'custom' })).toBe('custom');
    expect(rehabGroup({ rehabFocus: 'knee' })).toBe('aaos');
    expect(rehabGroup({ rehabFocus: 'knee-physio' })).toBe('physio');
    expect(rehabGroupOf(undefined)).toBe('custom');
    expect(rehabGroupOf('knee-physio')).toBe('physio');
  });

  it('validates preferences for each focus and rejects unknown ones', () => {
    for (const rehabFocus of ['custom', 'knee', 'knee-physio'] as const)
      expect(isTrainingPreferences({ ...base, rehabFocus })).toBe(true);
    expect(isTrainingPreferences(base)).toBe(true);
    expect(isTrainingPreferences({ ...base, rehabFocus: 'hip' })).toBe(false);
  });

  it('names every training kind', () => {
    expect(trainingName({ programId: 'rehab', rehabFocus: 'knee' })).toBe(
      'Knärehab · AAOS',
    );
    expect(
      trainingName({ programId: 'rehab', rehabFocus: 'knee-physio' }),
    ).toBe('Knärehab · Fysioterapeutens program');
    expect(trainingName({ programId: 'rehab', rehabFocus: 'custom' })).toBe(
      'Mitt rehabprogram',
    );
    expect(trainingName({ programId: 'general' })).toBe('Allmän styrka');
    expect(trainingName({})).toBe('Knä och löpning · ursprungligt program');
  });
});
