// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { getDb } from '../../db/db';
import { inventory } from '../../test/inventory';
import { TrainingSetup } from './TrainingHome';

afterEach(cleanup);

const NOTE =
  'För balansklockan är det foten som rör sig; benet du står på tränar balansen.';

it('explains the moving foot under the side picker for the knee programme only', () => {
  const base = {
    programId: 'rehab' as const,
    equipment: [],
    experience: 'new' as const,
  };
  render(
    <TrainingSetup
      current={{ ...base, rehabFocus: 'knee-physio', rehabSide: 'both' }}
      onSaved={() => {}}
    />,
  );
  expect(screen.getByText(NOTE)).toBeTruthy();
  cleanup();
  render(
    <TrainingSetup
      current={{ ...base, rehabFocus: 'knee', rehabSide: 'both' }}
      onSaved={() => {}}
    />,
  );
  expect(screen.queryByText(NOTE)).toBeNull();
});

it('keeps owned weights and the body-part focus when setup is saved', async () => {
  await getDb().delete();
  await getDb().open();
  const weights = [{ type: 'dumbbell' as const, kg: 8, count: 2 as const }];
  const user = userEvent.setup();
  render(
    <TrainingSetup
      current={{
        programId: 'general',
        ...inventory({ dumbbells: [[5, 2]] }),
        experience: 'some',
        weights,
        bodyParts: ['legs'],
      }}
      onSaved={() => {}}
    />,
  );
  expect(
    (screen.getByRole('checkbox', { name: 'Ben & säte' }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  await user.click(screen.getByRole('checkbox', { name: 'Bål' }));
  await user.click(
    screen.getByRole('button', { name: 'Spara träningsinriktning' }),
  );
  await vi.waitFor(async () =>
    expect((await getDb().meta.get('training'))?.value).toMatchObject({
      weights,
      bodyParts: ['legs', 'core'],
      experience: 'some',
    }),
  );
});
