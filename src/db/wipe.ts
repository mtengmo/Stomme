import type { StommeDB } from './db';

/** Wipes every table, including meta (so the app returns to onboarding). */
export async function deleteAllData(db: StommeDB): Promise<void> {
  await db.transaction(
    'rw',
    db.sessions,
    db.setLogs,
    db.painLogs,
    db.meta,
    async () => {
      await Promise.all([
        db.sessions.clear(),
        db.setLogs.clear(),
        db.painLogs.clear(),
        db.meta.clear(),
      ]);
    },
  );
}
