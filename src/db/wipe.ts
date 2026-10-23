import { clearAppearance } from '../lib/appearance';
import type { StommeDB } from './db';

/**
 * Wipes every table, including meta (so the app returns to onboarding), and
 * the device-local appearance choice.
 */
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
  clearAppearance();
}
