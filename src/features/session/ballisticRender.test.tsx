// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

beforeEach(async () => {
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

describe('ballistic exercises render without crashing', () => {
  it.each(['squat-jump', 'burpee', 'jumping-lunge', 'kettlebell-swing'])(
    'guide page for %s',
    async (id) => {
      window.location.hash = `#/ovning/${id}`;
      render(<App />);
      expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
      expect(screen.queryByText('Något gick fel')).toBeNull();
    },
  );

  it('library lists them', async () => {
    window.location.hash = '#/ovningar';
    render(<App />);
    expect(
      (await screen.findAllByText(/Knäböj med hopp/)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Något gick fel')).toBeNull();
  });
});
