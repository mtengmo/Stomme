import { describe, expect, it } from 'vitest';
import { isTrainingPreferences } from '../../content/programmes';
import {
  DEFAULT_SUPPORT,
  emptyDraft,
  preferencesFromDraft,
  readDraft,
  showsWeights,
  stepsFor,
} from './quickStartModel';

describe('quick start model', () => {
  it('has one step list per goal', () => {
    expect(stepsFor(null)).toEqual(['goal']);
    expect(stepsFor('general')).toEqual([
      'goal',
      'equipment',
      'level',
      'focus',
    ]);
    expect(stepsFor('running')).toEqual(['goal', 'equipment', 'level']);
    for (const goal of ['knee', 'physio', 'custom'] as const)
      expect(stepsFor(goal)).toEqual(['goal', 'equipment']);
  });

  it('falls back to defaults for missing or damaged drafts', () => {
    expect(readDraft(null)).toEqual(emptyDraft);
    expect(readDraft('{nope')).toEqual(emptyDraft);
    expect(readDraft('[1,2]')).toEqual(emptyDraft);
    const draft = readDraft(
      JSON.stringify({
        goal: 'running',
        step: 'focus',
        equipment: ['laser'],
        experience: 9,
        bodyParts: ['legs', 'legs'],
      }),
    );
    expect(draft).toMatchObject({
      goal: 'running',
      step: 'equipment',
      equipment: DEFAULT_SUPPORT,
      experience: 'new',
      bodyParts: [],
    });
  });

  it('reads an old draft without a step as the equipment screen', () => {
    expect(readDraft(JSON.stringify({ goal: 'general' })).step).toBe(
      'equipment',
    );
  });

  it('keeps a valid new draft', () => {
    const draft = {
      ...emptyDraft,
      goal: 'general' as const,
      step: 'focus' as const,
      equipment: ['chair' as const, 'band' as const],
      experience: 'regular' as const,
      focus: 'select' as const,
      bodyParts: ['legs' as const],
    };
    expect(readDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it('reads and validates explicit adjustable settings in a saved draft', () => {
    const item = {
      type: 'dumbbell' as const,
      count: 2 as const,
      settingsKg: [2.5, 5, 7.5],
    };
    const valid = readDraft(
      JSON.stringify({ ...emptyDraft, adjustableWeights: [item] }),
    );
    expect(valid.adjustableWeights).toEqual([item]);
    expect(
      readDraft(
        JSON.stringify({
          ...emptyDraft,
          adjustableWeights: [{ ...item, settingsKg: [5, 5] }],
        }),
      ).adjustableWeights,
    ).toEqual([]);
  });

  it('starts with chair and wall and no weights', () => {
    expect(emptyDraft.equipment).toEqual(DEFAULT_SUPPORT);
    const prefs = preferencesFromDraft({ ...emptyDraft, goal: 'general' });
    expect(prefs.equipment).toEqual(['bodyweight', 'chair', 'support']);
    expect(prefs.weights).toBeUndefined();
    expect(prefs.adjustableWeights).toBeUndefined();
    expect(isTrainingPreferences(prefs)).toBe(true);
  });

  it('drops an old draft that stored dumbbell counts in the equipment list', () => {
    expect(
      readDraft(
        JSON.stringify({ goal: 'general', equipment: ['dumbbell-2', 'chair'] }),
      ).equipment,
    ).toEqual(DEFAULT_SUPPORT);
  });

  it('keeps only focus for general and only with Välj kroppsdelar', () => {
    const base = {
      ...emptyDraft,
      goal: 'general' as const,
      bodyParts: ['legs' as const],
    };
    expect(preferencesFromDraft(base).bodyParts).toBeUndefined();
    expect(
      preferencesFromDraft({ ...base, focus: 'select' }).bodyParts,
    ).toEqual(['legs']);
    expect(
      preferencesFromDraft({ ...base, goal: 'running', focus: 'select' })
        .bodyParts,
    ).toBeUndefined();
  });

  it('always saves new for rehab and drops equipment the goal cannot use', () => {
    const prefs = preferencesFromDraft({
      ...emptyDraft,
      goal: 'physio',
      experience: 'regular',
      equipment: ['chair', 'band', 'step'],
      side: 'left',
    });
    expect(prefs).toMatchObject({
      programId: 'rehab',
      experience: 'new',
      rehabFocus: 'knee-physio',
      rehabSide: 'left',
      equipment: ['bodyweight', 'chair', 'band'],
    });
  });

  it('offers tools and weights for custom rehab but not for knee or physio', () => {
    const weights = [{ type: 'dumbbell' as const, kg: 8, count: 2 as const }];
    const adjustableWeights = [
      {
        type: 'kettlebell' as const,
        count: 1 as const,
        settingsKg: [8, 12, 16],
      },
    ];
    const draft = {
      ...emptyDraft,
      weights,
      adjustableWeights,
    };
    const custom = preferencesFromDraft({ ...draft, goal: 'custom' });
    expect(showsWeights('custom')).toBe(true);
    expect(showsWeights('knee')).toBe(false);
    expect(custom.weights).toEqual(weights);
    expect(custom.adjustableWeights).toEqual(adjustableWeights);
    for (const goal of ['knee', 'physio'] as const) {
      const prefs = preferencesFromDraft({ ...draft, goal });
      expect(prefs.weights).toBeUndefined();
      expect(prefs.adjustableWeights).toBeUndefined();
    }
  });

  it('adds a pick step only for building your own workout', () => {
    expect(stepsFor('build')).toEqual(['goal', 'equipment', 'level', 'pick']);
    for (const goal of [
      'general',
      'running',
      'knee',
      'physio',
      'custom',
    ] as const)
      expect(stepsFor(goal)).not.toContain('pick');
  });

  it('accepts a stored pick step only for build', () => {
    expect(
      readDraft(JSON.stringify({ goal: 'build', step: 'pick' })).step,
    ).toBe('pick');
    for (const goal of ['general', 'running', 'knee', 'physio', 'custom'])
      expect(readDraft(JSON.stringify({ goal, step: 'pick' })).step).not.toBe(
        'pick',
      );
    expect(readDraft(JSON.stringify({ step: 'pick' })).step).toBe('goal');
  });

  it('keeps pick filters as a short string only', () => {
    expect(
      readDraft(JSON.stringify({ goal: 'build', pickFilters: 'sok=x' }))
        .pickFilters,
    ).toBe('sok=x');
    expect(
      readDraft(JSON.stringify({ pickFilters: 'a'.repeat(501) })).pickFilters,
    ).toBe('');
    expect(readDraft(JSON.stringify({ pickFilters: 5 })).pickFilters).toBe('');
  });

  it('turns a build draft into general preferences without focus or rehab fields', () => {
    const prefs = preferencesFromDraft({
      ...emptyDraft,
      goal: 'build',
      equipment: ['chair', 'band', 'laser' as never],
      experience: 'regular',
      focus: 'select',
      bodyParts: ['legs'],
    });
    expect(prefs).toEqual({
      programId: 'general',
      equipment: ['bodyweight', 'chair', 'band'],
      experience: 'regular',
    });
  });
});
