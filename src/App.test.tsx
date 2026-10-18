// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { getDb } from './db/db';
import { createSession, getMeta, setMeta } from './db/repo';
import { isoWeekNumber } from './features/week/passState';
import { WeekView } from './features/week/WeekView';

const NOW = new Date(2026, 9, 14, 12, 0); // Wednesday 14 Oct 2026

beforeEach(async () => {
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
});

afterEach(() => cleanup());

async function accept() {
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
}

describe('onboarding gating', () => {
  it('shows the disclaimer first and stores acceptance', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /Välkommen till Stomme/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Jag förstår/ }));
    expect(await screen.findByRole('navigation')).toBeTruthy();
    const stored = await getMeta<{ acceptedAt: string }>(getDb(), 'onboarding');
    expect(stored?.acceptedAt).toBeTruthy();
  });

  it('skips onboarding once accepted', async () => {
    await accept();
    render(<App />);
    expect(await screen.findByRole('navigation')).toBeTruthy();
    expect(screen.queryByText(/Välkommen till Stomme/)).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Vecka' }).getAttribute('aria-current'),
    ).toBe('page');
  });
});

describe('week view', () => {
  it('works with an empty database', async () => {
    render(<WeekView now={NOW} />);
    expect(await screen.findByText('Starta pass')).toBeTruthy();
    expect(screen.getByText('Idag')).toBeTruthy(); // Pass A is next
    expect(screen.getByText('Kommande')).toBeTruthy();
    expect(screen.queryByText('Klar')).toBeNull();
    expect(screen.queryByText(/Vila –/)).toBeNull();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(7);
  });

  it('marks a completed pass Klar and moves "next" to the other pass', async () => {
    await createSession(getDb(), {
      templateId: 'A',
      date: '2026-10-13',
      startedAt: '2026-10-13T08:00:00Z',
      finishedAt: '2026-10-13T08:30:00Z',
      status: 'completed',
      programWeek: 1,
      plan: [],
      feedback: {},
    });
    render(<WeekView now={NOW} />);
    expect(await screen.findByText('Klar')).toBeTruthy();
    expect(screen.getByText('Idag')).toBeTruthy();
    expect(screen.getByText('Nästa pass')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText(/Vila – tidigast/)).toBeTruthy(),
    );
    expect(
      screen.getByRole('link', { name: 'Starta pass' }).getAttribute('href'),
    ).toBe('/pass/B');
  });
});

describe('isoWeekNumber', () => {
  it('matches ISO weeks', () => {
    expect(isoWeekNumber('2026-10-14')).toBe(42);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
  });
});
