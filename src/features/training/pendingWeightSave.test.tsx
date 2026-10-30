// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getDb } from '../../db/db';
import { getMeta, setMeta } from '../../db/repo';
import type { TrainingPreferences } from '../../domain/types';
import { Settings } from '../settings/Settings';
import { WorkoutEquipmentControls } from './WorkoutEquipmentControls';

const prefs: TrainingPreferences = {
  programId: 'general',
  equipment: ['bodyweight', 'chair', 'support'],
  experience: 'some',
};

beforeEach(async () => {
  window.location.hash = '#/installningar/utrustning';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'training', prefs);
});
afterEach(cleanup);

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
  await user.click(screen.getByRole('button', { name: 'Annan vikt, hantel' }));
}

it('Settings save adds a valid typed weight first', async () => {
  const user = userEvent.setup();
  render(<Settings page="utrustning" />);
  await screen.findByRole('checkbox', { name: 'Hantlar' });
  await openForm(user);
  await user.type(screen.getByLabelText('Vikt (kg)'), '7,5');
  await user.click(
    screen.getByRole('button', { name: 'Spara min utrustning' }),
  );
  await waitFor(async () =>
    expect(
      ((await getMeta(getDb(), 'training')) as TrainingPreferences).weights,
    ).toEqual([{ type: 'dumbbell', kg: 7.5, count: 2 }]),
  );
  expect(screen.getByText('Hantel 7,5 kg · par')).toBeTruthy();
});

it('Settings save with an empty form shows the error and saves nothing', async () => {
  const user = userEvent.setup();
  render(<Settings page="utrustning" />);
  await screen.findByRole('checkbox', { name: 'Hantlar' });
  await openForm(user);
  await user.click(
    screen.getByRole('button', { name: 'Spara min utrustning' }),
  );
  expect(screen.getByRole('alert').textContent).toMatch(/0,5 och 100/);
  expect(
    ((await getMeta(getDb(), 'training')) as TrainingPreferences).weights,
  ).toBeUndefined();
});

it('the per-workout apply adds a valid typed weight, and refuses an invalid one', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<WorkoutEquipmentControls home={prefs} onApply={onApply} />);
  await user.click(screen.getByText('Annan utrustning för detta pass'));
  await openForm(user);
  await user.type(screen.getByLabelText('Vikt (kg)'), 'tung');
  await user.click(
    screen.getByRole('button', { name: 'Använd utrustningen för detta pass' }),
  );
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toMatch(/0,5 och 100/);
  await user.clear(screen.getByLabelText('Vikt (kg)'));
  await user.type(screen.getByLabelText('Vikt (kg)'), '12');
  await user.click(
    screen.getByRole('button', { name: 'Använd utrustningen för detta pass' }),
  );
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({
      weights: [{ type: 'dumbbell', kg: 12, count: 2 }],
    }),
  );
});
