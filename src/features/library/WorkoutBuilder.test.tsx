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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Route, Router, Switch } from 'wouter';
import { exercises } from '../../content/exercises';
import { readCustomWorkouts } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import type { TrainingPreferences } from '../../domain/types';
import { useAppHashLocation } from '../../lib/hashLocation';
import { ExerciseLibrary } from './ExerciseLibrary';
import { ResultList } from './ExerciseResults';
import { SelectionStatus, WorkoutBuilder } from './WorkoutBuilder';

const general: TrainingPreferences = {
  programId: 'general',
  equipment: ['bodyweight', 'dumbbell-2', 'chair', 'support'],
  experience: 'some',
};

function Routes() {
  return (
    <Router hook={useAppHashLocation}>
      <Switch>
        <Route path="/ovningar">{() => <ExerciseLibrary />}</Route>
        <Route>
          <p>Annan sida</p>
        </Route>
      </Switch>
    </Router>
  );
}

const pick = (name: string) =>
  screen.getByRole('button', { name: `Välj: ${name}` });

beforeEach(async () => {
  sessionStorage.clear();
  await getDb().delete();
  await getDb().open();
  window.history.replaceState(null, '', '/#/ovningar?sok=E');
});
afterEach(cleanup);

async function seed(training: unknown) {
  await getDb().meta.put({ key: 'training', value: training });
}

describe('selection bar', () => {
  it('toggles with aria-pressed, shows count and time, and reorders', async () => {
    await seed(general);
    const user = userEvent.setup();
    render(<Routes />);
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    const names = rows
      .slice(0, 3)
      .map((row) => (row.getAttribute('aria-label') ?? '').slice(6));
    for (const name of names) await user.click(pick(name));
    expect(pick(names[0] as string).getAttribute('aria-pressed')).toBe('true');
    expect(pick(names[0] as string).textContent).toBe('Vald');
    expect(document.activeElement).toBe(pick(names[2] as string));
    const bar = screen.getByRole('region', { name: 'Valda övningar' });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(
        /^3 av 12 övningar · ca \d+ min/,
      ),
    );
    await user.click(within(bar).getByRole('button', { name: 'Visa valda' }));
    await user.click(
      within(bar).getByRole('button', { name: `Flytta ned: ${names[0]}` }),
    );
    const items = within(bar).getAllByRole('listitem');
    expect(items[1]?.textContent).toContain(names[0]);
    expect(screen.getByRole('status').textContent).toContain(
      'flyttad till plats 2',
    );
    expect(within(bar).queryByRole('status')).toBeNull();
    await user.click(
      within(bar).getByRole('button', { name: `Ta bort: ${names[2]}` }),
    );
    expect(screen.getByRole('status').textContent).toMatch(/^2 av 12 övningar/);
  });

  it('stops at 12 and disables the other rows', async () => {
    await seed(general);
    const user = userEvent.setup();
    render(<Routes />);
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    for (const row of rows.slice(0, 12)) await user.click(row);
    expect(screen.getAllByText('Högst 12 övningar.').length).toBeGreaterThan(0);
    expect(rows[12]?.hasAttribute('disabled')).toBe(true);
  });

  it('creates a workout with an automatic name and opens it', async () => {
    await seed(general);
    const user = userEvent.setup();
    render(<Routes />);
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    await user.click(rows[0] as HTMLElement);
    await user.click(rows[1] as HTMLElement);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Skapa pass' })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: 'Skapa pass' }));
    await waitFor(() =>
      expect(window.location.hash).toMatch(/^#\/traning\/A\?workout=/),
    );
    const [saved] = readCustomWorkouts(
      (await getDb().meta.get('customWorkouts'))?.value,
    );
    expect(saved?.name).toMatch(/^Eget pass \d{1,2} [a-zå]{3}$/);
    expect(saved?.exerciseIds).toHaveLength(2);
    expect(saved?.plan).toHaveLength(2);
    expect(sessionStorage.getItem('stomme.library-selection')).toBe('[]');
  });

  it('blocks non-programme rows in knee rehab and shows no time estimate', async () => {
    await seed({
      programId: 'rehab',
      equipment: ['bodyweight', 'chair', 'support'],
      experience: 'new',
      rehabFocus: 'knee',
    });
    window.history.replaceState(null, '', '/#/ovningar');
    const user = userEvent.setup();
    render(<Routes />);
    await screen.findAllByRole('button', { name: /^Välj: / });
    await waitFor(() =>
      expect(
        screen.getAllByText('Ingår inte i knäprogrammet').length,
      ).toBeGreaterThan(0),
    );
    const open = screen
      .getAllByRole('button', { name: /^Välj: / })
      .find((button) => !button.hasAttribute('disabled'));
    await user.click(open as HTMLElement);
    expect(screen.getByRole('status').textContent).toMatch(/^1 av 12 övningar/);
    expect(screen.getByRole('status').textContent).not.toContain('ca ');
  });

  it('links to the home page when there is no training setup', async () => {
    const user = userEvent.setup();
    render(<Routes />);
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    await user.click(rows[0] as HTMLElement);
    const link = await screen.findByRole('link', {
      name: 'Välj träningsinriktning för att skapa pass',
    });
    expect(link.getAttribute('href')).toContain('/');
  });

  it('disables creation at 30 saved workouts', async () => {
    await seed(general);
    await getDb().meta.put({
      key: 'customWorkouts',
      value: Array.from({ length: 30 }, (_, index) => ({
        id: `w${index}`,
        name: `Pass ${index}`,
        exerciseIds: ['dead-bug'],
      })),
    });
    const user = userEvent.setup();
    render(<Routes />);
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    await user.click(rows[0] as HTMLElement);
    await waitFor(() =>
      expect(screen.getByText(/Du kan spara 30 pass/)).toBeTruthy(),
    );
    expect(
      screen
        .getByRole('button', { name: 'Skapa pass' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
});

describe('live summary and host props', () => {
  it('updates one status region on tick and untick with a region split', async () => {
    await seed(general);
    const user = userEvent.setup();
    render(<Routes />);
    const rows = await screen.findAllByRole('button', { name: /^Välj: / });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    await user.click(rows[0] as HTMLElement);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(
        /^1 av 12 övningar · ca \d+ min/,
      ),
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    await user.click(rows[0] as HTMLElement);
    expect(screen.getByRole('status').textContent).toMatch(/^\d+ övningar/);
  });

  it('works with host preferences, own storage key, no saved list and onCreate', async () => {
    const user = userEvent.setup();
    const created: string[][] = [];
    render(
      <WorkoutBuilder
        preferences={general}
        storageKey="test.pick"
        showSaved={false}
        alwaysShowBar
        onCreate={(ids) => {
          created.push(ids);
        }}
      >
        <SelectionStatus resultText="2 övningar" />
        <ResultList
          title="Alla"
          items={[exercises['goblet-squat'], exercises['dead-bug']]}
          id="r"
          inventory={general.equipment}
        />
      </WorkoutBuilder>,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'Inga övningar valda än.',
    );
    const create = screen.getByRole('button', { name: 'Skapa pass' });
    expect(create.hasAttribute('disabled')).toBe(true);
    expect(create.getAttribute('aria-describedby')).toBe('builder-empty-hint');
    expect(screen.getByText('Välj minst en övning.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Mina pass' })).toBeNull();
    await user.click(pick(exercises['goblet-squat'].name));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(
        /^1 av 12 övningar · ca \d+ min.*Ben & säte 1/,
      ),
    );
    expect(sessionStorage.getItem('test.pick')).toBe('["goblet-squat"]');
    await user.click(screen.getByRole('button', { name: 'Skapa pass' }));
    await waitFor(() => expect(created).toEqual([['goblet-squat']]));
  });
});
