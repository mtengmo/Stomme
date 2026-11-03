// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { programSession, seedProgram } from './programFixtures';

beforeEach(async () => {
  window.localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#/program?ny=1';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

it('shows the new programme with pass 1 as lead and the rest receding', async () => {
  await seedProgram(3);
  render(<App />);
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Ditt program' }),
  ).toBeTruthy();
  expect(
    screen.getByText('4 veckor · 3 pass i veckan · Hela kroppen'),
  ).toBeTruthy();
  expect(screen.getByText(/^Vecka 1/)).toBeTruthy();
  expect(
    screen.getByRole('region', { name: /^Nästa pass: Pass 1,/ }),
  ).toBeTruthy();
  expect(
    screen.getByRole('region', { name: /^Därefter: Pass 2,/ }),
  ).toBeTruthy();
  expect(
    screen.getByRole('region', { name: /^Därefter: Pass 3,/ }),
  ).toBeTruthy();
  expect(
    screen.getByText('Samma pass varje vecka, så ser du att du blir starkare.'),
  ).toBeTruthy();
  expect(screen.getAllByTestId('exercise-thumb').length).toBeGreaterThan(3);
});

it('has no warnings, no "Saknas" and no E-codes', async () => {
  await seedProgram(5);
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  const text = document.body.textContent ?? '';
  expect(text).not.toMatch(/Saknas|Obs|Varning/);
  expect(text).not.toMatch(/\bE\d{2}\b/);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('links the fixed primary button to the first programme pass', async () => {
  await seedProgram(2);
  render(<App />);
  const start = await screen.findByRole('link', {
    name: 'Starta första passet',
  });
  expect(start.getAttribute('href')).toBe('#/traning/A?program=1');
  expect(screen.getByRole('link', { name: 'Ändra programmet' })).toBeTruthy();
});

it('redirects to Home without a programme and once a pass is done', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'general',
    equipment: ['bodyweight'],
    experience: 'new',
  });
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Nästa pass' });
  cleanup();
  const program = await seedProgram(3);
  await programSession(program, 1, 1);
  window.location.hash = '#/program?ny=1';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1 av 4/ });
});

it('never shows the programme to rehab', async () => {
  await seedProgram(3);
  await setMeta(getDb(), 'training', {
    programId: 'rehab',
    equipment: ['bodyweight', 'chair', 'support'],
    experience: 'new',
    rehabFocus: 'knee',
    rehabSide: 'both',
  });
  render(<App />);
  await screen.findByRole('navigation', { name: 'Huvudmeny' });
  expect(screen.queryByRole('heading', { name: 'Ditt program' })).toBeNull();
  expect(
    screen.queryByRole('link', { name: 'Starta första passet' }),
  ).toBeNull();
});
