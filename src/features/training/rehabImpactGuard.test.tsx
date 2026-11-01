// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

const equipment = ['bodyweight', 'chair', 'support', 'step'];
const rehab = (rehabFocus: string) => ({
  programId: 'rehab',
  equipment,
  experience: 'some',
  rehabFocus,
  rehabSide: 'both',
});
const general = { programId: 'general', equipment, experience: 'regular' };

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

const name = exercises['box-jump'].name;

describe('impact exercises in rehab', () => {
  it('are hidden by the custom-workout picker in rehab custom', async () => {
    await setMeta(getDb(), 'training', rehab('custom'));
    window.location.hash = '#/nytt-pass';
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Skapa eget pass' });
    await user.type(await screen.findByLabelText('Sök övning'), 'hopp');
    expect(screen.queryByText(new RegExp(name))).toBeNull();
    expect(screen.queryByText(/Sidohopp på ett ben/)).toBeNull();
  });

  it('are offered in the same picker outside rehab', async () => {
    await setMeta(getDb(), 'training', general);
    window.location.hash = '#/nytt-pass';
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Skapa eget pass' });
    await user.type(await screen.findByLabelText('Sök övning'), 'boxhopp');
    expect(await screen.findByText(new RegExp(name))).toBeTruthy();
  });

  it('are blocked in the library with a reason for rehab users', async () => {
    await setMeta(getDb(), 'training', rehab('custom'));
    window.location.hash = '#/ovningar';
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText('Sök övning'), 'boxhopp');
    expect(await screen.findByText('Hopp visas inte i rehab')).toBeTruthy();
  });

  it('are missing from the add-exercise picker of a custom rehab workout, with a short note', async () => {
    await setMeta(getDb(), 'training', rehab('custom'));
    window.location.hash = '#/traning/A';
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Lägg till övning' }),
    );
    expect(
      await screen.findByText('Hopp- och stötövningar visas inte i rehab.'),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'Visar bara övningar som ingår i den tillåtna samlingen.',
      ),
    ).toBeNull();
    await user.type(await screen.findByLabelText('Sök övning'), 'boxhopp');
    expect(screen.queryByText(new RegExp(name))).toBeNull();
  });

  it('are offered in the general add-exercise picker', async () => {
    await setMeta(getDb(), 'training', general);
    await setMeta(getDb(), 'customWorkouts', [
      { id: 'w1', name: 'Mitt pass', exerciseIds: ['push-up'] },
    ]);
    window.location.hash = '#/traning/A?workout=w1';
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Lägg till övning' }),
    );
    await user.type(await screen.findByLabelText('Sök övning'), 'boxhopp');
    expect(await screen.findByText(new RegExp(name))).toBeTruthy();
  });
});
