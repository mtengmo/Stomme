import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { inventory } from '../test/inventory';
import { favouriteAlternatives } from './favouriteSuggestions';

const preferences = (
  patch: Partial<TrainingPreferences> = {},
): TrainingPreferences => ({
  programId: 'general',
  experience: 'regular',
  ...inventory({ dumbbells: [[5, 1]], support: ['chair', 'support', 'step'] }),
  ...patch,
});

describe('favourite workout alternatives', () => {
  it('offers only compatible favourites from the same movement slot', () => {
    expect(
      favouriteAlternatives(
        'goblet-squat',
        ['goblet-chair-squat', 'hammer-curl', 'half-squat'],
        [],
        preferences(),
      ),
    ).toEqual(['goblet-chair-squat', 'half-squat']);
  });

  it('omits the current or already selected exercise and deduplicates favourite IDs', () => {
    expect(
      favouriteAlternatives(
        'goblet-squat',
        ['goblet-squat', 'goblet-chair-squat', 'goblet-chair-squat'],
        ['half-squat'],
        preferences(),
      ),
    ).toEqual(['goblet-chair-squat']);
  });

  it('filters out a favourite when its equipment is unavailable', () => {
    expect(
      favouriteAlternatives(
        'goblet-squat',
        ['goblet-chair-squat'],
        [],
        preferences({ equipment: ['bodyweight'] }),
      ),
    ).toEqual([]);
  });

  it('filters technical options by experience', () => {
    expect(
      favouriteAlternatives(
        'dumbbell-rdl',
        ['single-leg-rdl'],
        [],
        preferences({ experience: 'new' }),
      ),
    ).toEqual([]);
    expect(
      favouriteAlternatives(
        'dumbbell-rdl',
        ['single-leg-rdl'],
        [],
        preferences({ experience: 'regular' }),
      ),
    ).toEqual(['single-leg-rdl']);
  });

  it('never suggests favourites for a rehab programme', () => {
    expect(
      favouriteAlternatives(
        'goblet-squat',
        ['goblet-chair-squat'],
        [],
        preferences({ programId: 'rehab' }),
      ),
    ).toEqual([]);
  });
});

describe('experience levels', () => {
  it('allows practiced but not technical options for some experience', () => {
    const some = preferences({ experience: 'some' });
    expect(
      favouriteAlternatives('dumbbell-rdl', ['single-leg-rdl'], [], some),
    ).toEqual([]);
    expect(
      favouriteAlternatives('goblet-squat', ['half-squat'], [], some),
    ).toEqual(['half-squat']);
  });
});
