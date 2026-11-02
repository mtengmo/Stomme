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
    this.version(3).stores({
      sessions: 'id, date, status, templateId',
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      painLogs: null,
      meta: 'key',
    });
  }
}

let shared: StommeDB | undefined;

/** Lazily created app-wide instance. Tests construct their own with a unique name. */
export function getDb(): StommeDB {
  shared ??= new StommeDB();
  return shared;
}
