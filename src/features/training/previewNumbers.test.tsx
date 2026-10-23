// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { exerciseReferences } from '../../content/exerciseReferences';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

beforeEach(async () => {
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

it('shows the permanent E-number from the references, not the list position', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'rehab',
    rehabFocus: 'custom',
    experience: 'some',
    equipment: ['bodyweight'],
  });
  await setMeta(getDb(), 'rehabPlans', {
    custom: [
      {
        exerciseId: 'glute-bridge',
        sets: 2,
        target: 10,
        loadIndex: 0,
        weightKg: 0,
        restSec: 60,
        reason: 'first_time',
        variantId: 'bodyweight',
        sides: ['both'],
      },
    ],
  });
  window.location.hash = '#/traning/A';
  render(<App />);
  expect(exerciseReferences['glute-bridge']).toBe('E23');
  expect(await screen.findByText(/^1\. E23 · /)).toBeTruthy();
});
