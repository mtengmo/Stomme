// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';
import { StopScreen } from './StopScreen';

afterEach(() => cleanup());

describe('StopScreen', () => {
  it('sends rehab to the physiotherapist', () => {
    render(<StopScreen physio onHome={() => undefined} />);
    expect(screen.getByText('Fråga fysioterapeuten.')).toBeTruthy();
  });

  it('points regular training to care without naming a physiotherapist', async () => {
    const onHome = vi.fn();
    const { container } = render(<StopScreen physio={false} onHome={onHome} />);
    expect(container.textContent).toMatch(/kontakta vården \(1177\)/);
    expect(container.textContent).not.toMatch(/fysioterapeut/i);
    await userEvent.click(
      screen.getByRole('button', { name: 'Till träningen' }),
    );
    expect(onHome).toHaveBeenCalledOnce();
  });
});

describe('#/stopp/:sessionId', () => {
  beforeEach(async () => {
    await getDb().delete();
    await getDb().open();
    await setMeta(getDb(), 'onboarding', {
      acceptedAt: '2026-10-01T00:00:00Z',
    });
  });

  const stopped = (id: string, programId?: 'general' | 'rehab') =>
    createSession(getDb(), {
      id,
      templateId: 'A',
      ...(programId ? { programId } : {}),
      date: '2026-10-20',
      startedAt: '2026-10-20T08:00:00.000Z',
      finishedAt: '2026-10-20T08:10:00.000Z',
      status: 'aborted',
      abortReason: 'pain_stop',
      programWeek: 1,
      plan: [],
      feedback: {},
    });

  it('shows the physio text for a rehab session', async () => {
    await stopped('r', 'rehab');
    window.location.hash = '#/stopp/r';
    render(<App />);
    expect(await screen.findByText('Fråga fysioterapeuten.')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('shows the plain text for a regular session', async () => {
    await stopped('g', 'general');
    window.location.hash = '#/stopp/g';
    render(<App />);
    expect(await screen.findByText(/kontakta vården \(1177\)/)).toBeTruthy();
    expect(screen.queryByText(/fysioterapeut/i)).toBeNull();
  });
});
