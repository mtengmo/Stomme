// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { startTrainingSession } from '../../db/training';
import type { TrainingPreferences } from '../../domain/types';

const general: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight'],
  weights: [],
};

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
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

describe('write failures', () => {
  it('a failing set write shows an alert and the screen stays usable', async () => {
    const s = await startTrainingSession(
      getDb(),
      general,
      'A',
      [
        {
          exerciseId: 'push-up',
          sets: 2,
          target: 8,
          loadIndex: 0,
          weightKg: 0,
          restSec: 30,
          reason: 'first_time',
          variantId: 'bodyweight',
          sides: ['both'],
        },
      ],
      new Date(),
    );
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

  it('bad backup meta does not break settings', async () => {
    await getDb().meta.put({
      key: 'backup',
      value: { lastExportAt: 'garbage' },
    });
    window.location.hash = '#/installningar/sakerhetskopia';
    render(<App />);
    expect(await screen.findByText(/Senast sparad: aldrig/)).toBeTruthy();
  });
});
