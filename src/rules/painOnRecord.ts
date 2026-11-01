import type { PainLog, Session } from '../domain/types';

/** Any reported symptom on record: starts light and leaves out impact exercises. */
export function symptomsOnRecord(
  sessions: readonly Session[],
  painReported: boolean,
) {
  return (
    painReported ||
    sessions.some(
      (session) =>
        session.abortReason === 'pain_stop' ||
        Object.values(session.checkins ?? {}).some(
          (check) => check?.symptoms,
        ) ||
        Object.values(session.feedback).some((item) => item?.symptoms),
    )
  );
}

/** Any pain reading above zero or a red flag counts as pain on record. */
export function painLogsShowPain(logs: readonly PainLog[]): boolean {
  return logs.some(
    (log) =>
      log.score > 0 ||
      log.redFlags.sharp ||
      log.redFlags.swelling ||
      log.redFlags.locking,
  );
}
