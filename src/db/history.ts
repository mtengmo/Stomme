import type { StommeDB } from './db';

/**
 * Deletes a session together with its set logs and pain logs, all in one
 * transaction: either everything goes or nothing does.
 */
export async function deleteSession(
  db: StommeDB,
  sessionId: string,
): Promise<void> {
  await db.transaction('rw', db.sessions, db.setLogs, db.painLogs, async () => {
    await db.setLogs.where('sessionId').equals(sessionId).delete();
    await db.painLogs.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}
