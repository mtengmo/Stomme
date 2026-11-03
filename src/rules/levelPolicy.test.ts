import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import {
  allowedLevels,
  chooseStartingWeight,
  chooseVariant,
  heavyStartAllowed,
  startingSeconds,
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

  it('starts timed exercises higher with experience and clamps to the range', () => {
    const drill = { start: 20, max: 45, step: 5 };
    expect(startingSeconds('new', drill)).toBe(20);
    expect(startingSeconds('some', drill)).toBe(30);
    expect(startingSeconds('regular', drill)).toBe(40);
    const short = { start: 10, max: 20, step: 5 };
    expect(startingSeconds('some', short)).toBe(20);
    expect(startingSeconds('regular', short)).toBe(20);
    const fixed = { start: 30, max: 30, step: 5 };
    expect(startingSeconds('regular', fixed)).toBe(30);
    // A range whose start already exceeds its maximum never starts below range.start.
    expect(startingSeconds('some', { start: 30, max: 20, step: 5 })).toBe(30);
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
      options: { heavyAllowed: boolean },
    ) => chooseStartingWeight(prefs(experience), variant, options).totalKg;
    const off = { heavyAllowed: true };
    expect(pick('new', off)).toBe(4);
    expect(pick('some', off)).toBe(8);
    expect(pick('regular', off)).toBe(12);
  });

  it('caps one-sided and overhead work', () => {
    const variant = chooseVariant('goblet-squat', prefs('regular'));
    if (!variant) throw new Error('missing variant');
    const capped = chooseStartingWeight(prefs('regular'), variant, {
      heavyAllowed: false,
    });
    expect(capped.totalKg).toBe(8);
    expect(capped.heavy).toBe(false);
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
      }).totalKg,
    ).toBe(12);
  });
});
