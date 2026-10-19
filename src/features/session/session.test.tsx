// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { getActiveSession, setMeta } from '../../db/repo';
import { answerPain } from '../pain/testHelpers';

beforeEach(async () => {
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});

afterEach(() => cleanup());

describe('session flow', () => {
  it('previews the pass, starts it, logs a set, undoes it and rests', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Pass A' })).toBeTruthy();
    expect(
      screen.getAllByText('Första veckan: kroppsvikt.').length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Starta pass' }));
    await answerPain(user, 0);

    // session mode: no bottom navigation, set screen with one primary action
    expect(await screen.findByText('Set 1 av 2')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(await getActiveSession(getDb())).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Klar set' }));
    expect(await screen.findByText('Set 1 loggat')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Vila' })).toBeTruthy();
    expect(await getDb().setLogs.count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Ångra' }));
    await waitFor(async () => expect(await getDb().setLogs.count()).toBe(0));
    expect(
      await screen.findByRole('button', { name: 'Klar set' }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Klar set' }));
    await user.click(
      await screen.findByRole('button', { name: 'Hoppa över vila' }),
    );
    expect(await screen.findByText('Set 2 av 2')).toBeTruthy();
  });

  it('resumes where the logs left off and shows "Fortsätt passet"', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    const { unmount } = render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 0);
    await user.click(await screen.findByRole('button', { name: 'Klar set' }));
    unmount();

    window.location.hash = '#/';
    render(<App />);
    const link = await screen.findByRole('link', { name: 'Fortsätt passet' });
    await user.click(link);
    // the rest is not persisted: resume lands on set 2
    expect(await screen.findByText('Set 2 av 2')).toBeTruthy();
  });

  it('aborts after a confirmation and keeps the sets', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 0);
    await user.click(await screen.findByRole('button', { name: 'Klar set' }));
    await screen.findByText('Set 1 loggat');
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    await user.click(
      await screen.findByRole('button', { name: 'Avbryt passet' }),
    );
    await waitFor(async () =>
      expect(await getActiveSession(getDb())).toBeUndefined(),
    );
    expect(await getDb().setLogs.count()).toBe(1);
  });
});
