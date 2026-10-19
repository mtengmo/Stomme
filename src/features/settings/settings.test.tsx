// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sw = { need: false };
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.need, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
const shareMock = vi.fn();
vi.mock('../../lib/share', () => ({
  shareOrDownload: (f: File) => shareMock(f),
}));

import { App } from '../../App';
import { exportAll, serializeBackup } from '../../db/backup';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';
import { WeekView } from '../week/WeekView';
import { Settings } from './Settings';

beforeEach(async () => {
  sw.need = false;
  shareMock.mockReset();
  shareMock.mockResolvedValue('downloaded');
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});
afterEach(() => cleanup());

const file = (text: string, name = 'b.json') =>
  new File([text], name, { type: 'application/json' });

async function backupWithOneSession(): Promise<string> {
  await createSession(getDb(), {
    templateId: 'A',
    date: '2026-10-05',
    startedAt: '2026-10-05T08:00:00.000Z',
    finishedAt: '2026-10-05T08:30:00.000Z',
    status: 'completed',
    programWeek: 1,
    plan: [],
    feedback: {},
  });
  return serializeBackup(await exportAll(getDb()));
}

describe('Settings', () => {
  it('shows every section', async () => {
    render(<Settings />);
    for (const name of [
      'Säkerhetskopia',
      'Lagring',
      'Installera',
      'Version',
      'Om och säkerhet',
      'Radera all data',
    ]) {
      expect(await screen.findByRole('heading', { name })).toBeTruthy();
    }
  });

  it('exports and reports the result', async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportera' }));
    expect((await screen.findByRole('status')).textContent).toMatch(
      /laddades ner/,
    );
    expect(shareMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['not json', /kunde inte läsas som en säkerhetskopia/],
    ['{"schemaVersion":99}', /annan version/],
    ['{"schemaVersion":1}', /stämmer inte/],
  ])('rejects %s with a Swedish message', async (text, msg) => {
    render(<Settings />);
    await userEvent.upload(
      screen.getByLabelText('Välj säkerhetskopia att importera'),
      file(text),
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(msg);
  });

  it('rejects an oversized file without reading it', async () => {
    render(<Settings />);
    const big = file('x');
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    const spy = vi.spyOn(big, 'text');
    await userEvent.upload(
      screen.getByLabelText('Välj säkerhetskopia att importera'),
      big,
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(/för stor/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeping data leaves everything untouched', async () => {
    const text = await backupWithOneSession();
    await getDb().sessions.clear();
    render(<Settings />);
    await userEvent.upload(
      screen.getByLabelText('Välj säkerhetskopia att importera'),
      file(text),
    );
    expect(
      await screen.findByRole('heading', { name: 'Ersätta din data?' }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', { name: 'Behåll min data' }),
    );
    expect(await getDb().sessions.count()).toBe(0);
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('confirming saves a safety backup first, then replaces the data', async () => {
    const text = await backupWithOneSession();
    await getDb().sessions.clear();
    render(<Settings />);
    await userEvent.upload(
      screen.getByLabelText('Välj säkerhetskopia att importera'),
      file(text),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ersätt med filens data' }),
    );
    await waitFor(async () => expect(await getDb().sessions.count()).toBe(1));
    expect(shareMock).toHaveBeenCalledTimes(1);
    expect((await screen.findByRole('status')).textContent).toMatch(
      /Importerat: 1 pass/,
    );
  });

  it('aborts the import when the safety backup is cancelled', async () => {
    const text = await backupWithOneSession();
    await getDb().sessions.clear();
    shareMock.mockResolvedValue('cancelled');
    render(<Settings />);
    await userEvent.upload(
      screen.getByLabelText('Välj säkerhetskopia att importera'),
      file(text),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ersätt med filens data' }),
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(/avbröts/);
    expect(await getDb().sessions.count()).toBe(0);
  });

  it('delete needs a second step and then returns to onboarding', async () => {
    await backupWithOneSession();
    render(<App />);
    window.location.hash = '#/installningar';
    await userEvent.click(
      await screen.findByRole('button', { name: 'Radera all data' }),
    );
    // Nothing is deleted before the second step.
    expect(await getDb().sessions.count()).toBe(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Behåll min data' }),
    );
    expect(await getDb().sessions.count()).toBe(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Radera all data' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Radera all data nu' }),
    );
    expect(
      await screen.findByRole('heading', { name: /Välkommen till Stomme/ }),
    ).toBeTruthy();
    expect(await getDb().sessions.count()).toBe(0);
    expect(await getDb().meta.count()).toBe(0);
  });
});

describe('update banner', () => {
  it('shows outside sessions and never in a session', async () => {
    sw.need = true;
    render(<App />);
    expect(await screen.findByText('Ny version finns')).toBeTruthy();
    window.location.hash = '#/session/abc';
    await waitFor(() =>
      expect(screen.queryByText('Ny version finns')).toBeNull(),
    );
    window.location.hash = '#/installningar';
    await waitFor(() =>
      expect(screen.getAllByText(/Ny version finns/).length).toBeGreaterThan(0),
    );
  });
});

describe('backup reminder', () => {
  const NOW = new Date(2026, 9, 14, 12, 0);

  it('appears after 4 completed sessions without an export and links to settings', async () => {
    for (let i = 1; i <= 4; i++) {
      await createSession(getDb(), {
        templateId: 'A',
        date: `2026-10-0${i}`,
        startedAt: `2026-10-0${i}T08:00:00.000Z`,
        finishedAt: `2026-10-0${i}T08:30:00.000Z`,
        status: 'completed',
        programWeek: 1,
        plan: [],
        feedback: {},
      });
    }
    render(<WeekView now={NOW} />);
    expect(
      await screen.findByText('Det var ett tag sedan du säkerhetskopierade'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Öppna inställningar' })
        .getAttribute('href'),
    ).toBe('/installningar');
  });

  it('is absent on a fresh install', async () => {
    render(<WeekView now={NOW} />);
    await screen.findByRole('heading', { name: /Vecka/ });
    expect(screen.queryByText(/säkerhetskopierade/)).toBeNull();
  });
});
