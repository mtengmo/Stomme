// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
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
  expect(screen.getAllByText(/^1 övning · ca \d+ min$/)).toHaveLength(5);
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
  expect(screen.getByText(/senast 19 okt$/)).toBeTruthy();
});

it('keeps the rows usable while only a preparation exists', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(1));
  await open();
  render(<App />);
  await screen.findByRole('heading', { name: 'Förbered ditt pass' });
  expect(await screen.findByRole('region', { name: 'Mina pass' })).toBeTruthy();
  expect(screen.queryByText('Avsluta passet först.')).toBeNull();
  expect(
    screen.getByRole('link', { name: /^Pass nummer 1 1 övning/ }),
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
