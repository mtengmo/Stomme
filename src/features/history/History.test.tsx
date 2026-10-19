// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { buildDemoData } from '../../dev/demoData';

beforeEach(async () => {
  window.location.hash = '#/historik';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});

afterEach(() => cleanup());

async function seed() {
  const d = buildDemoData(new Date());
  const db = getDb();
  await db.sessions.bulkAdd(d.sessions);
  await db.setLogs.bulkAdd(d.setLogs);
  await db.painLogs.bulkAdd(d.painLogs);
  return d;
}

describe('history screen', () => {
  it('shows the notebook empty state without data', async () => {
    render(<App />);
    expect(await screen.findByText(/Sidan är blank än/)).toBeTruthy();
    expect(screen.queryByText(/Visa som tabell/)).toBeNull();
  });

  it('shows the three charts with summaries and a table toggle', async () => {
    await seed();
    render(<App />);
    const bars = await screen.findByRole('region', { name: 'Set per vecka' });
    expect(within(bars).getByText(/Senaste 4 veckorna: \d+ set/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Belastning' })).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Smärta i högerknäet' }),
    ).toBeTruthy();

    const toggle = within(bars).getByRole('button', {
      name: 'Visa som tabell',
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(toggle);
    expect(within(bars).getByRole('table')).toBeTruthy();
    expect(
      within(bars)
        .getByRole('button', { name: 'Visa som diagram' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('switches exercise with the chips', async () => {
    await seed();
    render(<App />);
    const region = await screen.findByRole('region', { name: 'Belastning' });
    await userEvent.click(
      within(region).getByRole('button', { name: 'Dead bug' }),
    );
    expect(within(region).getByText(/^Dead bug: senast/)).toBeTruthy();
  });

  it('deletes a session with its logs after confirmation', async () => {
    const d = await seed();
    const target = d.sessions[0];
    if (!target) throw new Error('no demo session');
    window.location.hash = `#/historik/${target.id}`;
    render(<App />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Radera passet' }),
    );
    // Nothing is gone before the confirmation.
    expect(await getDb().sessions.get(target.id)).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ja, radera passet' }),
    );
    await screen.findByRole('heading', { name: 'Historik', level: 1 });
    expect(await getDb().sessions.get(target.id)).toBeUndefined();
    expect(
      await getDb().setLogs.where('sessionId').equals(target.id).count(),
    ).toBe(0);
    expect(
      await getDb().painLogs.where('sessionId').equals(target.id).count(),
    ).toBe(0);
  });
});
