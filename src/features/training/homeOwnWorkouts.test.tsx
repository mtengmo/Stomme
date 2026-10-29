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

const quickNames = () =>
  screen
    .getAllByRole('link')
    .filter((a) => a.textContent?.startsWith('Pass nummer'))
    .map((a) => a.textContent);

it('without a session shows the list and the two newest quick links', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(3));
  render(<App />);
  expect(await screen.findByText('Eller kör ett eget pass:')).toBeTruthy();
  await screen.findByRole('region', { name: 'Mina pass' });
  expect(quickNames()).toEqual(['Pass nummer 3', 'Pass nummer 2']);
  expect(await screen.findByRole('region', { name: 'Mina pass' })).toBeTruthy();
});

it('prefers the most recently used workouts', async () => {
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
  await screen.findByText('Eller kör ett eget pass:');
  await screen.findByRole('region', { name: 'Mina pass' });
  expect(quickNames()).toEqual(['Pass nummer 1', 'Pass nummer 3']);
});

it('keeps the list usable while only a preparation exists', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(1));
  await open();
  render(<App />);
  await screen.findByRole('heading', { name: 'Förbered ditt pass' });
  expect(await screen.findByRole('region', { name: 'Mina pass' })).toBeTruthy();
  expect(screen.queryByText('Avsluta passet först.')).toBeNull();
  expect(
    screen.getByRole('link', { name: 'Visa och starta: Pass nummer 1' }),
  ).toBeTruthy();
  expect(screen.getByText('Eller kör ett eget pass:')).toBeTruthy();
});

it('disables the list and hides quick links while a session runs', async () => {
  await setMeta(getDb(), 'customWorkouts', saved(1));
  await open('Pågår');
  render(<App />);
  await screen.findByRole('heading', { name: 'Fortsätt ditt pass' });
  expect(await screen.findByText('Avsluta passet först.')).toBeTruthy();
  expect(screen.queryByRole('link', { name: /Visa och starta/ })).toBeNull();
  expect(screen.queryByText('Eller kör ett eget pass:')).toBeNull();
});

it('hides quick links when nothing is saved', async () => {
  render(<App />);
  await screen.findByText('Inga egna pass än.');
  expect(screen.queryByText('Eller kör ett eget pass:')).toBeNull();
});
