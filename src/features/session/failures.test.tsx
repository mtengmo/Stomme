// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import {
  addPainLog,
  createSession,
  setMeta,
  startSession,
} from '../../db/repo';
import { addDays, toLocalDate } from '../../lib/dates';
import { WeekView } from '../week/WeekView';

const none = { sharp: false, swelling: false, locking: false };

beforeEach(async () => {
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await new Promise((r) => setTimeout(r, 50));
});

async function openSessionWithBefore() {
  const s = await startSession(getDb(), 'A', new Date());
  await addPainLog(
    getDb(),
    { sessionId: s.id, timing: 'before', score: 1, redFlags: none },
    new Date(),
  );
  return s;
}

describe('write failures', () => {
  it('Starta pass shows an error and can be tried again', async () => {
    window.location.hash = '#/pass/A';
    render(<App />);
    const add = vi
      .spyOn(getDb().sessions, 'add')
      .mockRejectedValueOnce(new Error('boom'));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Något gick fel/,
    );
    expect(
      (screen.getByRole('button', { name: 'Starta pass' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    add.mockRestore();
    await userEvent.click(screen.getByRole('button', { name: 'Starta pass' }));
    await waitFor(() => expect(window.location.hash).toMatch(/smarta/));
  });

  it('a failing set write shows an alert and the screen stays usable', async () => {
    const s = await openSessionWithBefore();
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    const add = vi
      .spyOn(getDb().setLogs, 'add')
      .mockRejectedValueOnce(new Error('boom'));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Klar set' }),
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Något gick fel/,
    );
    add.mockRestore();
    await userEvent.click(screen.getByRole('button', { name: 'Klar set' }));
    await waitFor(async () => expect(await getDb().setLogs.count()).toBe(1));
  });

  it('a failing pain-stop abort shows an error with retry, not a blank screen', async () => {
    const s = await startSession(getDb(), 'A', new Date());
    await addPainLog(
      getDb(),
      {
        sessionId: s.id,
        timing: 'before',
        score: 2,
        redFlags: { ...none, locking: true },
      },
      new Date(),
    );
    window.location.hash = `#/session/${s.id}`;
    const upd = vi
      .spyOn(getDb().sessions, 'update')
      .mockRejectedValueOnce(new Error('boom'));
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Något gick fel' }),
    ).toBeTruthy();
    upd.mockRestore();
    await userEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    await waitFor(async () =>
      expect((await getDb().sessions.get(s.id))?.status).toBe('aborted'),
    );
  });
});

describe('stale open session', () => {
  const stale = () => {
    const day = addDays(toLocalDate(new Date()), -3);
    return createSession(getDb(), {
      templateId: 'A',
      date: day,
      startedAt: `${day}T08:00:00.000Z`,
      status: 'in_progress',
      programWeek: 1,
      plan: [],
      feedback: {},
    });
  };

  it('Avsluta passet completes it at its start time', async () => {
    const s = await stale();
    render(<WeekView />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Avsluta passet' }),
    );
    await waitFor(async () => {
      const got = await getDb().sessions.get(s.id);
      expect(got?.status).toBe('completed');
      expect(got?.finishedAt).toBe(s.startedAt);
    });
  });

  it('Släng passet needs a second tap and deletes it', async () => {
    const s = await stale();
    render(<WeekView />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Släng passet' }),
    );
    expect(await getDb().sessions.get(s.id)).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ja, släng passet' }),
    );
    await waitFor(async () =>
      expect(await getDb().sessions.get(s.id)).toBeUndefined(),
    );
  });

  it('is not offered for a session from today', async () => {
    await startSession(getDb(), 'A', new Date());
    render(<WeekView />);
    await screen.findByRole('heading', { name: /Vecka/ });
    expect(screen.queryByRole('button', { name: 'Avsluta passet' })).toBeNull();
  });
});

describe('robustness', () => {
  it.each(['constructor', 'toString', '__proto__'])(
    '#/ovning/%s shows the not-found screen',
    async (id) => {
      window.location.hash = `#/ovning/${id}`;
      render(<App />);
      expect(
        await screen.findByRole('heading', { name: 'Övningen finns inte' }),
      ).toBeTruthy();
    },
  );

  it('bad backup meta does not break the week view or settings', async () => {
    await getDb().meta.put({
      key: 'backup',
      value: { lastExportAt: 'garbage' },
    });
    await getDb().meta.put({ key: 'program', value: { startDate: 5 } });
    window.location.hash = '#/installningar';
    render(<App />);
    expect(await screen.findByText(/Senast sparad: aldrig/)).toBeTruthy();
    window.location.hash = '#/';
    expect(await screen.findByRole('heading', { name: /Vecka/ })).toBeTruthy();
  });
});
