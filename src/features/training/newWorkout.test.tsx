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
it('keeps grouped saved workouts collapsed on the creation page without a duplicate create link', async () => {
  await setMeta(getDb(), 'training', prefs);
  await setMeta(getDb(), 'customWorkouts', [
    { id: 'one', name: 'Mitt presspass', exerciseIds: ['push-up'] },
  ]);
  window.location.hash = '#/nytt-pass';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Skapa eget pass' });
  expect(screen.queryByRole('heading', { name: 'Press' })).toBeNull();
  await user.click(screen.getByText('Dina sparade pass'));
  expect(await screen.findByRole('heading', { name: 'Press' })).toBeTruthy();
  expect(screen.getByText('Mitt presspass')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Skapa eget pass' })).toBeNull();
});

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

it('the builder links back to Övningar', async () => {
  await setMeta(getDb(), 'training', prefs);
  window.location.hash = '#/nytt-pass';
  render(<App />);
  const back = await screen.findByRole('link', { name: 'Till övningar' });
  expect(back.getAttribute('href')).toBe('#/ovningar');
});

it('the Övningar hub locks the own workouts while a session runs, not for a preparation', async () => {
  await setMeta(getDb(), 'training', prefs);
  await setMeta(getDb(), 'customWorkouts', [
    { id: 'one', name: 'Mitt presspass', exerciseIds: ['push-up'] },
  ]);
  window.location.hash = '#/ovningar';
  render(<App />);
  const own = () => screen.getByRole('region', { name: 'Egna pass' });
  await screen.findByRole('region', { name: 'Egna pass' }, { timeout: 10_000 });
  expect(
    await within(own()).findByRole(
      'link',
      { name: /Mitt presspass/ },
      { timeout: 10_000 },
    ),
  ).toBeTruthy();
  cleanup();
  await getDb().sessions.add({
    id: 'running',
    templateId: 'A',
    programId: 'general',
    date: new Date().toISOString().slice(0, 10),
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    plan: [],
    feedback: {},
    checkins: {},
    note: 'pågår',
  } as never);
  render(<App />);
  await screen.findByRole('region', { name: 'Egna pass' }, { timeout: 10_000 });
  await waitFor(
    () => {
      expect(within(own()).getByText(/Mitt presspass/)).toBeTruthy();
      expect(
        within(own()).queryByRole('link', { name: /Mitt presspass/ }),
      ).toBeNull();
    },
    { timeout: 10_000 },
  );
}, 30_000);
