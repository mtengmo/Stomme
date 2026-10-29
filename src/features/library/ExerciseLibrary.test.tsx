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
import { exerciseMuscles, type MuscleGroupId } from '../../content/muscles';
import { useAppHashLocation } from '../../lib/hashLocation';
import { ExerciseLibrary } from './ExerciseLibrary';

const muscleCount = (group: MuscleGroupId) =>
  Object.values(exerciseMuscles).filter(
    (tags) => tags.primary.includes(group) || tags.secondary.includes(group),
  ).length;

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
    expect(screen.getByRole('status').textContent).toBe('86 övningar');
    expect(
      screen.getByRole('button', { name: 'Alla' }).getAttribute('aria-pressed'),
    ).toBe('true');
    // Read the links once: one getByRole per exercise walks the whole
    // accessibility tree 53 times and times out under coverage.
    const linkNames = new Set(
      Array.from(document.querySelectorAll('a')).map((a) =>
        (a.getAttribute('aria-label') ?? a.textContent ?? '').trim(),
      ),
    );
    for (const exercise of Object.values(exercises)) {
      expect(linkNames.has(exercise.name), exercise.name).toBe(true);
    }
    expect(
      screen.getAllByRole('link', { name: 'Ingår i Pass A' }),
    ).toHaveLength(5);
    expect(
      screen.getAllByRole('link', { name: 'Ingår i Pass B' }),
    ).toHaveLength(5);
    expect(screen.getAllByText('Valfri övning').length).toBeGreaterThan(0);
    const wallSit = screen
      .getByRole('link', { name: 'Väggsittning' })
      .closest('li');
    expect(wallSit?.textContent).toContain(
      'Utrustning: Kroppsvikt + stabilt stöd',
    );
  });

  it('separates primary and supporting matches from a directly opened URL', () => {
    window.history.replaceState(null, '', '/#/ovningar?muskel=hamstrings');
    render(<TestRoutes />);
    expect(screen.getByRole('status').textContent).toBe(
      `${muscleCount('hamstrings')} övningar för baksida lår`,
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
    expect(screen.getByRole('status').textContent).toBe(
      `${muscleCount('calves')} övningar för vader`,
    );
    await user.click(
      screen.getByRole('link', {
        name: exercises['single-leg-calf-raise'].name,
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Tillbaka från övning' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        `${muscleCount('calves')} övningar för vader`,
      ),
    );
    expect(window.location.hash).toBe('#/ovningar?muskel=calves');
    window.history.back();
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('86 övningar'),
    );
    expect(
      screen.getByRole('button', { name: 'Alla' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('resets an invalid URL filter without leaving a dead end', async () => {
    window.history.replaceState(null, '', '/#/ovningar?muskel=constructor');
    render(<TestRoutes />);
    expect(screen.getByRole('status').textContent).toBe('86 övningar');
    await waitFor(() => expect(window.location.hash).toBe('#/ovningar'));
  });

  it('filters on a body region from the URL and keeps old muscle links working', () => {
    window.history.replaceState(null, '', '/#/ovningar?omrade=legs');
    render(<TestRoutes />);
    expect(screen.getByRole('status').textContent).toMatch(/för ben & säte$/);
    expect(
      screen
        .getByRole('button', { name: 'Ben & säte' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    cleanup();
    window.history.replaceState(null, '', '/#/ovningar?muskel=calves');
    render(<TestRoutes />);
    expect(
      screen
        .getByRole('button', { name: 'Vader' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('writes type, execution and one-side filters to the URL', async () => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    await user.selectOptions(
      screen.getByLabelText('Typ av övning'),
      'mobility',
    );
    expect(window.location.hash).toBe('#/ovningar?typ=mobility');
    await user.selectOptions(screen.getByLabelText('Utförande'), 'time');
    await user.click(screen.getByLabelText('Bara övningar en sida i taget'));
    expect(window.location.hash).toContain('utforande=time');
    expect(window.location.hash).toContain('sida=1');
  });

  it('labels rows that lack equipment and offers to clear an empty result', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/#/ovningar?redskap=band');
    render(<TestRoutes />);
    expect(screen.getAllByText(/Saknar utrustning:/).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Sök övning'), 'qqqqzzzz');
    expect(screen.getByText(/Inga övningar passar filtren\./)).toBeTruthy();
    await user.click(
      screen.getAllByRole('button', { name: 'Rensa filter' })[1] as HTMLElement,
    );
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('86 övningar'),
    );
  });
});
