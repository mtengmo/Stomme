import { describe, expect, it } from 'vitest';
import type { PainLog, Session } from '../../domain/types';
import { careState } from './careState';

const none = { sharp: false, swelling: false, locking: false };

function sess(over: Partial<Session> & Pick<Session, 'id' | 'date'>): Session {
  return {
    templateId: 'A',
    startedAt: `${over.date}T08:00:00.000Z`,
    status: 'completed',
    programWeek: 1,
    plan: [],
    feedback: {},
    ...over,
  };
}

function pain(
  sessionId: string,
  timing: PainLog['timing'],
  score: number,
  flags: Partial<PainLog['redFlags']> = {},
  createdAt = '2026-10-12T09:00:00.000Z',
) {
  return {
    sessionId,
    timing,
    score,
    redFlags: { ...none, ...flags },
    createdAt,
  };
}

describe('careState', () => {
  it('prompts for 1-2 days, not 0 or 3', () => {
    const s = [sess({ id: 'a', date: '2026-10-12' })];
    expect(careState(s, [], '2026-10-12').dayAfterDue).toBeUndefined();
    expect(careState(s, [], '2026-10-13').dayAfterDue?.id).toBe('a');
    expect(careState(s, [], '2026-10-14').dayAfterDue?.id).toBe('a');
    expect(careState(s, [], '2026-10-15').dayAfterDue).toBeUndefined();
  });

  it('only the latest session is considered and a newer session clears the prompt', () => {
    const s = [
      sess({ id: 'old', date: '2026-10-10' }),
      sess({ id: 'new', date: '2026-10-12' }),
    ];
    expect(careState(s, [], '2026-10-13').dayAfterDue?.id).toBe('new');
    expect(careState([s[0] as Session], [], '2026-10-11').dayAfterDue?.id).toBe(
      'old',
    );
    // old is superseded by new, so it is never prompted
    expect(careState(s, [], '2026-10-11').dayAfterDue).toBeUndefined();
  });

  it('ordering of the input does not matter', () => {
    const a = sess({ id: 'a', date: '2026-10-10' });
    const b = sess({
      id: 'b',
      date: '2026-10-12',
      status: 'aborted',
      abortReason: 'pain_stop',
    });
    expect(careState([a, b], [], '2026-10-20').stopBanner).toBe(true);
    expect(careState([b, a], [], '2026-10-20').stopBanner).toBe(true);
    const newer = sess({ id: 'c', date: '2026-10-14' });
    expect(careState([b, newer, a], [], '2026-10-20').stopBanner).toBe(false);
  });

  it('a stop banner also follows a day-after red flag', () => {
    const s = [sess({ id: 'a', date: '2026-10-12' })];
    const logs = [pain('a', 'dayAfter', 1, { locking: true })];
    const c = careState(s, logs, '2026-10-13');
    expect(c.stopBanner).toBe(true);
    expect(c.dayAfterWorse?.id).toBe('a');
  });

  it('day-after worse vs only above threshold', () => {
    const s = [sess({ id: 'a', date: '2026-10-12' })];
    const worse = careState(
      s,
      [pain('a', 'after', 2), pain('a', 'dayAfter', 3)],
      '2026-10-13',
    );
    expect(worse.dayAfterWorse?.id).toBe('a');
    expect(worse.dayAfterHigherThanAfter).toBe(true);
    const high = careState(
      s,
      [pain('a', 'after', 5), pain('a', 'dayAfter', 4)],
      '2026-10-13',
    );
    expect(high.dayAfterWorse?.id).toBe('a');
    expect(high.dayAfterHigherThanAfter).toBe(false);
    const fine = careState(
      s,
      [pain('a', 'after', 2), pain('a', 'dayAfter', 2)],
      '2026-10-13',
    );
    expect(fine.dayAfterWorse).toBeUndefined();
  });

  it('the day-after warning expires after two days', () => {
    const s = [sess({ id: 'a', date: '2026-10-12' })];
    const logs = [pain('a', 'after', 2), pain('a', 'dayAfter', 3)];
    expect(careState(s, logs, '2026-10-14').dayAfterWorse?.id).toBe('a');
    expect(careState(s, logs, '2026-10-15').dayAfterWorse).toBeUndefined();
  });

  it('no sessions gives nothing', () => {
    expect(careState([], [], '2026-10-12')).toMatchObject({
      stopBanner: false,
      dayAfterHigherThanAfter: false,
    });
  });
});

describe('careState and a timeout', () => {
  it('shows no stop banner for a session ended by the idle timeout', () => {
    const timeout = [
      sess({
        id: 't',
        date: '2026-10-12',
        status: 'aborted',
        abortReason: 'timeout',
      }),
    ];
    const stopped = [
      sess({
        id: 't',
        date: '2026-10-12',
        status: 'aborted',
        abortReason: 'pain_stop',
      }),
    ];
    expect(careState(stopped, [], '2026-10-12').stopBanner).toBe(true);
    const state = careState(timeout, [], '2026-10-13');
    expect(state.stopBanner).toBe(false);
    expect(state.dayAfterDue).toBeUndefined();
  });
});
