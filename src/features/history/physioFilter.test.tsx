// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import type { Session } from '../../domain/types';

beforeEach(async () => {
  window.location.hash = '#/historik';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});
afterEach(cleanup);

const rehab = (id: string, rehabFocus?: Session['rehabFocus']): Session => ({
  id,
  templateId: 'A',
  programId: 'rehab',
  ...(rehabFocus ? { rehabFocus } : {}),
  date: '2026-09-14',
  startedAt: '2026-09-14T08:00:00.000Z',
  finishedAt: '2026-09-14T08:30:00.000Z',
  status: 'completed',
  programWeek: 1,
  plan: [],
  feedback: {},
});

it('keeps knee-physio sessions out of the custom rehab filter', async () => {
  await getDb().sessions.bulkAdd([
    rehab('custom-1', 'custom'),
    rehab('aaos-1', 'knee'),
    rehab('physio-1', 'knee-physio'),
  ]);
  const user = userEvent.setup();
  render(<App />);
  const list = await screen.findByRole('region', { name: 'Alla pass' });
  const names = () =>
    within(list)
      .getAllByRole('link')
      .map((l) => l.textContent ?? '');
  const filter = screen.getByRole('combobox', { name: 'Träningsinriktning' });
  expect(names()).toHaveLength(3);

  await user.selectOptions(filter, 'knee-physio');
  expect(names()).toHaveLength(1);
  expect(names()[0]).toContain('Knärehab · Fysioterapeutens program');

  await user.selectOptions(filter, 'rehab');
  expect(names()).toHaveLength(1);
  expect(names()[0]).toContain('Mitt rehabprogram');
  expect(names()[0]).not.toContain('Fysioterapeutens');

  await user.selectOptions(filter, 'knee');
  expect(names()).toHaveLength(1);
  expect(names()[0]).toContain('AAOS');
});
