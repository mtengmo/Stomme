// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';
import type { ExerciseId } from '../../domain/types';

vi.mock('../../lib/beep', () => ({
  cue: {
    start: vi.fn(),
    go: vi.fn(),
    pause: vi.fn(),
    rep: vi.fn(),
    done: vi.fn(),
  },
}));

// Dexie and fake-indexeddb need real setTimeout; only the clocks are faked.
const FAKE = [
  'Date',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setInterval',
  'clearInterval',
] as const;

beforeEach(async () => {
  window.localStorage.removeItem('stomme.repCount.manual');
  window.localStorage.setItem('stomme.repCount.seen', '1');
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
  vi.useFakeTimers({ toFake: [...FAKE] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const plan = (id: ExerciseId, sets: number, target: number) => ({
  exerciseId: id,
  sets,
  target,
  loadIndex: 0,
  weightKg: 0,
  restSec: 3,
  reason: 'first_time' as const,
});

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
/** Moves the fake clock in small steps so frames, timers and IndexedDB all run. */
async function run(ms: number) {
  for (let spent = 0; spent < ms; spent += 100) {
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await settle();
  }
}
async function until(check: () => boolean, maxMs = 60_000) {
  for (let spent = 0; spent <= maxMs && !check(); spent += 100) await run(100);
  expect(check()).toBe(true);
}
const user = () => userEvent.setup({ delay: null });
const has = (text: string | RegExp) => screen.queryByText(text) !== null;
const button = (name: string | RegExp) =>
  screen.queryByRole('button', { name });
const press = async (name: string | RegExp) => {
  await user().click(screen.getByRole('button', { name }));
  await settle();
};

async function open(...items: ReturnType<typeof plan>[]) {
  const session = await createSession(getDb(), {
    templateId: 'A',
    date: '2026-10-20',
    startedAt: '2026-10-20T08:00:00Z',
    status: 'in_progress',
    programWeek: 1,
    plan: items,
    feedback: {},
  });
  // A stored before reading keeps the runner from replanning the session.
  await getDb().painLogs.add({
    id: 'p-before',
    sessionId: session.id,
    date: '2026-10-20',
    timing: 'before',
    score: 0,
    location: 'right_knee',
    redFlags: { sharp: false, swelling: false, locking: false },
    createdAt: '2026-10-20T08:00:00Z',
  });
  window.location.hash = `#/session/${session.id}`;
  render(<App />);
  return session;
}

describe('hands-free reps through the session runner', () => {
  it('walks right, left, rest and stops at the effort question', async () => {
    await open(plan('step-up', 2, 2));
    await until(() => has(/^Set 1 av 2/));
    await press('Starta – 5 s förberedelse');
    expect(has(/^Gör dig redo/)).toBe(true);
    await until(() => has('Set 1 loggat'));
    let logs = await getDb().setLogs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      side: 'right',
      amount: 2,
      counting: 'auto',
    });
    // The left side gets its own five seconds of preparation.
    await until(() => has(/^Gör dig redo · .*vänster/i));
    await until(() => has(/^Pågår · .*vänster/i));
    await until(() => screen.queryByRole('heading', { name: 'Vila' }) !== null);
    logs = await getDb().setLogs.toArray();
    expect(logs.map((l) => l.side).sort()).toEqual(['left', 'right']);
    // Rest runs by itself and the next set starts after preparation.
    await until(() => has(/^Gör dig redo · .*höger/i));
  });

  it('stops at the effort question with nothing armed after the last set', async () => {
    await open(plan('goblet-chair-squat', 1, 2));
    await until(() => button('Starta – 5 s förberedelse') !== null);
    await press('Starta – 5 s förberedelse');
    await until(() => has(/Hur ansträngande/));
    expect(has(/^Gör dig redo/)).toBe(false);
    await run(10_000);
    expect(has(/Hur ansträngande/)).toBe(true);
    expect(await getDb().setLogs.count()).toBe(1);
  });

  it('undo clears the arming so the set waits for a new Start', async () => {
    await open(plan('goblet-chair-squat', 2, 2));
    await until(() => button('Starta – 5 s förberedelse') !== null);
    await press('Starta – 5 s förberedelse');
    await until(() => has('Set 1 loggat'));
    await press('Ångra');
    await until(() => button('Starta – 5 s förberedelse') !== null);
    await run(8_000);
    expect(has(/^Gör dig redo/)).toBe(false);
    expect(await getDb().setLogs.count()).toBe(0);
  });

  it('skipping clears the arming for the next exercise', async () => {
    await open(plan('goblet-chair-squat', 1, 4), plan('bird-dog', 1, 2));
    await until(() => button('Starta – 5 s förberedelse') !== null);
    await press('Starta – 5 s förberedelse');
    await run(6_000);
    await press('Hoppa över övningen');
    await until(() => has(/Bird dog|Fågelhund/i) || has('Set 1 av 1'));
    await run(8_000);
    expect(has(/^Gör dig redo/)).toBe(false);
    expect(button('Starta – 5 s förberedelse')).not.toBeNull();
  });

  it('Avsluta setet saves the finished reps, stops the automation and prefills the plan target', async () => {
    await open(plan('goblet-chair-squat', 2, 4));
    await until(() => button('Starta – 5 s förberedelse') !== null);
    await press('Starta – 5 s förberedelse');
    await until(() => has(/^Pågår/));
    await run(9_000);
    await press('Avsluta setet');
    await until(() => has('Set 1 loggat'));
    const [log] = await getDb().setLogs.toArray();
    expect(log).toMatchObject({
      amount: 2,
      counting: 'auto',
      endedEarly: true,
    });
    // Rest ends without starting the next set by itself.
    await until(() => button('Nästa set') !== null);
    await run(8_000);
    expect(has(/^Gör dig redo/)).toBe(false);
    await press('Nästa set');
    await until(() => button('Starta – 5 s förberedelse') !== null);
    expect(has(/^4 repetitioner/)).toBe(true);
  });
});
