// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Route, Router, Switch } from 'wouter';
import { readCustomWorkouts } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { useAppHashLocation } from '../../lib/hashLocation';
import { inventory } from '../../test/inventory';
import { CustomWorkoutList } from './CustomWorkoutList';
import { ExerciseLibrary } from './ExerciseLibrary';

const prefs = {
  programId: 'general',
  ...inventory({ dumbbells: [[5, 2]], support: ['chair', 'support'] }),
  experience: 'some',
};

beforeEach(async () => {
  sessionStorage.clear();
  await getDb().delete();
  await getDb().open();
  await getDb().meta.put({ key: 'training', value: prefs });
  await getDb().meta.put({
    key: 'customWorkouts',
    value: [
      { id: 'w1', name: 'Morgonpass', exerciseIds: ['dead-bug', 'wall-sit'] },
    ],
  });
});
afterEach(cleanup);

describe('Mina pass', () => {
  it('lists name, count, minutes and start link, and deletes only after confirming', async () => {
    window.history.replaceState(null, '', '/#/');
    const user = userEvent.setup();
    render(
      <Router hook={useAppHashLocation}>
        <CustomWorkoutList headingId="h" />
      </Router>,
    );
    expect(await screen.findByText('Morgonpass')).toBeTruthy();
    expect(screen.getByText(/^2 övn · ca \d+ min$/)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Visa och starta: Morgonpass' })
        .getAttribute('href'),
    ).toContain('/traning/A?workout=w1');
    await user.click(
      screen.getByRole('button', { name: 'Ta bort: Morgonpass' }),
    );
    expect(
      screen.getByText('Ta bort passet? Sparade pass i historiken finns kvar.'),
    ).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe('Behåll passet'),
    );
    await user.click(screen.getByRole('button', { name: 'Behåll passet' }));
    expect(
      readCustomWorkouts((await getDb().meta.get('customWorkouts'))?.value),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole('button', { name: 'Ta bort: Morgonpass' }),
    );
    await user.click(screen.getByRole('button', { name: 'Ta bort passet' }));
    await waitFor(() => expect(screen.queryByText('Morgonpass')).toBeNull());
    expect(
      readCustomWorkouts((await getDb().meta.get('customWorkouts'))?.value),
    ).toHaveLength(0);
  });

  it('adds picked exercises to an existing workout from ?till=', async () => {
    window.history.replaceState(null, '', '/#/ovningar?till=w1&sok=E');
    const user = userEvent.setup();
    render(
      <Router hook={useAppHashLocation}>
        <Switch>
          <Route path="/ovningar">{() => <ExerciseLibrary />}</Route>
          <Route>
            <p>Förhandsvisning</p>
          </Route>
        </Switch>
      </Router>,
    );
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    const dead = rows.find((row) =>
      row.getAttribute('aria-label')?.includes('Dead bug'),
    );
    await waitFor(() => expect(dead?.hasAttribute('disabled')).toBe(true));
    expect(screen.getAllByText('Redan i passet').length).toBeGreaterThan(0);
    const free = rows.find((row) => !row.hasAttribute('disabled'));
    await user.click(free as HTMLElement);
    await user.click(
      await screen.findByRole('button', { name: 'Lägg till i passet' }),
    );
    await waitFor(() =>
      expect(window.location.hash).toBe('#/traning/A?workout=w1'),
    );
    const [saved] = readCustomWorkouts(
      (await getDb().meta.get('customWorkouts'))?.value,
    );
    expect(saved?.exerciseIds).toHaveLength(3);
    expect(saved?.exerciseIds.slice(0, 2)).toEqual(['dead-bug', 'wall-sit']);
  });
});
