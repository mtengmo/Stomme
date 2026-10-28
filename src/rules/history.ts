import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';

import type { PainLog, Session, SetLog } from '../domain/types';
import { addDays, weekStart } from '../lib/dates';

export function sessionSetProgress(session: Session, logs: readonly SetLog[]) {
  let done = 0;

  for (const p of session.plan) {
    for (let n = 1; n <= p.sets; n++) {
      const sides =
        p.sides ??
        (exercises[p.exerciseId].perSide ? ['right', 'left'] : ['both']);

      if (
        sides.every((side) =>
          logs.some(
            (l) =>
              l.sessionId === session.id &&
              l.exerciseId === p.exerciseId &&
              l.setNumber === n &&
              l.side === side,
          ),
        )
      )
        done++;
    }
  }

  return { done, total: session.plan.reduce((n, p) => n + p.sets, 0) };
}

export function symptomSummary(
  session: Session,
  pain: readonly PainLog[],
): string {
  if (!session.programId) {
    const values = pain.filter((p) => p.sessionId === session.id);

    return values.length
      ? `Höger knä: ${values.map((p) => p.score).join(' / ')} av 10`
      : 'Besvär: svar saknas';
  }

  const checks = Object.values(session.checkins ?? {});

  const during = Object.values(session.feedback)
    .map((f) => f?.symptoms)
    .filter((s) => s !== undefined);

  const reports = [...checks.map((c) => c.symptoms), ...during];

  const symptoms = reports.filter((s) => s !== null);

  if (symptoms.length)
    return `Besvär rapporterade: ${[...new Set(symptoms.map((s) => s.area))].join(', ')}`;

  if (reports.length) return 'Inga besvär i sparade svar';

  return 'Besvär: svar saknas';
}

/** Never infer equipment from weight: a DB and KB can weigh the same. */

export function loggedVariant(log: SetLog): string {
  const variants = exerciseMetadata[log.exerciseId].variants;

  return (
    (log.variantId
      ? variants.find((v) => v.id === log.variantId)
      : variants.find((v) => v.loadIndices.includes(log.loadIndex))
    )?.id ?? 'unknown'
  );
}

export interface HistorySummary {
  /** Finished sessions in the current calendar week (Monday to Sunday). */
  weekCompleted: number;
  /** Finished and stopped sessions in this and the three previous calendar weeks. */
  fourWeeksCompleted: number;
  fourWeeksAborted: number;
  /** The newest session, whatever its state. */
  last: Session | undefined;
  /** Pain score after the newest session, only when one was recorded. */
  lastPainAfter: number | undefined;
}

/** Plain counts from the user's own sessions; nothing is estimated. */
export function historySummary(
  sessions: readonly Session[],
  painLogs: readonly PainLog[],
  today: string,
): HistorySummary {
  const thisWeek = weekStart(today);
  const fourWeeksAgo = addDays(thisWeek, -21);
  const inFour = sessions.filter((s) => s.date >= fourWeeksAgo);
  const last = [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt),
  )[0];
  const after = last
    ? painLogs.find((p) => p.sessionId === last.id && p.timing === 'after')
    : undefined;
  return {
    weekCompleted: sessions.filter(
      (s) => s.status === 'completed' && s.date >= thisWeek,
    ).length,
    fourWeeksCompleted: inFour.filter((s) => s.status === 'completed').length,
    fourWeeksAborted: inFour.filter((s) => s.status === 'aborted').length,
    last,
    lastPainAfter: after?.score,
  };
}
