// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readyWorkouts } from '../../content/readyWorkouts';
import { getDb } from '../../db/db';
import { isTrainingProgram, readTrainingProgram } from '../../db/program';
import { REDO_LOCKED_MESSAGE } from '../../db/training';
import { readyProgramPass } from '../../rules/readyProgramPass';
import { ProgramRedoEnd, rebuildProgram } from './ProgramConfirm';
import { programPrefs, programSession, seedProgram } from './programFixtures';

// The seeds the component draws are queued by each test.
const seeds: number[] = [];
vi.mock('../../lib/seed', () => ({ randomSeed: () => seeds.shift() ?? 99 }));

beforeEach(async () => {
  seeds.length = 0;
  await getDb().delete();
  await getDb().open();
});
afterEach(cleanup);

const signature = (p: { passes: { exerciseIds: string[] }[] } | null) =>
  JSON.stringify(p?.passes.map((x) => x.exerciseIds));

const mount = (
  program: Awaited<ReturnType<typeof seedProgram>>,
  preferences = programPrefs,
  onRebuilt = () => {},
) =>
  render(
    <ProgramRedoEnd
      mode="redo"
      preferences={preferences}
      program={program}
      onKeep={() => {}}
      onRebuilt={onRebuilt}
    />,
  );

const names = () =>
  screen.getAllByRole('listitem').map((li) => li.textContent?.trim());

it('rebuilds a ready programme as the same single pass on one day', async () => {
  const ready = readyProgramPass('running-strength', programPrefs);
  if (!ready) throw new Error('ready pass missing');
  const program = await seedProgram(3, programPrefs, ready);
  expect(program.daysPerWeek).toBe(1);
  const rebuilt = rebuildProgram(program, programPrefs, 'new', 7, 'x');
  expect(rebuilt?.daysPerWeek).toBe(1);
  expect(rebuilt?.passes).toEqual([ready]);
});

it('drops ballistic exercises from a kept ready pass when redone for level new', async () => {
  const power = readyWorkouts.find((w) => w.id === 'runner-power-seven');
  if (!power) throw new Error('ready workout missing');
  const pass = {
    focus: 'lower' as const,
    template: 'A' as const,
    exerciseIds: [...power.exerciseIds],
    ready: { id: power.id, name: power.name },
  };
  const regular = { ...programPrefs, experience: 'regular' as const };
  const program = await seedProgram(3, regular, pass);
  const rebuilt = rebuildProgram(program, regular, 'new', 7, 'x');
  expect(rebuilt?.level).toBe('new');
  expect(rebuilt?.passes[0]?.exerciseIds).toEqual([
    'single-leg-calf-raise',
    'dumbbell-rdl',
    'rear-foot-split-squat',
    'single-leg-rdl',
    'kettlebell-goblet-squat',
  ]);
  expect(isTrainingProgram(rebuilt)).toBe(true);
  // Other levels keep the pass as it is.
  expect(rebuildProgram(program, regular, 'regular', 7, 'x')?.passes).toEqual([
    pass,
  ]);
});

it('redoes a Löparens fem pass for level new into a valid programme', async () => {
  const regular = { ...programPrefs, experience: 'regular' as const };
  const pass = readyProgramPass('runner-five-london', regular);
  if (!pass) throw new Error('ready pass missing');
  const program = await seedProgram(3, regular, pass);
  const rebuilt = rebuildProgram(program, regular, 'new', 7, 'x');
  expect(isTrainingProgram(rebuilt)).toBe(true);
  expect(rebuilt?.passes[0]?.exerciseIds).not.toContain('lunge-with-rotation');
  expect(rebuilt?.passes[0]?.exerciseIds).not.toContain('plate-pogos');
});

it('keeps "Behåll programmet" enabled when no programme can be built', async () => {
  const program = await seedProgram(3);
  mount(program, { ...programPrefs, programId: 'rehab' });
  expect(screen.getByRole('alert').textContent).toMatch(/Det gick inte/);
  expect(
    (
      screen.getByRole('button', {
        name: 'Behåll programmet',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  expect(
    (
      screen.getByRole('button', {
        name: 'Gör om programmet nu',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

it('defaults to the current training level, not the level the programme was built for', async () => {
  const program = await seedProgram(3);
  mount(
    { ...program, level: 'new' },
    { ...programPrefs, experience: 'regular' },
  );
  expect(
    (
      screen.getByRole('radio', {
        name: 'Tränar regelbundet',
      }) as HTMLInputElement
    ).checked,
  ).toBe(true);
  expect(screen.getByText(/styr också din allmänna träningsvana/)).toBeTruthy();
});

it('says so when "Blanda igen" gives the same passes, and announces a real change', async () => {
  const program = await seedProgram(3);
  const user = userEvent.setup();
  // Same seed twice: the preview cannot change.
  seeds.push(5, 5);
  mount(program);
  expect(screen.getByRole('status').textContent).toBe('');
  await user.click(screen.getByRole('button', { name: 'Blanda igen' }));
  expect(screen.getByRole('status').textContent).toBe(
    'Inga fler likvärdiga övningar för din nivå och utrustning.',
  );
  cleanup();
  // A seed that gives other passes: a short polite status, no visible note.
  const base = rebuildProgram(program, programPrefs, 'new', 5, 'x');
  let other = 6;
  while (
    signature(rebuildProgram(program, programPrefs, 'new', other, 'x')) ===
    signature(base)
  )
    other += 1;
  seeds.push(5, other);
  mount(program);
  await user.click(screen.getByRole('button', { name: 'Blanda igen' }));
  expect(screen.getByRole('status').textContent).toBe('Passen är uppdaterade');
  expect(screen.queryByText(/Inga fler likvärdiga/)).toBeNull();
});

it('saves exactly the preview that "Blanda igen" produced', async () => {
  const program = await seedProgram(3);
  const user = userEvent.setup();
  const first = rebuildProgram(program, programPrefs, 'new', 5, 'x');
  let other = 6;
  while (
    signature(rebuildProgram(program, programPrefs, 'new', other, 'x')) ===
    signature(first)
  )
    other += 1;
  seeds.push(5, other);
  const onRebuilt = vi.fn();
  mount(program, programPrefs, onRebuilt);
  const before = names();
  await user.click(screen.getByRole('button', { name: 'Blanda igen' }));
  expect(names()).not.toEqual(before);
  const shown = names();
  await user.click(
    screen.getByRole('button', { name: 'Gör om programmet nu' }),
  );
  await waitFor(() => expect(onRebuilt).toHaveBeenCalled());
  const saved = await readTrainingProgram(getDb());
  expect(saved?.seed).toBe(other);
  expect(saved?.passes.flatMap((p) => p.exerciseIds).length).toBe(shown.length);
  expect(signature(saved)).toBe(
    signature(rebuildProgram(program, programPrefs, 'new', other, 'x')),
  );
});

it('shuffle off on an old programme without seed or level rebuilds from the first candidates', async () => {
  const program = await seedProgram(3);
  const { seed: _seed, level: _level, ...old } = program;
  const user = userEvent.setup();
  const onRebuilt = vi.fn();
  mount(old, programPrefs, onRebuilt);
  await user.click(
    screen.getByRole('checkbox', { name: 'Blanda om övningarna' }),
  );
  expect(screen.getByText(/Av: inga slumpade byten\./)).toBeTruthy();
  await user.click(
    screen.getByRole('button', { name: 'Gör om programmet nu' }),
  );
  await waitFor(() => expect(onRebuilt).toHaveBeenCalled());
  const saved = await readTrainingProgram(getDb());
  expect(saved?.seed).toBeUndefined();
  expect(saved?.level).toBe('new');
  expect(signature(saved)).toBe(
    signature(rebuildProgram(old, programPrefs, 'new', undefined, 'x')),
  );
});

it('curated to wide and back: the level decides the pool', async () => {
  const program = await seedProgram(3);
  const user = userEvent.setup();
  const onRebuilt = vi.fn();
  mount(program, programPrefs, onRebuilt);
  await user.click(screen.getByRole('radio', { name: 'Tränar regelbundet' }));
  await user.click(
    screen.getByRole('button', { name: 'Gör om programmet nu' }),
  );
  await waitFor(() => expect(onRebuilt).toHaveBeenCalled());
  expect(await readTrainingProgram(getDb())).toMatchObject({
    curated: false,
    level: 'regular',
  });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    experience: 'regular',
  });
});

it('refuses to redo while a session with work runs, also with an unchanged level', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'in_progress');
  const [running] = await getDb().sessions.toArray();
  await getDb().sessions.update(running?.id ?? '', { note: 'pågår' });
  const user = userEvent.setup();
  const onRebuilt = vi.fn();
  mount(program, programPrefs, onRebuilt);
  await user.click(
    screen.getByRole('button', { name: 'Gör om programmet nu' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    REDO_LOCKED_MESSAGE,
  );
  expect(onRebuilt).not.toHaveBeenCalled();
  expect((await readTrainingProgram(getDb()))?.id).toBe('prog-1');
});
