import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';

import type { PainLog, Session, SetLog } from '../domain/types';

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
