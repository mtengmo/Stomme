import { describe, expect, it } from 'vitest';
import type { Session, TrainingPreferences } from '../../domain/types';
import { defaultFocus, focusQuery, parseFocus } from '../../lib/focus';
import { startingFocus } from './focusModel';

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'new',
  equipment: ['bodyweight'],
};
describe('focus URLs and defaults', () => {
  it('accepts only preset IDs and nonempty unique whitelisted custom regions', () => {
    for (const id of [
      'full',
      'upper',
      'lower',
      'push',
      'pull',
      'legs',
    ] as const)
      expect(parseFocus(`?${focusQuery({ id })}`)).toEqual({ id });
    expect(parseFocus('?fokus=egen&delar=legs,core')).toEqual({
      id: 'custom',
      regions: ['legs', 'core'],
    });
    expect(focusQuery({ id: 'custom', regions: ['legs', 'core'] })).toBe(
      'fokus=egen&delar=legs,core',
    );
    for (const search of [
      '',
      '?fokus=bad',
      '?fokus=custom',
      '?fokus=egen',
      '?fokus=egen&delar=',
      '?fokus=egen&delar=legs,bad',
      '?fokus=egen&delar=legs,legs',
    ])
      expect(parseFocus(search)).toBeUndefined();
  });
  it('uses recovery, last used focus, onboarding regions, then full', () => {
    const now = new Date('2026-11-04T12:00:00Z');
    const session = {
      id: '1',
      programId: 'general',
      focus: 'push',
      status: 'completed',
      finishedAt: '2026-11-03T12:00:00Z',
      plan: [{ exerciseId: 'floor-press' }],
      feedback: {},
    } as Session;
    expect(
      startingFocus(preferences, [session], now, ['push', 'pull', 'full']),
    ).toEqual({ focus: { id: 'pull' }, suggested: true });
    expect(
      startingFocus(preferences, [session], new Date('2026-11-10T12:00:00Z'), [
        'push',
        'full',
      ]).focus,
    ).toEqual({ id: 'push' });
    expect(startingFocus(preferences, [], now, ['full']).focus).toEqual({
      id: 'full',
    });
    expect(defaultFocus({ ...preferences, bodyParts: ['legs'] })).toEqual({
      id: 'custom',
      regions: ['legs'],
    });
  });
});
