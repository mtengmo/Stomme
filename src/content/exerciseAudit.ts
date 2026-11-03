import { readFileSync, writeFileSync } from 'node:fs';

/** Types, validation and queue logic for docs/exercise-audit-log.json. */
export const REVIEWERS = [
  'claude-opus',
  'claude-sonnet',
  'claude-fable',
  'unknown-claude',
  'codex:gpt6astra',
  'codex:gpt61sol',
  'human',
] as const;
export type Reviewer = (typeof REVIEWERS)[number];
export const SCOPES = ['text', 'animation', 'safety', 'all'] as const;
export type Scope = (typeof SCOPES)[number];
export const STATUSES = [
  'unreviewed',
  'needs-fix',
  'fixed-awaiting-review',
  'approved',
] as const;
export type Status = (typeof STATUSES)[number];

export interface AuditReview {
  date: string;
  reviewer: Reviewer;
  scope: Scope;
  result: 'ok' | 'issues';
  notes: string;
  commit?: string;
  evidence?: string;
}
export interface AuditFix {
  date: string;
  fixer: Reviewer;
  commit?: string;
  notes: string;
}
export interface AuditEntry {
  id: string;
  name: string;
  group: string;
  risk: 'high' | 'normal';
  status: Status;
  reviews: AuditReview[];
  fixes: AuditFix[];
  openIssues: string[];
  notes?: string[];
  fingerprint: string;
}

export const AUDIT_LOG_PATH = new URL(
  '../../docs/exercise-audit-log.json',
  import.meta.url,
);

export function readAuditLog(): AuditEntry[] {
  return JSON.parse(readFileSync(AUDIT_LOG_PATH, 'utf8')) as AuditEntry[];
}
export function writeAuditLog(entries: AuditEntry[]): void {
  writeFileSync(AUDIT_LOG_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

export function isValidDate(s: unknown): boolean {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const lastReview = (e: AuditEntry): AuditReview | undefined =>
  e.reviews.at(-1);
export const lastFix = (e: AuditEntry): AuditFix | undefined => e.fixes.at(-1);

/** Approved entries whose figure changed after the log was written. */
export const isStale = (e: AuditEntry, current: string): boolean =>
  e.status === 'approved' && e.fingerprint !== current;

/** Problems that make the log untrustworthy; empty when it is sound. */
export function validateEntry(e: AuditEntry): string[] {
  const errs: string[] = [];
  const at = (m: string) => errs.push(`${e.id}: ${m}`);
  if (!(STATUSES as readonly string[]).includes(e.status))
    at(`invalid status ${e.status}`);
  if (e.risk !== 'high' && e.risk !== 'normal') at('invalid risk');
  for (const [i, r] of e.reviews.entries()) {
    if (!isValidDate(r.date)) at(`review ${i} has invalid date ${r.date}`);
    if (!(REVIEWERS as readonly string[]).includes(r.reviewer))
      at(`review ${i} has invalid reviewer ${r.reviewer}`);
    if (!(SCOPES as readonly string[]).includes(r.scope))
      at(`review ${i} has invalid scope ${r.scope}`);
    if (r.result !== 'ok' && r.result !== 'issues')
      at(`review ${i} has invalid result ${r.result}`);
  }
  for (const [i, f] of e.fixes.entries()) {
    if (!isValidDate(f.date)) at(`fix ${i} has invalid date ${f.date}`);
    if (!(REVIEWERS as readonly string[]).includes(f.fixer))
      at(`fix ${i} has invalid fixer ${f.fixer}`);
  }
  if (e.status === 'approved') {
    const covered = approvedScopes(e);
    const last = lastReview(e);
    if (!last) at('approved without a review');
    else if (last.result !== 'ok') at('approved but latest review is not ok');
    if (last && !covered)
      at('approved without scope all or text+animation+safety');
    const fix = lastFix(e);
    if (last && fix) {
      if (last.reviewer === fix.fixer)
        at(`approved by ${last.reviewer}, who also made the last fix`);
      if (last.date < fix.date) at('latest review predates the last fix');
    }
    if (e.openIssues.length > 0) at('approved with open issues');
  }
  return errs;
}

/** Scopes with an ok review newer than the last fix cover the approval. */
function approvedScopes(e: AuditEntry): boolean {
  const fixDate = lastFix(e)?.date ?? '';
  const ok = e.reviews.filter((r) => r.result === 'ok' && r.date >= fixDate);
  const scopes = new Set(ok.map((r) => r.scope));
  return (
    scopes.has('all') ||
    (scopes.has('text') && scopes.has('animation') && scopes.has('safety'))
  );
}

/** Lower sorts earlier: high risk first, then needs-fix, awaiting, unreviewed. */
export function queueRank(e: AuditEntry): [number, number, number] {
  const stage: Record<Status, number> = {
    'needs-fix': 0,
    'fixed-awaiting-review': 1,
    unreviewed: 2,
    approved: 9,
  };
  return [e.risk === 'high' ? 0 : 1, stage[e.status], e.reviews.length];
}
export function queue(entries: AuditEntry[]): AuditEntry[] {
  return entries
    .filter((e) => e.status !== 'approved')
    .map((e, i) => ({ e, i, r: queueRank(e) }))
    .sort(
      (a, b) =>
        a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.r[2] - b.r[2] || a.i - b.i,
    )
    .map((x) => x.e);
}
