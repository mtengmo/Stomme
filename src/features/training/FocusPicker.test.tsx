// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

beforeEach(async () => {
  sessionStorage.clear();
  window.location.hash = '#/fokus';
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
it('offers seven focuses, disables unavailable regions, and hands off through preview', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad tränar du idag?' });
  expect(screen.getAllByRole('radio')).toHaveLength(7);
  await user.click(screen.getByRole('radio', { name: 'Välj själv' }));
  expect(
    (screen.getByRole('checkbox', { name: 'Axlar' }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByRole('button', { name: 'Visa passet' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await user.click(screen.getByRole('checkbox', { name: 'Ben & säte' }));
  await user.click(screen.getByRole('button', { name: 'Visa passet' }));
  await screen.findByRole('heading', { name: 'Fokus: Välj själv' });
  expect(window.location.hash).toContain('fokus=egen&delar=legs');
  expect(screen.queryByText(/Saknas:/)).toBeNull();
  expect(await getDb().sessions.count()).toBe(0);
});
it('redirects rehab to home without focus controls', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'rehab',
    rehabFocus: 'knee-physio',
    equipment: ['bodyweight', 'chair', 'support'],
    experience: 'new',
  });
  render(<App />);
  await screen.findByRole('link', { name: 'Visa nästa pass' });
  expect(
    screen.queryByRole('heading', { name: 'Vad tränar du idag?' }),
  ).toBeNull();
  expect(screen.queryByRole('link', { name: 'Byt' })).toBeNull();
});
