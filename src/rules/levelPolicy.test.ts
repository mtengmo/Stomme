import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { inventory } from '../test/inventory';
import {
  allowedLevels,
  chooseStartingWeight,
  chooseVariant,
  heavyStartAllowed,
  startingSets,
} from './levelPolicy';
import { variantWeights } from './weightInventory';

const weights: TrainingPreferences['weights'] = [
  { type: 'dumbbell', kg: 4, count: 2 },
  { type: 'dumbbell', kg: 8, count: 2 },
  { type: 'dumbbell', kg: 12, count: 2 },
];
const prefs = (
  experience: TrainingPreferences['experience'],
  withWeights = true,
): TrainingPreferences => ({
  programId: 'general',
  experience,
  equipment: ['bodyweight', 'chair', 'support'],
  ...(withWeights ? { weights } : {}),
});

describe('level policy', () => {
  it('allows more technical levels as experience grows', () => {
    expect(allowedLevels('new')).toEqual(['basic']);
    expect(allowedLevels('some')).toEqual(['basic', 'practiced']);
    expect(allowedLevels('regular')).toEqual([
      'basic',
      'practiced',
      'technical',
    ]);
  });

  it('sets sets by level and position', () => {
    expect(startingSets('new')).toBe(2);
    expect(startingSets('some', 4)).toBe(3);
    expect(startingSets('regular', 0)).toBe(4);
    expect(startingSets('regular', 1)).toBe(4);
    expect(startingSets('regular', 2)).toBe(3);
  });

  it('starts new on the first variant and others on the heaviest loadable one', () => {
    expect(chooseVariant('goblet-squat', prefs('new'))?.id).toBe('bodyweight');
    expect(chooseVariant('goblet-squat', prefs('regular'))?.id).toBe(
      'dumbbell',
    );
  });

  it('falls back to bodyweight when no weight is registered', () => {
    expect(chooseVariant('goblet-squat', prefs('regular', false))?.id).toBe(
      'bodyweight',
    );
  });

  it('bypasses everything for rehab', () => {
    expect(
      chooseVariant('quad-set', {
        programId: 'rehab',
        experience: 'regular',
        equipment: ['bodyweight'],
      })?.id,
    ).toBe('bodyweight');
  });

  it('picks the starting weight by level', () => {
    const variant = chooseVariant('goblet-squat', prefs('regular'));
    if (!variant) throw new Error('missing variant');
    const pick = (
      experience: TrainingPreferences['experience'],
      options: { heavyAllowed: boolean; painOnRecord: boolean },
    ) => chooseStartingWeight(prefs(experience), variant, options).totalKg;
    const off = { heavyAllowed: true, painOnRecord: false };
    expect(pick('new', off)).toBe(4);
    expect(pick('some', off)).toBe(8);
    expect(pick('regular', off)).toBe(12);
  });

  it('caps one-sided and overhead work and honours pain on record', () => {
    const variant = chooseVariant('goblet-squat', prefs('regular'));
    if (!variant) throw new Error('missing variant');
    const capped = chooseStartingWeight(prefs('regular'), variant, {
      heavyAllowed: false,
      painOnRecord: false,
    });
    expect(capped.totalKg).toBe(8);
    expect(capped.heavy).toBe(false);
    expect(
      chooseStartingWeight(prefs('regular'), variant, {
        heavyAllowed: true,
        painOnRecord: true,
      }).totalKg,
    ).toBe(4);
    expect(heavyStartAllowed('goblet-squat')).toBe(true);
    expect(heavyStartAllowed('floor-press')).toBe(true);
    expect(heavyStartAllowed('bent-over-row')).toBe(false);
    expect(heavyStartAllowed('sumo-squat')).toBe(true);
    expect(heavyStartAllowed('weighted-glute-bridge')).toBe(false);
    expect(heavyStartAllowed('overhead-triceps-extension')).toBe(false);
    expect(heavyStartAllowed('dumbbell-pullover')).toBe(false);
    expect(heavyStartAllowed('side-lunge')).toBe(false);
    expect(heavyStartAllowed('walking-lunge')).toBe(false);
    expect(heavyStartAllowed('kettlebell-goblet-squat')).toBe(true);
    expect(heavyStartAllowed('russian-twist')).toBe(false);
    expect(heavyStartAllowed('woodchop')).toBe(false);
    expect(heavyStartAllowed('kettlebell-halo')).toBe(false);
    expect(heavyStartAllowed('one-arm-kettlebell-swing')).toBe(false);
    expect(heavyStartAllowed('shoulder-press')).toBe(false);
    expect(heavyStartAllowed('single-leg-rdl')).toBe(false);
    expect(heavyStartAllowed('split-squat')).toBe(false);
  });

  it('gives zero kilograms when nothing is registered', () => {
    const variant = chooseVariant('goblet-squat', prefs('regular'));
    if (!variant) throw new Error('missing variant');
    expect(
      chooseStartingWeight(prefs('regular', false), variant, {
        heavyAllowed: true,
        painOnRecord: false,
      }).totalKg,
    ).toBe(0);
  });

  it('never gives the heaviest weight outside the heavy slots, for two or one weight', () => {
    const two: TrainingPreferences = {
      ...prefs('regular'),
      equipment: ['bodyweight', 'chair', 'support'],
      weights: [
        { type: 'dumbbell', kg: 4, count: 2 },
        { type: 'dumbbell', kg: 8, count: 2 },
        { type: 'kettlebell', kg: 8, count: 1 },
        { type: 'kettlebell', kg: 12, count: 1 },
      ],
    };
    for (const id of [
      'shoulder-press',
      'split-squat',
      'hammer-curl',
      'single-leg-rdl',
    ] as const)
      for (const experience of ['some', 'regular'] as const) {
        const preferences = { ...two, experience };
        const variant = chooseVariant(id, preferences);
        if (!variant) throw new Error('missing variant');
        const choices = variantWeights(preferences, variant);
        if (!choices.length) continue;
        const picked = chooseStartingWeight(preferences, variant, {
          heavyAllowed: heavyStartAllowed(id),
          painOnRecord: false,
        }).totalKg;
        expect(picked).toBeLessThan(choices.at(-1)?.totalKg ?? 0);
      }
    // A single owned weight is simply used.
    const one: TrainingPreferences = {
      ...prefs('regular'),
      weights: [{ type: 'dumbbell', kg: 6, count: 2 }],
    };
    const variant = chooseVariant('shoulder-press', one);
    if (!variant) throw new Error('missing variant');
    expect(
      chooseStartingWeight(one, variant, {
        heavyAllowed: false,
        painOnRecord: false,
      }).totalKg,
    ).toBe(12);
  });
});
