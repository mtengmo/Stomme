// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { toLocalDate, weekdayIndex } from '../../lib/dates';

beforeEach(async () => {
  sessionStorage.clear();
  window.location.hash = '#/vecka';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
  await setMeta(getDb(), 'training', {
    programId: 'general',
    equipment: ['bodyweight'],
    experience: 'new',
  });
});
afterEach(cleanup);
it('keeps suggestions local until Save and offers complete focus presets without custom', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Planera veckan' });
  expect(screen.getAllByRole('combobox')).toHaveLength(7);
  expect(screen.queryByRole('option', { name: 'Välj själv' })).toBeNull();
  await user.click(screen.getByRole('button', { name: '4' }));
  await user.click(screen.getByRole('button', { name: 'Föreslå vecka' }));
  expect(await getDb().meta.get('weeklySchedule')).toBeUndefined();
  await user.click(screen.getByRole('button', { name: 'Spara' }));
  await waitFor(async () =>
    expect((await getDb().meta.get('weeklySchedule'))?.value).toHaveProperty(
      'days',
    ),
  );
  expect(
    (
      (await getDb().meta.get('weeklySchedule'))?.value as
        | { days: unknown[] }
        | undefined
    )?.days,
  ).toHaveLength(4);
});
it('limits manual assignments to five, explains conflict and preserves saved plan when leaving', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Planera veckan' });
  for (const name of [
    'Måndag',
    'Tisdag',
    'Onsdag',
    'Torsdag',
    'Fredag',
    'Lördag',
  ])
    await user.selectOptions(
      screen.getByRole('combobox', { name }),
      'focus:push',
    );
  expect(screen.getByRole('alert').textContent).toContain('högst fem');
  expect(screen.getByRole('status').textContent).toContain('samma muskler');
  await user.click(screen.getByRole('link', { name: 'Tillbaka' }));
  expect(await getDb().meta.get('weeklySchedule')).toBeUndefined();
});
it('routes today assignments through preview and ignores the weekly planner for rehab', async () => {
  const today = toLocalDate(new Date());
  await setMeta(getDb(), 'weeklySchedule', {
    days: [
      { day: weekdayIndex(today) + 1, plan: { kind: 'focus', focus: 'push' } },
    ],
  });
  window.location.hash = '#/';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Idag: Press' });
  expect(
    screen.getByRole('link', { name: 'Visa nästa pass' }).getAttribute('href'),
  ).toContain('fokus=push');
  await user.click(screen.getByRole('link', { name: 'Visa nästa pass' }));
  await screen.findByRole('heading', { name: 'Fokus: Press' });
  expect(await getDb().sessions.count()).toBe(0);
});
it('redirects rehabilitation away from the planner with no today card or focus row', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'rehab',
    rehabFocus: 'knee-physio',
    experience: 'new',
    equipment: ['bodyweight', 'chair', 'support'],
  });
  render(<App />);
  await screen.findByRole('link', { name: 'Visa nästa pass' });
  expect(screen.queryByRole('heading', { name: 'Planera veckan' })).toBeNull();
  expect(screen.queryByText(/^Idag:/)).toBeNull();
  expect(screen.queryByRole('link', { name: 'Byt' })).toBeNull();
});
