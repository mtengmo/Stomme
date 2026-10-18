import type { MetaEntry, Session } from '../domain/types';
import type { StommeDB } from './db';

export type NewSession = Omit<Session, 'id'> & { id?: string };

/** Stores a session; generates an id when not given. Returns the stored session. */
export async function createSession(
  db: StommeDB,
  input: NewSession,
): Promise<Session> {
  const session: Session = { ...input, id: input.id ?? crypto.randomUUID() };
  await db.sessions.add(session);
  return session;
}

/** All sessions, newest first. */
export async function listSessions(db: StommeDB): Promise<Session[]> {
  const all = await db.sessions.toArray();
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getMeta<T = unknown>(
  db: StommeDB,
  key: MetaEntry['key'],
): Promise<T | undefined> {
  const entry = await db.meta.get(key);
  return entry?.value as T | undefined;
}

export async function setMeta(
  db: StommeDB,
  key: MetaEntry['key'],
  value: unknown,
): Promise<void> {
  await db.meta.put({ key, value });
}
