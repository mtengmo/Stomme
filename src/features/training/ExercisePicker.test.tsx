// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, Route, Router, Switch } from 'wouter';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import type { ExerciseId, TrainingPreferences } from '../../domain/types';
import { useAppHashLocation } from '../../lib/hashLocation';
import { ExercisePicker } from './ExercisePicker';

const preferences: TrainingPreferences = {
  programId: 'general',
  equipment: [
    'bodyweight',
    'dumbbell-2',
    'kettlebell-1',
    'chair',
    'support',
    'step',
  ],
  experience: 'some',
};

function PickerRoutes({
  allowedIds,
  replacingId,
  selectedIds = [],
  equipment = preferences.equipment,
  onChoose = () => {},
}: {
  allowedIds?: readonly ExerciseId[];
  replacingId?: ExerciseId;
  selectedIds?: ExerciseId[];
  equipment?: TrainingPreferences['equipment'];
  onChoose?: (id: ExerciseId) => void;
}) {
  const currentPreferences = { ...preferences, equipment };
  return (
    <Router hook={useAppHashLocation}>
      <Switch>
        <Route path="/picker">
          <ExercisePicker
            preferences={currentPreferences}
            selectedIds={selectedIds}
            replacingId={replacingId}
            allowedIds={allowedIds}
            pickerKey="picker-test"
            onChoose={onChoose}
            onCancel={() => {}}
          />
        </Route>
        <Route path="/ovning/:id">
          <button type="button" onClick={() => window.history.back()}>
            Tillbaka från övning
          </button>
        </Route>
        <Route>
          <Link href="/picker">Öppna väljare</Link>
        </Route>
      </Switch>
    </Router>
  );
}

beforeEach(async () => {
  window.history.replaceState(null, '', '/#/picker');
  window.sessionStorage.clear();
  await getDb().delete();
  await getDb().open();
});

afterEach(async () => {
  cleanup();
  window.sessionStorage.clear();
  await getDb().delete();
});

describe('ExercisePicker', () => {
  it('filters by broad body region and preserves primary/supporting labels', async () => {
    const user = userEvent.setup();
    render(
      <PickerRoutes
        allowedIds={['goblet-chair-squat', 'dead-bug', 'supported-row']}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Ben & säte' }));
    expect(screen.getByRole('status').textContent).toBe('1 övning');
    expect(screen.getByRole('listitem').textContent).toContain(
      'Tränar främst: Framsida lår, Säte',
    );
    expect(screen.queryByText('Dead bug')).toBeNull();
  });

  it('starts with same-slot replacement choices and broadens only on request', async () => {
    const user = userEvent.setup();
    render(
      <PickerRoutes
        replacingId="goblet-chair-squat"
        selectedIds={['goblet-chair-squat', 'dead-bug']}
        allowedIds={['goblet-squat', 'side-plank', 'dead-bug']}
      />,
    );
    expect(
      screen.getByText(/granskade alternativ med samma rörelsemönster/),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Byt till övningen' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Redan i passet' })).toBeNull();
    expect(screen.queryByText('Step-up (20–30 cm)')).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Visa alla övningar' }),
    );
    expect(screen.getByText(/Alla övningar visas/)).toBeTruthy();
    expect(screen.getByText(exercises['side-plank'].name)).toBeTruthy();
    const existingRow = screen
      .getByText(exercises['dead-bug'].name)
      .closest('li');
    expect(
      within(existingRow as HTMLElement)
        .getByRole('button', {
          name: 'Redan i passet',
        })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('keeps registered equipment as a hard limit when the equipment filter broadens', async () => {
    const user = userEvent.setup();
    render(
      <PickerRoutes
        allowedIds={['dead-bug', 'supported-row']}
        equipment={['bodyweight']}
      />,
    );
    await user.click(screen.getByText('Fler filter'));
    await user.selectOptions(screen.getByLabelText('Utrustning'), '');
    expect(screen.getByText('Dead bug')).toBeTruthy();
    expect(screen.queryByText(exercises['supported-row'].name)).toBeNull();
  });

  it('searches aliases and passes the selected exercise to the parent', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<PickerRoutes allowedIds={['dead-bug']} onChoose={onChoose} />);
    await user.type(
      screen.getByRole('searchbox', { name: 'Sök övning' }),
      'Döda insekten',
    );
    expect(screen.getByRole('status').textContent).toBe('1 övning');
    await user.click(
      screen.getByRole('button', { name: 'Lägg till övningen' }),
    );
    expect(onChoose).toHaveBeenCalledWith('dead-bug');
  });

  it('uses the saved favourite list as an advanced filter', async () => {
    await getDb().meta.put({ key: 'favourites', value: ['dead-bug'] });
    const user = userEvent.setup();
    render(<PickerRoutes allowedIds={['dead-bug', 'supported-row']} />);
    await user.click(screen.getByText('Fler filter'));
    await user.click(screen.getByLabelText('Bara mina favoriter'));
    expect(screen.getByRole('status').textContent).toBe('1 övning');
    expect(screen.getByText('Dead bug')).toBeTruthy();
    expect(screen.queryByText(exercises['supported-row'].name)).toBeNull();
  });

  it('disables already-added exercises and keeps filters after guide navigation and Back', async () => {
    const user = userEvent.setup();
    render(
      <PickerRoutes
        allowedIds={['goblet-chair-squat', 'goblet-squat']}
        selectedIds={['goblet-squat']}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Ben & säte' }));
    const selectedRow = screen
      .getByText(exercises['goblet-squat'].name)
      .closest('li');
    expect(
      within(selectedRow as HTMLElement)
        .getByRole('button', {
          name: 'Redan i passet',
        })
        .hasAttribute('disabled'),
    ).toBe(true);

    await user.click(
      screen.getByRole('link', {
        name: `Visa instruktion: ${exercises['goblet-chair-squat'].name}`,
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Tillbaka från övning' }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Ben & säte' })
          .getAttribute('aria-pressed'),
      ).toBe('true'),
    );
  });
});
