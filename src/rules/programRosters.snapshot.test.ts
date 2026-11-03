import { expect, it } from 'vitest';
import { routineFocusIds } from '../content/focusPresets';
import type { TemplateId, TrainingPreferences } from '../domain/types';
import { buildRoster } from './programRosters';

const levels = ['new', 'some', 'regular'] as const;
const setups: Record<string, Partial<TrainingPreferences>> = {
  home: { equipment: ['bodyweight', 'chair', 'support'] },
  weights: {
    equipment: ['bodyweight', 'chair', 'support'],
    weights: [
      { type: 'dumbbell', kg: 5, count: 2 },
      { type: 'dumbbell', kg: 10, count: 2 },
      { type: 'kettlebell', kg: 16, count: 1 },
    ],
  },
  gear: {
    equipment: ['bodyweight', 'chair', 'support', 'step', 'pull-up-bar'],
    weights: [{ type: 'dumbbell', kg: 8, count: 2 }],
  },
};

/** Without a pool the generator must stay exactly as it was before programmes existed. */
it('buildRoster without a pool is unchanged', () => {
  const out: Record<string, unknown> = {};
  for (const experience of levels)
    for (const [name, setup] of Object.entries(setups))
      for (const template of ['A', 'B'] as TemplateId[])
        for (const focus of [undefined, ...routineFocusIds]) {
          const prefs = {
            programId: 'general',
            experience,
            equipment: [],
            ...setup,
          } as TrainingPreferences;
          out[`${experience}/${name}/${template}/${focus ?? 'default'}`] =
            buildRoster(prefs, template, focus ? { focus: { id: focus } } : {});
        }
  expect(out).toMatchSnapshot();
});
