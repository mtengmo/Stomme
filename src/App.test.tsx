// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { getDb } from './db/db';
import { getMeta, setMeta } from './db/repo';
import { isoWeekNumber } from './features/week/passState';

const _NOW = new Date(2026, 9, 14, 12, 0); // Wednesday 14 Oct 2026

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
    expect(
      screen.getByText(
        'Korta styrkepass hemma, anpassade efter din utrustning.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Avbryt vid skarp smärta, svullnad eller om en led låser sig.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Så läser du antal')).toBeNull();
    const about = screen
      .getByText('Om Stomme och säkerhet')
      .closest('details') as HTMLDetailsElement;
    expect(about.open).toBe(false);
    expect(about.textContent).toMatch(/träningsstöd, inte sjukvård/);
    await userEvent.click(screen.getByRole('button', { name: /Jag förstår/ }));
    expect(
      await screen.findByRole('heading', { name: 'Vad vill du träna?' }),
    ).toBeTruthy();
    // The first-use setup hides the nav; the importing link replaces it.
    expect(screen.queryByRole('navigation', { name: 'Huvudmeny' })).toBeNull();
    expect(window.location.hash).toBe('#/kom-igang');
    const stored = await getMeta<{ acceptedAt: string }>(getDb(), 'onboarding');
    expect(stored?.acceptedAt).toBeTruthy();
  });

  it('skips onboarding once accepted', async () => {
    await accept();
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Vad vill du träna?' }),
    ).toBeTruthy();
    // The first-use setup hides the nav; the importing link replaces it.
    expect(screen.queryByRole('navigation', { name: 'Huvudmeny' })).toBeNull();
    expect(window.location.hash).toBe('#/kom-igang');
    expect(screen.queryByText(/Välkommen till Stomme/)).toBeNull();
    expect(screen.queryByRole('heading', { name: /Vecka/ })).toBeNull();
  });
});

describe('isoWeekNumber', () => {
  it('matches ISO weeks', () => {
    expect(isoWeekNumber('2026-10-14')).toBe(42);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
  });
});
