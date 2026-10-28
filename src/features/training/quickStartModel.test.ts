import { describe, expect, it } from 'vitest';
import { isTrainingPreferences } from '../../content/programmes';
import {
  BODYWEIGHT_EQUIPMENT,
  emptyDraft,
  preferencesFromDraft,
  readDraft,
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
        mode: 'x',
      }),
    );
    expect(draft).toMatchObject({
      goal: 'running',
      step: 'equipment',
      equipment: [],
      experience: 'new',
      bodyParts: [],
      mode: 'bodyweight',
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
      mode: 'equipment' as const,
      equipment: ['dumbbell-2' as const],
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

  it('maps Egenvikt to body, chair and wall without weights', () => {
    const prefs = preferencesFromDraft({
      ...emptyDraft,
      goal: 'general',
      equipment: ['dumbbell-2'],
      weights: [{ type: 'dumbbell', kg: 8, count: 2 }],
    });
    expect(prefs.equipment).toEqual(BODYWEIGHT_EQUIPMENT);
    expect(prefs.weights).toBeUndefined();
    expect(prefs.adjustableWeights).toBeUndefined();
    expect(isTrainingPreferences(prefs)).toBe(true);
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
      mode: 'equipment',
      experience: 'regular',
      equipment: ['chair', 'band', 'dumbbell-2'],
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
      mode: 'equipment' as const,
      equipment: ['dumbbell-2' as const],
      weights,
      adjustableWeights,
    };
    const custom = preferencesFromDraft({ ...draft, goal: 'custom' });
    expect(custom.equipment).toContain('dumbbell-2');
    expect(custom.weights).toEqual(weights);
    expect(custom.adjustableWeights).toEqual(adjustableWeights);
    for (const goal of ['knee', 'physio'] as const) {
      const prefs = preferencesFromDraft({ ...draft, goal });
      expect(prefs.equipment).not.toContain('dumbbell-2');
      expect(prefs.weights).toBeUndefined();
      expect(prefs.adjustableWeights).toBeUndefined();
    }
  });
});
