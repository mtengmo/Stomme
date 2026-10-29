// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

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
});
afterEach(cleanup);

it('Home shows an empty Mina pass with a link to the picker', async () => {
  await setMeta(getDb(), 'training', prefs);
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByText('Inga egna pass än.')).toBeTruthy();
  await user.click(screen.getByRole('link', { name: 'Skapa eget pass' }));
  await screen.findByRole('heading', { name: 'Skapa eget pass' });
  expect(
    screen.getByText('Utrustning: stol, vägg · Träningsvana: Viss vana'),
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Ändra utrustning' }).getAttribute('href'),
  ).toBe('#/installningar/utrustning?tillbaka=nytt-pass');
});

it('creates one workout and leaves the setup and sessions alone', async () => {
  await setMeta(getDb(), 'training', prefs);
  window.location.hash = '#/nytt-pass';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Skapa eget pass' });
  const rows = await screen.findAllByRole('button', { name: /^Välj: / });
  await user.click(rows[0] as HTMLElement);
  await user.click(screen.getByRole('button', { name: 'Skapa pass' }));
  await screen.findByLabelText('Namn på passet');
  expect((await getDb().meta.get('training'))?.value).toEqual(prefs);
  expect(
    ((await getDb().meta.get('customWorkouts'))?.value as unknown[] | undefined)
      ?.length,
  ).toBe(1);
  expect(await getDb().sessions.count()).toBe(0);
});

it('blocks exercises outside the AAOS knee programme and keeps rehab prefs', async () => {
  const rehab = {
    programId: 'rehab',
    equipment: ['bodyweight', 'chair', 'support'],
    experience: 'new',
    rehabFocus: 'knee',
    rehabSide: 'both',
  };
  await setMeta(getDb(), 'training', rehab);
  window.location.hash = '#/nytt-pass';
  render(<App />);
  await screen.findByRole('heading', { name: 'Skapa eget pass' });
  expect(screen.getByText('Utrustning: stol, vägg')).toBeTruthy();
  expect(
    (await screen.findAllByText('Ingår inte i knäprogrammet')).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText(/ca \d+ min/)).toBeNull();
  expect((await getDb().meta.get('training'))?.value).toEqual(rehab);
});

it('returns to the picker after changing setup, and ignores other targets', async () => {
  await setMeta(getDb(), 'training', prefs);
  window.location.hash = '#/?andra=utrustning&tillbaka=nytt-pass';
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Avbryt ändring' }),
  );
  await screen.findByRole('heading', { name: 'Skapa eget pass' });
  cleanup();
  window.location.hash = '#/?andra=utrustning&tillbaka=https://evil.example';
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Avbryt ändring' }),
  );
  await screen.findByRole('heading', { name: 'Pass A' });
});
