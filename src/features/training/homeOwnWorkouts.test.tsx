// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';
import { toLocalDate } from '../../lib/dates';

const prefs = {
  programId: 'general',
  equipment: ['bodyweight', 'chair', 'support'],
  experience: 'some',
};

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
  await setMeta(getDb(), 'training', prefs);
});
afterEach(cleanup);

const saved = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `w${i + 1}`,
    name: `Pass nummer ${i + 1}`,
    exerciseIds: ['single-leg-rdl'],
  }));

const open = (note?: string) =>
  createSession(getDb(), {
    templateId: 'A',
    programId: 'general',
    date: toLocalDate(new Date()),
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    programWeek: 1,
    plan: [],
    feedback: {},
    checkins: {},
    ...(note ? { note } : {}),
  } as never);

const rowNames = () =>
  screen
    .getAllByRole('link')
    .filter((a) => a.textContent?.startsWith('Pass nummer'))
    .map((a) => a.querySelector('span')?.textContent);

it('shows the newest three rows, the rest behind "Visa alla", no quick row', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(5));
  render(<App />);
  await screen.findByRole('region', { name: 'Mina pass' });
  expect(rowNames().slice(0, 3)).toEqual([
    'Pass nummer 5',
    'Pass nummer 4',
    'Pass nummer 3',
  ]);
  expect(screen.getByText('Visa alla 5 pass')).toBeTruthy();
  expect(screen.queryByText('Eller kör ett eget pass:')).toBeNull();
  expect(screen.queryByText(/Visa och starta/)).toBeNull();
  expect(screen.queryByRole('button', { name: /Ta bort/ })).toBeNull();
  expect(screen.getAllByText(/^Ben · 1 övning · ca \d+ min$/)).toHaveLength(5);
});

it('puts the most recently used first with a "senast" date', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(3));
  await createSession(getDb(), {
    templateId: 'A',
    programId: 'general',
    date: '2026-10-19',
    startedAt: '2026-10-19T08:00:00Z',
    status: 'completed',
    programWeek: 1,
    plan: [],
    feedback: {},
    customWorkoutId: 'w1',
  } as never);
  render(<App />);
  await screen.findByRole('region', { name: 'Mina pass' });
  expect(rowNames()).toEqual([
    'Pass nummer 1',
    'Pass nummer 3',
    'Pass nummer 2',
  ]);
  expect(
    screen.getByText(/Ben · 1 övning · ca \d+ min · senast 19 okt$/),
  ).toBeTruthy();
});

it('shows a workout group and only its assigned weekdays in Home metadata', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(5));
  await setMeta(getDb(), 'weeklySchedule', {
    days: [
      { day: 1, plan: { kind: 'workout', workoutId: 'w5' } },
      { day: 2, plan: { kind: 'standard' } },
      { day: 4, plan: { kind: 'workout', workoutId: 'w5' } },
      { day: 5, plan: { kind: 'focus', focus: 'pull' } },
    ],
  });
  render(<App />);
  await screen.findByRole('region', { name: 'Mina pass' });
  expect(
    screen.getByRole('link', {
      name: /Pass nummer 5 Ben · mån, tor · 1 övning · ca \d+ min/,
    }),
  ).toBeTruthy();
});

it('groups settings workouts in the fixed order of labels', async () => {
  await setMeta(getDb(), 'customWorkouts', [
    {
      id: 'upper',
      name: 'Överkropp',
      exerciseIds: ['floor-press', 'supported-row'],
    },
    { id: 'other', name: 'Bål', exerciseIds: ['dead-bug'] },
    {
      id: 'full',
      name: 'Helkropp',
      exerciseIds: ['floor-press', 'goblet-chair-squat'],
    },
    { id: 'legs', name: 'Ben', exerciseIds: ['goblet-chair-squat'] },
    { id: 'pull', name: 'Drag', exerciseIds: ['supported-row'] },
    { id: 'push', name: 'Press', exerciseIds: ['floor-press'] },
  ]);
  window.location.hash = '#/ovningar';
  render(<App />);
  const list = await screen.findByRole('region', { name: 'Mina pass' });
  expect(
    [...list.querySelectorAll('h3')].map((heading) => heading.textContent),
  ).toEqual(['Press', 'Drag', 'Ben', 'Överkropp', 'Helkropp', 'Övrigt']);
});

it('omits group and weekday labels for rehab in Home and settings', async () => {
  await setMeta(getDb(), 'training', { ...prefs, programId: 'rehab' });
  await setMeta(getDb(), 'customWorkouts', [
    {
      id: 'w1',
      name: 'Pass nummer 1',
      exerciseIds: ['single-leg-rdl'],
      group: 'push',
    },
  ]);
  await setMeta(getDb(), 'weeklySchedule', {
    days: [{ day: 1, plan: { kind: 'workout', workoutId: 'w1' } }],
  });
  render(<App />);
  const home = await screen.findByRole('region', { name: 'Mina pass' });
  const row = within(home).getByRole('link', { name: /Pass nummer 1/ });
  expect(row.textContent).toContain('1 övning');
  expect(row.textContent).not.toMatch(/Press|mån/);

  window.location.hash = '#/ovningar';
  await screen.findByRole('heading', { name: 'Övningar' });
  const settings = await screen.findByRole('region', { name: 'Mina pass' });
  expect(settings.querySelectorAll('h3')).toHaveLength(0);
});

it('keeps the rows usable while only a preparation exists', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(1));
  await open();
  render(<App />);
  await screen.findByRole('heading', { name: 'Förbered ditt pass' });
  expect(await screen.findByRole('region', { name: 'Mina pass' })).toBeTruthy();
  expect(screen.queryByText('Avsluta passet först.')).toBeNull();
  expect(
    screen.getByRole('link', { name: /^Pass nummer 1 Ben · 1 övning/ }),
  ).toBeTruthy();
});

it('makes the rows non-links while a session runs', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(1));
  await open('Pågår');
  render(<App />);
  await screen.findByRole('heading', { name: 'Fortsätt ditt pass' });
  expect(await screen.findByText('Avsluta passet först.')).toBeTruthy();
  expect(screen.queryByRole('link', { name: /^Pass nummer 1/ })).toBeNull();
  expect(
    screen.getByText('Pass nummer 1').closest('[aria-disabled]'),
  ).toBeTruthy();
});

it('shows the empty text when nothing is saved', async () => {
  render(<App />);
  await screen.findByText('Inga egna pass än.');
  expect(screen.queryByText('Eller kör ett eget pass:')).toBeNull();
});

const painLine =
  'Har du ont eller en skada? Välj Knärehab eller följ din vårdgivare.';

it('shows the pain guidance on the home screen for regular training', async () => {
  render(<App />);
  await screen.findByText(painLine);
});

it('does not show the pain guidance for rehab', async () => {
  await setMeta(getDb(), 'training', { ...prefs, programId: 'rehab' });
  render(<App />);
  await screen.findByRole('navigation', { name: 'Huvudmeny' });
  expect(screen.queryByText(painLine)).toBeNull();
});

it('keeps the empty Mina pass text without a programme but hides it with one', async () => {
  const { seedProgram } = await import('../program/programFixtures');
  render(<App />);
  await screen.findByText('Inga egna pass än.');
  cleanup();
  await seedProgram(3);
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1 av 4/ });
  expect(screen.queryByText('Inga egna pass än.')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Mina pass' })).toBeNull();
});
