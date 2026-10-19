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
  /** A recent day-after reading above the threshold or worse than after. */
  dayAfterWorse?: Session;
  /** ...and specifically higher than the reading after the session. */
  dayAfterHigherThanAfter: boolean;
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
  const logsOf = (s: Session) => painLogs.filter((p) => p.sessionId === s.id);
  const dayAfterOf = (s: Session) => {
    const own = logsOf(s);
    const d = own.find((p) => p.timing === 'dayAfter');
    return d ? assessReading(d, dayAfterReference(own)) : undefined;
  };
  const latestDay = latest ? dayAfterOf(latest) : undefined;
  const stopBanner =
    (latest?.status === 'aborted' && latest.abortReason === 'pain_stop') ||
    latestDay?.status === 'stop';
  const dayAfterDue = sorted.find((s) =>
    shouldPromptDayAfter(s, logsOf(s), today, sessions),
  );
  const recent = latest !== undefined && daysBetween(latest.date, today) <= 2;
  const dayAfterWorse =
    recent && latestDay && latestDay.status !== 'ok' ? latest : undefined;
  return {
    stopBanner,
    dayAfterDue,
    dayAfterWorse,
    dayAfterHigherThanAfter:
      dayAfterWorse !== undefined &&
      latestDay?.reasons.includes('worse_than_previous_day') === true,
  };
}
