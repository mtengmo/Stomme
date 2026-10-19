import type { Session } from '../../domain/types';
import { daysBetween } from '../../lib/dates';
import {
  assessReading,
  dayAfterReference,
  type PainReading,
  shouldPromptDayAfter,
} from '../../rules/pain';

export interface CareState {
  /** The latest session was stopped for pain; shown until the next one starts. */
  stopBanner: boolean;
  /** A session that should get a day-after reading today. */
  dayAfterDue?: Session;
  /** A recent day-after reading that was worse than after the session. */
  dayAfterWorse?: Session;
}

const byStart = (a: Session, b: Session) =>
  b.startedAt.localeCompare(a.startedAt);

/** Pain notices for the week view and the pass preview. */
export function careState(
  sessions: readonly Session[],
  painLogs: readonly (PainReading & { sessionId: string })[],
  today: string,
): CareState {
  const sorted = [...sessions].sort(byStart);
  const latest = sorted[0];
  const stopBanner =
    latest?.status === 'aborted' && latest.abortReason === 'pain_stop';
  const logsOf = (s: Session) => painLogs.filter((p) => p.sessionId === s.id);
  const dayAfterDue = sorted.find((s) =>
    shouldPromptDayAfter(s, logsOf(s), today, sessions),
  );
  const dayAfterWorse =
    latest && daysBetween(latest.date, today) <= 2
      ? [latest].find((s) => {
          const own = logsOf(s);
          const d = own.find((p) => p.timing === 'dayAfter');
          return (
            d !== undefined &&
            assessReading(d, dayAfterReference(own)).status !== 'ok'
          );
        })
      : undefined;
  return { stopBanner, dayAfterDue, dayAfterWorse };
}
