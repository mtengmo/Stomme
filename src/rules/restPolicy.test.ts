import { describe, expect, it } from 'vitest';
import { heavyStartAllowed } from './levelPolicy';
import { restSecFor } from './restPolicy';

describe('restSecFor', () => {
  it('gives the general programme 20 s, heavy lifts 30 s', () => {
    expect(heavyStartAllowed('goblet-squat')).toBe(true);
    expect(restSecFor('goblet-squat', { programId: 'general' })).toBe(30);
    expect(heavyStartAllowed('bent-over-row')).toBe(false);
    expect(restSecFor('bent-over-row', { programId: 'general' })).toBe(20);
  });

  it('keeps 60 s for rehab', () => {
    expect(restSecFor('goblet-squat', { programId: 'rehab' })).toBe(60);
    expect(restSecFor('bent-over-row', { programId: 'rehab' })).toBe(60);
  });
});
