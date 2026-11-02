import Dexie, { type EntityTable } from 'dexie';
import type { MetaEntry, Session, SetLog } from '../domain/types';

export const DB_NAME = 'stomme';

export class StommeDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  setLogs!: EntityTable<SetLog, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      sessions: 'id, date, status, templateId',
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      painLogs: 'id, sessionId, date, [sessionId+timing]',
      meta: 'key',
    });
    // Additive programme/check-in fields live in existing records. Legacy records
    // deliberately retain absent programId and their original knee policy.
    this.version(2).stores({
      sessions: 'id, date, status, templateId',
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      painLogs: 'id, sessionId, date, [sessionId+timing]',
      meta: 'key',
    });
    // The 0-10 knee pain readings of the removed original programme are dropped.
    this.version(3)
      .stores({
        sessions: 'id, date, status, templateId',
        setLogs: 'id, sessionId, [exerciseId+loggedAt]',
        painLogs: null,
        meta: 'key',
      })
      .upgrade(async (tx) => {
        // The removed programme's state must not survive: it cannot be backed up.
        await tx.table('meta').delete('program');
        await tx
          .table('sessions')
          .toCollection()
          .modify((session: Record<string, unknown>) => {
            if (!session.programId && session.status === 'in_progress') {
              // A programless session can no longer be resumed; close it, keep its sets.
              session.status = 'aborted';
              session.abortReason = 'user';
              session.finishedAt = session.startedAt;
            }
            if (Array.isArray(session.plan))
              for (const item of session.plan as Record<string, unknown>[])
                if (
                  item.reason === 'pain_hold' ||
                  item.reason === 'pain_stop_hold'
                )
                  item.reason = 'hold_incomplete';
          });
      });
  }
}

let shared: StommeDB | undefined;

/** Lazily created app-wide instance. Tests construct their own with a unique name. */
export function getDb(): StommeDB {
  shared ??= new StommeDB();
  return shared;
}
