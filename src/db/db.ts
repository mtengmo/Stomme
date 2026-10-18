import Dexie, { type EntityTable } from 'dexie';
import type { MetaEntry, PainLog, Session, SetLog } from '../domain/types';

export const DB_NAME = 'stomme';

export class StommeDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  setLogs!: EntityTable<SetLog, 'id'>;
  painLogs!: EntityTable<PainLog, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      sessions: 'id, date, status, templateId',
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      painLogs: 'id, sessionId, date, [sessionId+timing]',
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
