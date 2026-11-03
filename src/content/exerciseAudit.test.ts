import { describe, expect, it } from 'vitest';
import { exerciseFingerprint } from '../figures/auditFingerprint';
import {
  type AuditEntry,
  isStale,
  queue,
  readAuditLog,
  validateEntry,
} from './exerciseAudit';
import { exerciseList } from './exercises';

const log = readAuditLog();

describe('exercise audit log (docs/exercise-audit-log.json)', () => {
  it('has an entry for every catalogue exercise and no unknown ids', () => {
    const catalogue = exerciseList.map((e) => e.id);
    const logged = log.map((e) => e.id);
    expect(catalogue.filter((id) => !logged.includes(id))).toEqual([]);
    expect(logged.filter((id) => !catalogue.includes(id as never))).toEqual([]);
    expect(new Set(logged).size).toBe(logged.length);
  });

  it('has valid statuses, dates, reviewers, scopes and approvals', () => {
    expect(log.flatMap(validateEntry)).toEqual([]);
  });

  it('has no approved exercise whose figure changed since the log (stale)', () => {
    const stale = log
      .filter((e) => e.status === 'approved')
      .filter((e) => isStale(e, exerciseFingerprint(e.id as never)))
      .map((e) => e.id);
    expect(stale).toEqual([]);
  });

  it('records which exercises are fixed or need a fix as non-approved', () => {
    for (const e of log) {
      if (e.fixes.length > 0 && e.reviews.length === 0)
        expect(e.status).not.toBe('approved');
    }
  });
});

describe('audit validation rules', () => {
  const base: AuditEntry = {
    id: 'x',
    name: 'X',
    group: 'strength',
    risk: 'normal',
    status: 'approved',
    reviews: [
      {
        date: '2026-11-03',
        reviewer: 'codex:gpt61sol',
        scope: 'all',
        result: 'ok',
        notes: 'ok',
      },
    ],
    fixes: [{ date: '2026-11-02', fixer: 'claude-sonnet', notes: 'fix' }],
    openIssues: [],
    fingerprint: 'abc',
  };
  it('accepts a sound approved entry', () => {
    expect(validateEntry(base)).toEqual([]);
  });
  it('rejects approval without a review or with a non-ok latest review', () => {
    expect(validateEntry({ ...base, reviews: [] })).not.toEqual([]);
    const r = base.reviews[0] as AuditEntry['reviews'][number];
    expect(
      validateEntry({ ...base, reviews: [{ ...r, result: 'issues' }] }),
    ).not.toEqual([]);
  });
  it('rejects approval by the last fixer', () => {
    const r = base.reviews[0] as AuditEntry['reviews'][number];
    expect(
      validateEntry({
        ...base,
        reviews: [{ ...r, reviewer: 'claude-sonnet' }],
      }),
    ).not.toEqual([]);
  });
  it('rejects approval that lacks all scopes or predates the last fix', () => {
    const r = base.reviews[0] as AuditEntry['reviews'][number];
    expect(
      validateEntry({ ...base, reviews: [{ ...r, scope: 'text' }] }),
    ).not.toEqual([]);
    expect(
      validateEntry({ ...base, reviews: [{ ...r, date: '2026-11-01' }] }),
    ).not.toEqual([]);
  });
  it('accepts three scopes instead of all', () => {
    const r = base.reviews[0] as AuditEntry['reviews'][number];
    const three = (['text', 'animation', 'safety'] as const).map((scope) => ({
      ...r,
      scope,
    }));
    expect(validateEntry({ ...base, reviews: three })).toEqual([]);
  });
  it('rejects bad dates, reviewers and open issues on approved entries', () => {
    const r = base.reviews[0] as AuditEntry['reviews'][number];
    expect(
      validateEntry({ ...base, reviews: [{ ...r, date: '2026-13-40' }] }),
    ).not.toEqual([]);
    expect(
      validateEntry({
        ...base,
        reviews: [{ ...r, reviewer: 'human:someone' as never }],
      }),
    ).not.toEqual([]);
    expect(validateEntry({ ...base, openIssues: ['x'] })).not.toEqual([]);
  });
  it('flags only approved entries as stale', () => {
    expect(isStale(base, 'zzz')).toBe(true);
    expect(isStale(base, 'abc')).toBe(false);
    expect(isStale({ ...base, status: 'unreviewed' }, 'zzz')).toBe(false);
  });
  it('queues high risk first, then needs-fix and awaiting, then unreviewed', () => {
    const mk = (
      id: string,
      risk: 'high' | 'normal',
      status: AuditEntry['status'],
    ) => ({ ...base, id, risk, status, reviews: [] }) as AuditEntry;
    const order = queue([
      mk('a', 'normal', 'needs-fix'),
      mk('b', 'high', 'unreviewed'),
      mk('c', 'high', 'fixed-awaiting-review'),
      mk('d', 'high', 'needs-fix'),
      mk('e', 'high', 'approved'),
    ]).map((e) => e.id);
    expect(order).toEqual(['d', 'c', 'b', 'a']);
  });
});
