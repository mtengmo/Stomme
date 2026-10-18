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

export function isValidScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 10;
}

/**
 * Any red flag stops; a score above 3 warns; a score higher than the
 * reference reading warns. Every applicable reason is reported.
 */
export function assessReading(
  r: PainReading,
  reference?: PainReading,
): PainAssessment {
  const reasons: PainReason[] = [];
  const redFlag = r.redFlags.sharp || r.redFlags.swelling || r.redFlags.locking;
  if (redFlag) reasons.push('red_flag');
  if (r.score > PAIN_OK_MAX) reasons.push('above_threshold');
  if (reference && r.score > reference.score) {
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
    (s) => s.id !== session.id && s.startedAt > session.startedAt,
  );
}
