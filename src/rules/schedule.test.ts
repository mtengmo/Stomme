import { describe, expect, it } from 'vitest';
import type { Session, SessionStatus, TemplateId } from '../domain/types';
import {
  earliestNext,
  nextTemplate,
  nextTemplateId,
  programWeek,
  restStatus,
  weekDays,
  weekSummary,
} from './schedule';

let n = 0;
function session(
  templateId: TemplateId,
  status: SessionStatus,
  startedAt: string,
  finishedAt?: string,
  date = startedAt.slice(0, 10),
): Session {
  n += 1;
  return {
    id: `s${n}`,
    templateId,
    date,
    startedAt,
    finishedAt,
    status,
    programWeek: 1,
    plan: [],
    feedback: {},
  };
}

describe('nextTemplate', () => {
  it('starts with A', () => {
    expect(nextTemplate([])).toBe('A');
  });
  it('alternates over completed sessions', () => {
    const a = session(
      'A',
      'completed',
      '2026-10-12T10:00:00Z',
      '2026-10-12T10:30:00Z',
    );
    expect(nextTemplate([a])).toBe('B');
    const b = session(
      'B',
      'completed',
      '2026-10-15T10:00:00Z',
      '2026-10-15T10:30:00Z',
    );
    expect(nextTemplate([b, a])).toBe('A');
  });
  it('repeats the same template after an aborted session', () => {
    const aborted = session(
      'A',
      'aborted',
      '2026-10-12T10:00:00Z',
      '2026-10-12T10:05:00Z',
    );
    expect(nextTemplate([aborted])).toBe('A');
    const a = session(
      'A',
      'completed',
      '2026-10-13T10:00:00Z',
      '2026-10-13T10:30:00Z',
    );
    const abortedB = session(
      'B',
      'aborted',
      '2026-10-16T10:00:00Z',
      '2026-10-16T10:05:00Z',
    );
    expect(nextTemplate([a, abortedB])).toBe('B');
  });
  it('ignores in-progress sessions', () => {
    const open = session('A', 'in_progress', '2026-10-12T10:00:00Z');
    expect(nextTemplate([open])).toBe('A');
  });
});

describe('rest status', () => {
  const done = session(
    'A',
    'completed',
    '2026-10-12T10:00:00Z',
    '2026-10-12T10:30:00Z',
  );

  it('has no earliest time without completed sessions', () => {
    expect(earliestNext([])).toBeNull();
    expect(restStatus([], new Date('2026-10-12T11:00:00Z')).ok).toBe(true);
  });
  it('is not ok at 47h59m and ok at 48h', () => {
    expect(earliestNext([done])?.toISOString()).toBe(
      '2026-10-14T10:30:00.000Z',
    );
    expect(restStatus([done], new Date('2026-10-14T10:29:00Z')).ok).toBe(false);
    expect(restStatus([done], new Date('2026-10-14T10:30:00Z')).ok).toBe(true);
  });
  it('ignores aborted sessions', () => {
    const aborted = session(
      'B',
      'aborted',
      '2026-10-13T10:00:00Z',
      '2026-10-13T10:05:00Z',
    );
    expect(earliestNext([done, aborted])?.toISOString()).toBe(
      '2026-10-14T10:30:00.000Z',
    );
  });
});

describe('programWeek', () => {
  it('floor(days/7)+1', () => {
    expect(programWeek('2026-10-19', '2026-10-19')).toBe(1);
    expect(programWeek('2026-10-19', '2026-10-25')).toBe(1);
    expect(programWeek('2026-10-19', '2026-10-26')).toBe(2);
    expect(programWeek('2026-10-19', '2026-11-02')).toBe(3);
  });
  it('is stable across the 2026-10-25 DST change', () => {
    expect(programWeek('2026-10-24', '2026-10-30')).toBe(1);
    expect(programWeek('2026-10-24', '2026-10-31')).toBe(2);
    expect(programWeek('2026-10-18', '2026-11-01')).toBe(3);
  });
  it('crosses the year boundary', () => {
    expect(programWeek('2026-12-28', '2027-01-03')).toBe(1);
    expect(programWeek('2026-12-28', '2027-01-04')).toBe(2);
  });
  it('never goes below 1', () => {
    expect(programWeek('2026-10-19', '2026-10-10')).toBe(1);
  });
});

describe('weekDays / weekSummary', () => {
  it('Sunday starts six days earlier', () => {
    const days = weekDays('2026-10-18');
    expect(days[0]).toBe('2026-10-12');
    expect(days[6]).toBe('2026-10-18');
  });
  it('year boundary', () => {
    expect(weekDays('2027-01-01')[0]).toBe('2026-12-28');
  });
  it('summarises completed sessions of the current week only', () => {
    const inWeek = session(
      'A',
      'completed',
      '2026-10-13T10:00:00Z',
      '2026-10-13T10:30:00Z',
    );
    const prev = session(
      'B',
      'completed',
      '2026-10-08T10:00:00Z',
      '2026-10-08T10:30:00Z',
    );
    const aborted = session(
      'B',
      'aborted',
      '2026-10-15T10:00:00Z',
      '2026-10-15T10:05:00Z',
    );
    const s = weekSummary([prev, inWeek, aborted], '2026-10-18');
    expect(s.count).toBe(1);
    expect(s.completedTemplates).toEqual(['A']);
    expect(s.days).toHaveLength(7);
  });
});

describe('nextTemplateId', () => {
  it('ignores completed custom and short workouts', () => {
    const standard = session('A', 'completed', '2026-10-20T08:00:00Z');
    const custom = {
      ...session('A', 'completed', '2026-10-27T08:00:00Z'),
      customWorkoutId: 'c1',
    };
    const short = {
      ...session('B', 'completed', '2026-10-28T08:00:00Z'),
      workoutMode: 'short' as const,
    };
    // Newest first, as the home page passes them.
    expect(nextTemplateId([short, custom, standard], 'general')).toBe('B');
    expect(nextTemplateId([custom], 'general')).toBe('A');
    expect(nextTemplateId([standard], 'rehab')).toBe('A');
  });
});
