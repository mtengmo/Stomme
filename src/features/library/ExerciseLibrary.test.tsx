// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Link, Route, Router, Switch } from 'wouter';
import { exercises } from '../../content/exercises';
import { useAppHashLocation } from '../../lib/hashLocation';
import { ExerciseLibrary } from './ExerciseLibrary';

function TestRoutes() {
  return (
    <Router hook={useAppHashLocation}>
      <Switch>
        <Route path="/ovningar">{() => <ExerciseLibrary />}</Route>
        <Route path="/ovning/:id">
          <button type="button" onClick={() => window.history.back()}>
            Tillbaka från övning
          </button>
        </Route>
        <Route>
          <Link href="/ovningar">Övningar</Link>
        </Route>
      </Switch>
    </Router>
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/#/ovningar');
});
afterEach(cleanup);

describe('exercise library', () => {
  it('shows all exercises, equipment, template links and optional status', () => {
    render(<TestRoutes />);
    expect(screen.getByRole('status').textContent).toBe('11 övningar');
    expect(
      screen.getByRole('button', { name: 'Alla' }).getAttribute('aria-pressed'),
    ).toBe('true');
    for (const exercise of Object.values(exercises)) {
      expect(screen.getByRole('link', { name: exercise.name })).toBeTruthy();
    }
    expect(
      screen.getAllByRole('link', { name: 'Ingår i Pass A' }),
    ).toHaveLength(5);
    expect(
      screen.getAllByRole('link', { name: 'Ingår i Pass B' }),
    ).toHaveLength(5);
    expect(screen.getByText('Valfri övning')).toBeTruthy();
    expect(screen.getByText('Utrustning: Vägg · Kroppsvikt')).toBeTruthy();
  });

  it('separates primary and supporting matches from a directly opened URL', () => {
    window.history.replaceState(null, '', '/#/ovningar?muskel=hamstrings');
    render(<TestRoutes />);
    expect(screen.getByRole('status').textContent).toBe(
      '2 övningar för baksida lår',
    );
    const primary = screen.getByRole('region', { name: 'Tränar främst' });
    const supporting = screen.getByRole('region', { name: 'Hjälper till' });
    expect(
      within(primary).getByRole('link', {
        name: exercises['single-leg-rdl'].name,
      }),
    ).toBeTruthy();
    expect(
      within(supporting).getByRole('link', {
        name: exercises['single-leg-hip-thrust'].name,
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Dead bug' })).toBeNull();
  });

  it('preserves the selected filter through a detail visit and browser Back', async () => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    await user.click(screen.getByRole('button', { name: 'Vader' }));
    expect(window.location.hash).toBe('#/ovningar?muskel=calves');
    expect(window.location.search).toBe('');
    expect(screen.getByRole('status').textContent).toBe('1 övning för vader');
    await user.click(
      screen.getByRole('link', {
        name: exercises['single-leg-calf-raise'].name,
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Tillbaka från övning' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('1 övning för vader'),
    );
    expect(window.location.hash).toBe('#/ovningar?muskel=calves');
    window.history.back();
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('11 övningar'),
    );
    expect(
      screen.getByRole('button', { name: 'Alla' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('resets an invalid URL filter without leaving a dead end', async () => {
    window.history.replaceState(null, '', '/#/ovningar?muskel=constructor');
    render(<TestRoutes />);
    expect(screen.getByRole('status').textContent).toBe('11 övningar');
    await waitFor(() => expect(window.location.hash).toBe('#/ovningar'));
  });
});
