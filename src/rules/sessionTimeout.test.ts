import { describe, expect, it } from 'vitest';
import type { Session } from '../domain/types';
import { IDLE_LIMIT_MIN, isSessionStale, lastActivity } from './sessionTimeout';

const T0 = Date.UTC(2026, 9, 12, 8, 0, 0);
const iso = (min: number) => new Date(T0 + min * 60_000).toISOString();
const session = (extra: Partial<Session> = {}): Session => ({
  id: 's',
  templateId: 'A',
  date: '2026-10-12',
  startedAt: iso(0),
  status: 'in_progress',
  programWeek: 1,
  plan: [],
  feedback: {},
  ...extra,
});

describe('lastActivity', () => {
  it('is the start when nothing else was recorded', () => {
    expect(lastActivity(session(), [], [])).toBe(iso(0));
  });
  it('ignores missing optional check-ins in older records', () => {
    expect(
      lastActivity(session({ checkins: { after: undefined } }), [], []),
    ).toBe(iso(0));
  });

  it('takes the latest of sets, pain readings and check-ins', () => {
    const s = session({
      checkins: {
        before: { recordedAt: iso(5), feeling: 'ready', symptoms: null },
      },
    });
    expect(
      lastActivity(s, [{ loggedAt: iso(20) }], [{ createdAt: iso(30) }]),
    ).toBe(iso(30));
    expect(lastActivity(s, [{ loggedAt: iso(40) }], [])).toBe(iso(40));
    expect(lastActivity(s, [], [])).toBe(iso(5));
  });
});

describe('isSessionStale', () => {
  it('uses a 90 minute limit', () => {
    expect(IDLE_LIMIT_MIN).toBe(90);
  });

  it('is stale at exactly 90 minutes but not one second before', () => {
    expect(isSessionStale(iso(0), new Date(T0 + 90 * 60_000))).toBe(true);
    expect(isSessionStale(iso(0), new Date(T0 + 90 * 60_000 - 1000))).toBe(
      false,
    );
  });

  it('never expires when the clock went backwards', () => {
    expect(isSessionStale(iso(0), new Date(T0 - 5 * 3600_000))).toBe(false);
  });

  it('a 600 s rest or hold never reaches the limit', () => {
    expect(isSessionStale(iso(0), new Date(T0 + 600_000))).toBe(false);
  });
});

describe('invalid timestamps', () => {
  it('falls back to the start and treats an invalid start as not stale', () => {
    expect(lastActivity(session({ startedAt: 'nonsense' }), [], [])).toBe(
      'nonsense',
    );
    expect(isSessionStale('nonsense', new Date(T0 + 99 * 3600_000))).toBe(
      false,
    );
  });
});
