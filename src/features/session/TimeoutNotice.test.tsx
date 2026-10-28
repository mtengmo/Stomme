// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TIMEOUT_NOTICE } from '../../content/copy';
import { getDb } from '../../db/db';
import type { Session } from '../../domain/types';
import { SessionDetail } from '../history/SessionDetail';
import { Summary } from './Summary';
import { TIMEOUT_SEEN_KEY, TimeoutNotice } from './TimeoutNotice';

const session = (id: string, extra: Partial<Session> = {}): Session => ({
  id,
  templateId: 'A',
  date: '2026-10-12',
  startedAt: '2026-10-12T08:00:00.000Z',
  finishedAt: '2026-10-12T08:10:00.000Z',
  status: 'aborted',
  abortReason: 'timeout',
  programWeek: 1,
  plan: [],
  feedback: {},
  ...extra,
});
const wait = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(async () => {
  window.localStorage.removeItem(TIMEOUT_SEEN_KEY);
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
});
afterEach(() => cleanup());

describe('timeout notice', () => {
  it('shows once, remembers the dismissed session id and returns for a newer one', async () => {
    await getDb().sessions.add(session('t1'));
    const user = userEvent.setup();
    const { unmount } = render(<TimeoutNotice />);
    expect(await screen.findByText(TIMEOUT_NOTICE)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Okej' }));
    expect(screen.queryByText(TIMEOUT_NOTICE)).toBeNull();
    expect(window.localStorage.getItem(TIMEOUT_SEEN_KEY)).toBe('t1');
    unmount();
    render(<TimeoutNotice />);
    await wait();
    expect(screen.queryByText(TIMEOUT_NOTICE)).toBeNull();
    await getDb().sessions.add(
      session('t2', { startedAt: '2026-10-13T08:00:00.000Z' }),
    );
    expect(await screen.findByText(TIMEOUT_NOTICE)).toBeTruthy();
  });

  it('is absent for a session ended by the user', async () => {
    await getDb().sessions.add(session('u1', { abortReason: 'user' }));
    render(<TimeoutNotice />);
    await wait();
    expect(screen.queryByText(TIMEOUT_NOTICE)).toBeNull();
  });

  it('is part of the summary of a timed-out session only', () => {
    const { rerender } = render(
      <Summary session={session('s')} logs={[]} seconds={600} />,
    );
    expect(screen.getByText(TIMEOUT_NOTICE)).toBeTruthy();
    rerender(
      <Summary
        session={session('s', { abortReason: 'user' })}
        logs={[]}
        seconds={600}
      />,
    );
    expect(screen.queryByText(TIMEOUT_NOTICE)).toBeNull();
  });

  it('is part of the session detail', async () => {
    await getDb().sessions.add(session('d1'));
    render(<SessionDetail id="d1" />);
    expect(await screen.findByText(TIMEOUT_NOTICE)).toBeTruthy();
  });
});
