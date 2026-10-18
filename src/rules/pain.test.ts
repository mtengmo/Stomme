import { describe, expect, it } from 'vitest';
import type { Session } from '../domain/types';
import {
  assessReading,
  assessSession,
  dayAfterReference,
  isValidScore,
  type PainReading,
  shouldPromptDayAfter,
} from './pain';

const none = { sharp: false, swelling: false, locking: false };
const rd = (
  score: number,
  timing: PainReading['timing'] = 'before',
  redFlags = none,
  extra: Partial<PainReading> = {},
): PainReading => ({ score, timing, redFlags, ...extra });

describe('assessReading', () => {
  it.each([0, 1, 2, 3])('score %i is ok', (n) => {
    expect(assessReading(rd(n))).toEqual({ status: 'ok', reasons: [] });
  });
  it.each([4, 10])('score %i warns', (n) => {
    expect(assessReading(rd(n))).toEqual({
      status: 'warn',
      reasons: ['above_threshold'],
    });
  });
  it.each(['sharp', 'swelling', 'locking'] as const)(
    'red flag %s alone at score 0 stops',
    (flag) => {
      expect(assessReading(rd(0, 'before', { ...none, [flag]: true }))).toEqual(
        { status: 'stop', reasons: ['red_flag'] },
      );
    },
  );
  it('5 + swelling stops with both reasons', () => {
    expect(assessReading(rd(5, 'after', { ...none, swelling: true }))).toEqual({
      status: 'stop',
      reasons: ['red_flag', 'above_threshold'],
    });
  });
  it('dayAfter 3 vs after 2 warns as worse', () => {
    expect(assessReading(rd(3, 'dayAfter'), rd(2, 'after'))).toEqual({
      status: 'warn',
      reasons: ['worse_than_previous_day'],
    });
  });
  it('2 vs 2 and 1 vs 2 are ok', () => {
    expect(assessReading(rd(2, 'dayAfter'), rd(2, 'after')).status).toBe('ok');
    expect(assessReading(rd(1, 'dayAfter'), rd(2, 'after')).status).toBe('ok');
  });
  it('dayAfter 2 with no after and before 1 warns', () => {
    const ref = dayAfterReference([rd(1, 'before')]);
    expect(assessReading(rd(2, 'dayAfter'), ref).reasons).toEqual([
      'worse_than_previous_day',
    ]);
  });
  it('no reference means threshold only', () => {
    expect(assessReading(rd(3, 'dayAfter'), undefined).status).toBe('ok');
  });
  it('dayAfter 5 vs after 2 gives both reasons', () => {
    expect(assessReading(rd(5, 'dayAfter'), rd(2, 'after'))).toEqual({
      status: 'warn',
      reasons: ['above_threshold', 'worse_than_previous_day'],
    });
  });
  it('is pure', () => {
    const r = rd(5);
    const ref = rd(1, 'after');
    const copy = structuredClone([r, ref]);
    assessReading(r, ref);
    expect([r, ref]).toEqual(copy);
  });
});

describe('assessSession', () => {
  it('empty is ok', () => {
    expect(assessSession([])).toEqual({ status: 'ok', reasons: [] });
  });
  it('worst wins: stop > warn > ok', () => {
    expect(assessSession([rd(1), rd(2, 'after')]).status).toBe('ok');
    expect(assessSession([rd(1), rd(5, 'after'), rd(1)]).status).toBe('warn');
    const stop = rd(0, 'after', { ...none, sharp: true });
    expect(assessSession([rd(5), stop, rd(1)])).toEqual({
      status: 'stop',
      reasons: ['above_threshold', 'red_flag'],
    });
  });
});

describe('dayAfterReference', () => {
  it('prefers after over before', () => {
    const after = rd(2, 'after');
    expect(dayAfterReference([rd(1, 'before'), after])).toBe(after);
  });
  it('falls back to before, and undefined when neither', () => {
    const before = rd(1, 'before');
    expect(dayAfterReference([before, rd(4, 'dayAfter')])).toBe(before);
    expect(dayAfterReference([])).toBeUndefined();
  });
  it('takes the latest when repeated', () => {
    const a = rd(1, 'after', none, { createdAt: '2026-10-17T10:00:00Z' });
    const b = rd(3, 'after', none, { createdAt: '2026-10-17T11:00:00Z' });
    expect(dayAfterReference([b, a])).toBe(b);
    expect(dayAfterReference([a, b])).toBe(b);
  });
  it('treats a missing createdAt as oldest, ties go to the later entry', () => {
    const dated = rd(1, 'after', none, { createdAt: '2026-10-17T10:00:00Z' });
    const bare = rd(3, 'after');
    expect(dayAfterReference([bare, dated])).toBe(dated);
    expect(dayAfterReference([dated, bare])).toBe(dated);
    expect(dayAfterReference([bare, rd(4, 'after')])?.score).toBe(4);
  });
});

describe('isValidScore', () => {
  it.each([-1, 11, 2.5, Number.NaN])('%s is invalid', (n) => {
    expect(isValidScore(n)).toBe(false);
  });
  it.each([0, 5, 10])('%s is valid', (n) => {
    expect(isValidScore(n)).toBe(true);
  });
});

describe('shouldPromptDayAfter', () => {
  const session = (over: Partial<Session> = {}): Session => ({
    id: 's1',
    templateId: 'A',
    date: '2026-10-17',
    startedAt: '2026-10-17T10:00:00+02:00',
    finishedAt: '2026-10-17T10:40:00+02:00',
    status: 'completed',
    programWeek: 2,
    plan: [],
    feedback: {},
    ...over,
  });
  const s = session();

  it('completed yesterday without dayAfter prompts', () => {
    expect(shouldPromptDayAfter(s, [], '2026-10-18')).toBe(true);
  });
  it('same day does not', () => {
    expect(shouldPromptDayAfter(s, [], '2026-10-17')).toBe(false);
  });
  it('already logged does not (other sessions logs do not count)', () => {
    const own = rd(1, 'dayAfter', none, { sessionId: 's1' });
    const other = rd(1, 'dayAfter', none, { sessionId: 'zzz' });
    const anon = rd(1, 'dayAfter');
    expect(shouldPromptDayAfter(s, [own], '2026-10-18')).toBe(false);
    expect(shouldPromptDayAfter(s, [anon], '2026-10-18')).toBe(false);
    expect(shouldPromptDayAfter(s, [other], '2026-10-18')).toBe(true);
  });
  it('pain_stop yesterday prompts; user abort and in progress do not', () => {
    const stopped = session({ status: 'aborted', abortReason: 'pain_stop' });
    const quit = session({ status: 'aborted', abortReason: 'user' });
    const running = session({ status: 'in_progress' });
    expect(shouldPromptDayAfter(stopped, [], '2026-10-18')).toBe(true);
    expect(shouldPromptDayAfter(quit, [], '2026-10-18')).toBe(false);
    expect(shouldPromptDayAfter(running, [], '2026-10-18')).toBe(false);
  });
  it('1-2 days true, 3+ false', () => {
    expect(shouldPromptDayAfter(s, [], '2026-10-19')).toBe(true);
    expect(shouldPromptDayAfter(s, [], '2026-10-20')).toBe(false);
  });
  it('a newer session started suppresses the prompt', () => {
    const newer = session({
      id: 's2',
      date: '2026-10-18',
      startedAt: '2026-10-18T09:00:00+02:00',
    });
    expect(shouldPromptDayAfter(s, [], '2026-10-19', [s, newer])).toBe(false);
    expect(shouldPromptDayAfter(s, [], '2026-10-19', [s])).toBe(true);
  });
  it('late-night session counts from its start date', () => {
    const late = session({
      startedAt: '2026-10-17T23:50:00+02:00',
      finishedAt: '2026-10-18T00:10:00+02:00',
    });
    expect(shouldPromptDayAfter(late, [], '2026-10-17')).toBe(false);
    expect(shouldPromptDayAfter(late, [], '2026-10-18')).toBe(true);
  });
  it('is DST-safe across 2026-10-25 (Europe/Stockholm, 25 h day)', () => {
    const dst = session({
      date: '2026-10-24',
      startedAt: '2026-10-24T18:00:00+02:00',
    });
    expect(shouldPromptDayAfter(dst, [], '2026-10-25')).toBe(true);
    expect(shouldPromptDayAfter(dst, [], '2026-10-26')).toBe(true);
    expect(shouldPromptDayAfter(dst, [], '2026-10-27')).toBe(false);
    const eve = session({
      date: '2026-10-25',
      startedAt: '2026-10-25T23:30:00+01:00',
    });
    expect(shouldPromptDayAfter(eve, [], '2026-10-26')).toBe(true);
    expect(shouldPromptDayAfter(eve, [], '2026-10-28')).toBe(false);
  });
});
