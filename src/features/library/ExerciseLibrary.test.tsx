// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Link, Route, Router, Switch } from 'wouter';
import { exerciseList, exercises } from '../../content/exercises';
import { exerciseMuscles, type MuscleGroupId } from '../../content/muscles';
import { getDb } from '../../db/db';
import { toggleFavourite } from '../../db/favourites';
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

function openFilters() {
  const button = screen.getByRole('button', { name: 'Filtrera' });
  if (button.getAttribute('aria-expanded') === 'false') fireEvent.click(button);
}

const programIds = (offset: number) =>
  exerciseList
    .filter((e) => !e.optional)
    .slice(offset * 4, offset * 4 + 4)
    .map((e) => e.id);

const detailed = () => localStorage.setItem('stomme.library-view', 'detailed');

beforeEach(async () => {
  await getDb().delete();
  await getDb().open();
  localStorage.clear();
  window.history.replaceState(null, '', '/#/ovningar');
});
afterEach(cleanup);

describe('exercise library', () => {
  it('keeps the filters behind a collapsed Filtrera button and has no review link', () => {
    render(<TestRoutes />);
    const button = screen.getByRole('button', { name: 'Filtrera' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('Sök övning')).toBeNull();
    expect(screen.queryByLabelText('Sortera')).toBeNull();
    expect(screen.queryByRole('link', { name: /AAOS/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Granska/ })).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Sök övning')).toBeTruthy();
    expect(screen.getByLabelText('Sortera')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kompakt' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /AAOS/ })).toBeTruthy();
  });

  it('opens the panel when the URL already has a filter', () => {
    window.history.replaceState(null, '', '/#/ovningar?omrade=legs');
    render(<TestRoutes />);
    expect(
      screen
        .getByRole('button', { name: 'Filtrera' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('shows Ditt program, grouped per pass, only when there is a programme', async () => {
    render(<TestRoutes />);
    expect(screen.queryByRole('heading', { name: 'Ditt program' })).toBeNull();
    cleanup();
    const passes = [
      { focus: 'full', template: 'A', exerciseIds: programIds(0) },
      { focus: 'full', template: 'B', exerciseIds: programIds(1) },
    ];
    await getDb().meta.put({
      key: 'trainingProgram',
      value: {
        id: 'p1',
        block: 1,
        createdAt: '2026-10-01T10:00:00.000Z',
        startDate: '2026-10-05',
        daysPerWeek: 2,
        emphasis: 'full',
        weekdays: [1, 4],
        passes,
        curated: true,
      },
    });
    render(<TestRoutes />);
    const section = (
      await screen.findByRole('heading', { name: 'Ditt program' })
    ).closest('section') as HTMLElement;
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Pass 1 · Helkropp', 'Pass 2 · Helkropp']);
    const first = exercises[passes[0]?.exerciseIds[0] as 'wall-sit'];
    const link = within(section).getByRole('link', { name: first.name });
    expect(link.getAttribute('href')).toBe(`#/ovning/${first.id}`);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Alla övningar' }),
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bE\d{1,3}\b/);
  });

  it('finds seated tibial rotation by its alias', async () => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    openFilters();
    await user.type(screen.getByLabelText('Sök övning'), 'tibiarotation');
    expect(
      screen.getByRole('link', {
        name: exercises['seated-tibial-rotation'].name,
      }),
    ).toBeTruthy();
  });
  it('finds step-down by its Swedish alias', async () => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    openFilters();
    await user.type(screen.getByLabelText('Sök övning'), 'nedsteg');
    expect(
      screen.getByRole('link', { name: exercises['step-down'].name }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: exercises['step-up'].name }),
    ).toBeNull();
  });
  it.each([
    ['sidohopp', 'single-leg-lateral-hop'],
    ['boxhopp', 'box-jump'],
    ['snabba fötter', 'fast-feet'],
    ['höga knän', 'knee-drive'],
    ['knee drives', 'knee-drive'],
    ['plate shuffle', 'lateral-shuffle'],
    ['in and out', 'in-and-out-jump'],
  ] as const)('finds %s by name', async (term, id) => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    openFilters();
    await user.type(screen.getByLabelText('Sök övning'), term);
    expect(screen.getByRole('link', { name: exercises[id].name })).toBeTruthy();
  });
  it.each(['in-and-out-jump', 'lateral-shuffle'] as const)(
    'draws the front view in the thumbnail of %s',
    async (id) => {
      const user = userEvent.setup();
      const { container } = render(<TestRoutes />);
      openFilters();
      openFilters();
      await user.type(screen.getByLabelText('Sök övning'), exercises[id].name);
      const row = screen
        .getByRole('link', { name: exercises[id].name })
        .closest('li') as HTMLElement;
      expect(row.querySelector('svg[data-view="front"]')).toBeTruthy();
      expect(row.innerHTML).toContain(`${id} – front`);
      void container;
    },
  );
  it('shows compact rows by default: name, one meta line and a 48 px toggle, no extras', () => {
    render(<TestRoutes />);
    openFilters();
    const row = screen
      .getByRole('link', { name: exercises['wall-sit'].name })
      .closest('li') as HTMLElement;
    expect(row.textContent).toContain('Kroppsvikt + stabilt stöd');
    expect(row.textContent).not.toContain('Utrustning:');
    expect(row.textContent).not.toContain('Favorit');
    expect(row.textContent).not.toContain('Ingår i Pass');
    expect(
      within(row).getByRole('button', {
        name: `Välj: ${exercises['wall-sit'].name}`,
      }).textContent,
    ).toBe('Välj');
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(
      1,
    );
  });

  it('switches to detailed rows and remembers it', async () => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    openFilters();
    await user.click(screen.getByRole('button', { name: 'Detaljerad' }));
    expect(localStorage.getItem('stomme.library-view')).toBe('detailed');
    expect(screen.getAllByText('Valfri övning').length).toBeGreaterThan(0);
    cleanup();
    render(<TestRoutes />);
    openFilters();
    expect(
      screen
        .getByRole('button', { name: 'Detaljerad' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('shows all exercises, equipment and optional status, without links into the removed programme', () => {
    detailed();
    render(<TestRoutes />);
    openFilters();
    expect(screen.getByRole('status').textContent).toBe(
      `${exerciseList.length} övningar`,
    );
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
    expect(screen.queryByRole('link', { name: /^Ingår i Pass/ })).toBeNull();
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
    openFilters();
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
    openFilters();
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
      expect(screen.getByRole('status').textContent).toBe(
        `${exerciseList.length} övningar`,
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Alla' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('resets an invalid URL filter without leaving a dead end', async () => {
    window.history.replaceState(null, '', '/#/ovningar?muskel=constructor');
    render(<TestRoutes />);
    openFilters();
    expect(screen.getByRole('status').textContent).toBe(
      `${exerciseList.length} övningar`,
    );
    await waitFor(() => expect(window.location.hash).toBe('#/ovningar'));
  });

  it('selects several body regions and shows their count', async () => {
    window.history.replaceState(null, '', '/#/ovningar?omrade=arms,legs');
    render(<TestRoutes />);
    openFilters();
    for (const name of ['Ben & säte', 'Armar'])
      expect(
        screen.getByRole('button', { name }).getAttribute('aria-pressed'),
      ).toBe('true');
    expect(screen.getByText(/2 valda/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(
      /för ben & säte och armar$/,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Armar' }));
    await waitFor(() =>
      expect(window.location.hash).toBe('#/ovningar?omrade=legs'),
    );
  });

  it('filters on a body region from the URL and keeps old muscle links working', () => {
    window.history.replaceState(null, '', '/#/ovningar?omrade=legs');
    render(<TestRoutes />);
    openFilters();
    expect(screen.getByRole('status').textContent).toMatch(/för ben & säte$/);
    expect(
      screen
        .getByRole('button', { name: 'Ben & säte' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    cleanup();
    window.history.replaceState(null, '', '/#/ovningar?muskel=calves');
    render(<TestRoutes />);
    openFilters();
    expect(
      screen
        .getByRole('button', { name: 'Vader' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('writes type, execution and one-side filters to the URL', async () => {
    const user = userEvent.setup();
    render(<TestRoutes />);
    openFilters();
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
    detailed();
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/#/ovningar?redskap=band');
    render(<TestRoutes />);
    openFilters();
    expect(screen.getAllByText(/Saknar utrustning:/).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Sök övning'), 'qqqqzzzz');
    expect(screen.getByText(/Inga övningar passar filtren\./)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Rensa filter' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        `${exerciseList.length} övningar`,
      ),
    );
  });

  describe('sort selector', () => {
    const firstRowName = () =>
      screen
        .getAllByRole('link', { name: /.+/ })
        .map((link) => link.getAttribute('aria-describedby'))
        .find(Boolean);
    const rowNames = () =>
      screen
        .getAllByRole('listitem')
        .filter((item) => item.querySelector('[id^="meta-"]'))
        .map((item) => item.querySelector('a')?.getAttribute('aria-label'));

    it('is a labelled native select that defaults to "Passar mig"', () => {
      render(<TestRoutes />);
      openFilters();
      const select = screen.getByLabelText('Sortera') as HTMLSelectElement;
      expect(select.tagName).toBe('SELECT');
      expect(select.value).toBe('fit');
      expect([...select.options].map((option) => option.text)).toEqual([
        'Passar mig',
        'Gillade först',
        'Namn A–Ö',
        'Senast tränade',
      ]);
      expect(firstRowName()).toBeTruthy();
    });

    it('writes the choice to the URL, drops it for the default and restores it on Back', async () => {
      const user = userEvent.setup();
      window.history.replaceState(null, '', '/#/ovningar?sok=utfall');
      render(<TestRoutes />);
      openFilters();
      await user.selectOptions(screen.getByLabelText('Sortera'), 'name');
      expect(window.location.hash).toBe('#/ovningar?sok=utfall&sort=name');
      const names = rowNames();
      expect(names).toEqual(
        [...names].sort((a, b) => (a ?? '').localeCompare(b ?? '', 'sv')),
      );
      await user.click(
        screen.getAllByRole('link', { name: /.+/ })[3] as HTMLElement,
      );
      await user.click(
        await screen.findByRole('button', { name: 'Tillbaka från övning' }),
      );
      await waitFor(() =>
        expect(
          (screen.getByLabelText('Sortera') as HTMLSelectElement).value,
        ).toBe('name'),
      );
      await user.selectOptions(screen.getByLabelText('Sortera'), 'fit');
      expect(window.location.hash).toBe('#/ovningar?sok=utfall');
    });

    it('keeps the sort when other filters change and when filters are cleared', async () => {
      const user = userEvent.setup();
      window.history.replaceState(
        null,
        '',
        '/#/ovningar?sort=liked&typ=mobility',
      );
      render(<TestRoutes />);
      openFilters();
      await user.click(screen.getByLabelText('Bara övningar en sida i taget'));
      expect(window.location.hash).toContain('sort=liked');
      await user.click(screen.getByRole('button', { name: 'Rensa filter' }));
      expect(window.location.hash).toBe('#/ovningar?sort=liked');
    });

    it('puts liked exercises first and follows a changed like', async () => {
      const user = userEvent.setup();
      window.history.replaceState(
        null,
        '',
        '/#/ovningar?sok=utfall&sort=liked',
      );
      render(<TestRoutes />);
      openFilters();
      await screen.findAllByRole('link', { name: /utfall/i });
      const before = rowNames();
      const last = before[before.length - 1] as string;
      const id = Object.values(exercises).find((e) => e.name === last)?.id;
      await toggleFavourite(getDb(), id as 'step-up');
      await waitFor(() => expect(rowNames()[0]).toBe(last));
      expect(rowNames()).toHaveLength(before.length);
      await user.selectOptions(screen.getByLabelText('Sortera'), 'name');
      await waitFor(() => expect(rowNames()[0]).not.toBe(last));
    });

    it('orders by the latest real set log and keeps unlogged exercises last', async () => {
      window.history.replaceState(
        null,
        '',
        '/#/ovningar?sok=utfall&sort=recent',
      );
      render(<TestRoutes />);
      openFilters();
      await screen.findByText(/Du har inte tränat något än/);
      const before = rowNames();
      const last = before[before.length - 1] as string;
      const id = Object.values(exercises).find((e) => e.name === last)?.id;
      await getDb().setLogs.add({
        id: 'log-1',
        sessionId: 's1',
        exerciseId: id as 'step-up',
        setNumber: 1,
        side: 'both',
        amount: 8,
        loadIndex: 0,
        weightKg: 0,
        loggedAt: '2026-10-01T10:00:00.000Z',
      });
      await waitFor(() => expect(rowNames()[0]).toBe(last));
      expect(screen.queryByText(/Du har inte tränat något än/)).toBeNull();
    });

    it('treats an unknown value as the default', () => {
      window.history.replaceState(null, '', '/#/ovningar?sort=popular');
      render(<TestRoutes />);
      openFilters();
      expect(
        (screen.getByLabelText('Sortera') as HTMLSelectElement).value,
      ).toBe('fit');
    });

    it('explains an alphabetical list when there is no training history', async () => {
      window.history.replaceState(null, '', '/#/ovningar?sort=recent');
      render(<TestRoutes />);
      openFilters();
      expect(
        await screen.findByText(/Du har inte tränat något än/),
      ).toBeTruthy();
    });
  });
});
