import { describe, expect, it } from 'vitest';
import type { Session } from '../domain/types';
import { programProgress } from './programProgress';

const program = { id: 'p1', daysPerWeek: 3 as const };
let n = 0;
const session = (
  status: Session['status'],
  programId: string | undefined = 'p1',
  over: Partial<Session> = {},
): Session => ({
  id: `s${++n}`,
  templateId: 'A',
  date: '2026-11-03',
  startedAt: '2026-11-03T08:00:00.000Z',
  status,
  programWeek: 1,
  ...(programId ? { programPass: { programId, pass: 1, week: 1 } } : {}),
  plan: [],
  feedback: {},
  ...over,
});
const done = (count: number) =>
  Array.from({ length: count }, () => session('completed'));

describe('programProgress', () => {
  it('starts at pass 1 of week 1', () => {
    expect(programProgress(program, [])).toEqual({
      done: 0,
      week: 1,
      nextPass: 1,
      blockDone: false,
      weekJustDone: false,
    });
  });

  it('follows the sequence: next pass is done modulo days', () => {
    expect(programProgress(program, done(1))).toMatchObject({
      done: 1,
      week: 1,
      nextPass: 2,
      weekJustDone: false,
    });
    expect(programProgress(program, done(4))).toMatchObject({
      week: 2,
      nextPass: 2,
    });
  });

  it('counts short passes but not aborted or other programmes', () => {
    const sessions = [
      session('completed', 'p1', { workoutMode: 'short' }),
      session('aborted'),
      session('completed', 'other'),
      session('completed', ''),
    ];
    expect(programProgress(program, sessions)).toMatchObject({
      done: 1,
      nextPass: 2,
    });
  });

  it('flags a just-finished week until the next pass is started', () => {
    expect(programProgress(program, done(3))).toMatchObject({
      week: 2,
      nextPass: 1,
      weekJustDone: true,
    });
    expect(
      programProgress(program, [...done(3), session('in_progress')]),
    ).toMatchObject({ weekJustDone: false });
    // An in-progress pass of another programme does not hide the tick.
    expect(
      programProgress(program, [...done(3), session('in_progress', 'other')]),
    ).toMatchObject({ weekJustDone: true });
  });

  it('is done at 4N and never passes week 4', () => {
    expect(programProgress(program, done(11))).toMatchObject({
      week: 4,
      nextPass: 3,
      blockDone: false,
    });
    expect(programProgress(program, done(12))).toMatchObject({
      week: 4,
      nextPass: 1,
      blockDone: true,
      weekJustDone: true,
    });
    expect(
      programProgress({ id: 'p1', daysPerWeek: 1 }, done(4)),
    ).toMatchObject({ blockDone: true });
  });
});
