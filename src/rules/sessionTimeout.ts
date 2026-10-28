import type { PainLog, Session, SetLog } from '../domain/types';

/** An open session with no activity for this long is ended automatically. */
export const IDLE_LIMIT_MIN = 90;
const IDLE_LIMIT_MS = IDLE_LIMIT_MIN * 60_000;

/**
 * The latest instant something was recorded in the session: its start, every
 * set, pain reading and check-in. Feedback has no timestamp and is ignored.
 */
export function lastActivity(
  session: Session,
  setLogs: readonly Pick<SetLog, 'loggedAt'>[],
  painLogs: readonly Pick<PainLog, 'createdAt'>[],
): string {
  const stamps = [
    session.startedAt,
    ...setLogs.map((l) => l.loggedAt),
    ...painLogs.map((p) => p.createdAt),
    ...Object.values(session.checkins ?? {}).flatMap((c) =>
      c ? [c.recordedAt] : [],
    ),
  ].filter((s) => Number.isFinite(Date.parse(s)));
  if (stamps.length === 0) return session.startedAt;
  return stamps.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}

/**
 * True when `now` is at least 90 minutes after the last activity. A clock that
 * moved backwards (now before the last activity) never expires a session.
 */
export function isSessionStale(lastActivityAt: string, now: Date): boolean {
  const last = Date.parse(lastActivityAt);
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last >= IDLE_LIMIT_MS;
}
