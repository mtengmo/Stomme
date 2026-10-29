// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

const prefs = {
  programId: 'running',
  equipment: ['bodyweight', 'chair', 'support'],
  experience: 'some',
};

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  sessionStorage.clear();
  window.location.hash = '#/?andra=utrustning';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
  await setMeta(getDb(), 'training', prefs);
});
afterEach(cleanup);

it('Egna pass shows the empty state and a create link, without saving prefs', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('radio', { name: 'Egna pass' }));
  expect(await screen.findByText('Inga egna pass än.')).toBeTruthy();
  expect(screen.queryByText('Vilken utrustning har du?')).toBeNull();
  expect(
    screen.queryByRole('button', { name: /Spara träningsinriktning/ }),
  ).toBeNull();
  const link = screen.getByRole('link', { name: 'Skapa nytt pass' });
  expect(link.getAttribute('href')).toBe('#/nytt-pass');
  expect((await getDb().meta.get('training'))?.value).toEqual(prefs);
});

it('Egna pass lists saved workouts with a preview link', async () => {
  await setMeta(getDb(), 'customWorkouts', [
    { id: 'w1', name: 'Morgonpass', exerciseIds: ['dead-bug', 'wall-sit'] },
  ]);
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('radio', { name: 'Egna pass' }));
  expect(await screen.findByText('Morgonpass')).toBeTruthy();
  expect(
    screen
      .getByRole('link', { name: 'Visa och starta: Morgonpass' })
      .getAttribute('href'),
  ).toBe('#/traning/A?workout=w1');
  await user.click(screen.getByRole('button', { name: 'Avbryt ändring' }));
  expect((await getDb().meta.get('training'))?.value).toEqual(prefs);
});
