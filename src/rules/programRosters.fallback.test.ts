import { expect, it, vi } from 'vitest';
import { buildRoster } from './programRosters';

// No real inventory leaves a focus without three in-level picks, so mock a
// focus whose only candidate is above level to keep the last resort covered.
vi.mock('../content/rosterSlots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../content/rosterSlots')>()),
  focusSlots: [
    { id: 'row', targets: ['back'], candidates: ['chin-up'] },
    { id: 'vertical-pull', targets: ['back'], candidates: ['chin-up'] },
    { id: 'curl', targets: ['biceps'], candidates: [] },
    { id: 'carry', targets: ['forearms'], candidates: [] },
  ],
}));

it('falls back to the easiest above-level pick, noted, only when nothing is in level', () => {
  const roster = buildRoster(
    {
      programId: 'general',
      experience: 'new',
      equipment: ['bodyweight', 'pull-up-bar'],
    },
    'A',
    { focus: { id: 'pull' } },
  );
  expect(roster.ids).toEqual(['chin-up']);
  expect(roster.notes['chin-up']).toBeDefined();
  expect(roster.note).toBeUndefined();
});
