import type { PainLog, PainReason, PainStatus, Session } from '../domain/types';
import { daysBetween } from '../lib/dates';

export const PAIN_OK_MAX = 3;

/** The parts of a PainLog the rules look at. */
export type PainReading = Pick<PainLog, 'score' | 'redFlags' | 'timing'> &
  Partial<Pick<PainLog, 'sessionId' | 'createdAt'>>;

export interface PainAssessment {
  status: PainStatus;
  reasons: PainReason[];
}

const RANK: Record<PainStatus, number> = { ok: 0, warn: 1, stop: 2 };

export function isValidScore(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10;
}

/**
 * Any red flag stops; a score above 3 warns; a score higher than the
 * reference reading warns (day-after readings only). An invalid score warns
 * (never ok). Every applicable reason is reported.
 */
export function assessReading(
  r: PainReading,
  reference?: PainReading,
): PainAssessment {
  const reasons: PainReason[] = [];
  const redFlag = r.redFlags.sharp || r.redFlags.swelling || r.redFlags.locking;
  if (redFlag) reasons.push('red_flag');
  if (!isValidScore(r.score)) reasons.push('invalid_score');
  if (r.score > PAIN_OK_MAX) reasons.push('above_threshold');
  if (r.timing === 'dayAfter' && reference && r.score > reference.score) {
    reasons.push('worse_than_previous_day');
  }
  let status: PainStatus = 'ok';
  if (redFlag) status = 'stop';
  else if (reasons.length > 0) status = 'warn';
  return { status, reasons };
}

/** Worst reading wins (stop > warn > ok); reasons are the union. Empty = ok. */
export function assessSession(
  readings: readonly PainReading[],
): PainAssessment {
  let status: PainStatus = 'ok';
  const reasons = new Set<PainReason>();
  for (const r of readings) {
    const a = assessReading(r);
    if (RANK[a.status] > RANK[status]) status = a.status;
    for (const reason of a.reasons) reasons.add(reason);
  }
  return { status, reasons: [...reasons] };
}

function latest(readings: readonly PainReading[]): PainReading | undefined {
  return readings.reduce<PainReading | undefined>(
    (best, r) =>
      !best || (r.createdAt ?? '') >= (best.createdAt ?? '') ? r : best,
    undefined,
  );
}

/** The session's 'after' reading, falling back to 'before'. */
export function dayAfterReference(
  readings: readonly PainReading[],
): PainReading | undefined {
  return (
    latest(readings.filter((r) => r.timing === 'after')) ??
    latest(readings.filter((r) => r.timing === 'before'))
  );
}

/**
 * Pain status of one session including its day-after reading: the worst of
 * assessSession and the latest dayAfter reading compared with the session's
 * 'after' (fallback 'before') reading. LastResult.sessionPain must come from
 * this (or worstPainSince), so that day-after 3 after 'after' 2 gives 'warn'.
 */
export function sessionPainStatus(
  readings: readonly PainReading[],
): PainStatus {
  const base = assessSession(readings).status;
  const dayAfter = latest(readings.filter((r) => r.timing === 'dayAfter'));
  if (!dayAfter) return base;
  const a = assessReading(dayAfter, dayAfterReference(readings));
  return RANK[a.status] > RANK[base] ? a.status : base;
}

/**
 * Worst pain status over every session dated on or after `sinceDate` (the
 * date of the exercise's last session), using each session's own readings
 * (matched on sessionId) including day-after. A session aborted for pain
 * always counts as 'stop', even without readings.
 */
export function worstPainSince(
  sessions: readonly Session[],
  painLogs: readonly PainReading[],
  sinceDate: string,
): PainStatus {
  let worst: PainStatus = 'ok';
  for (const s of sessions) {
    if (s.date < sinceDate) continue;
    let status = sessionPainStatus(
      painLogs.filter((p) => p.sessionId === s.id),
    );
    if (s.status === 'aborted' && s.abortReason === 'pain_stop') {
      status = 'stop';
    }
    if (RANK[status] > RANK[worst]) worst = status;
  }
  return worst;
}

/**
 * Whether to ask for a day-after reading for `session` on local date `today`.
 * The session counts from its local start date (`session.date`). Prompt when
 * it was completed or stopped for pain, is 1-2 calendar days old, has no
 * dayAfter reading yet and no newer session has started.
 * `sessions` is every session (used to detect a newer one).
 */
export function shouldPromptDayAfter(
  session: Session,
  readings: readonly PainReading[],
  today: string,
  sessions: readonly Session[] = [],
): boolean {
  const eligible =
    session.status === 'completed' ||
    (session.status === 'aborted' && session.abortReason === 'pain_stop');
  if (!eligible) return false;
  const age = daysBetween(session.date, today);
  if (age < 1 || age > 2) return false;
  const logged = readings.some(
    (r) =>
      r.timing === 'dayAfter' &&
      (r.sessionId === undefined || r.sessionId === session.id),
  );
  if (logged) return false;
  return !sessions.some(
    (s) =>
      s.id !== session.id &&
      Date.parse(s.startedAt) > Date.parse(session.startedAt),
  );
}
