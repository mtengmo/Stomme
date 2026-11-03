/**
 * Fingerprints of every exercise figure for docs/exercise-audit-log.json.
 *   tsx scripts/audit-fingerprints.ts          list approved exercises whose figure changed (exit 1)
 *   tsx scripts/audit-fingerprints.ts --write  refresh all fingerprints in the log
 * --write does not change any status: a changed approved figure stays
 * reported as stale until a new review is added (see docs/exercise-audit-log.md).
 */

import {
  isStale,
  readAuditLog,
  writeAuditLog,
} from '../src/content/exerciseAudit';
import { exerciseList } from '../src/content/exercises';
import { exerciseFingerprint } from '../src/figures/auditFingerprint';

const log = readAuditLog();
const current = new Map(
  exerciseList.map((e) => [e.id, exerciseFingerprint(e.id)]),
);

if (process.argv.includes('--write')) {
  let changed = 0;
  for (const entry of log) {
    const fp = current.get(entry.id as never);
    if (fp && fp !== entry.fingerprint) {
      entry.fingerprint = fp;
      changed++;
    }
  }
  writeAuditLog(log);
  console.log(`Fingerprints refreshed: ${changed} changed of ${log.length}.`);
} else {
  const stale = log.filter((e) => isStale(e, current.get(e.id as never) ?? ''));
  const drifted = log.filter(
    (e) =>
      e.status !== 'approved' && current.get(e.id as never) !== e.fingerprint,
  );
  for (const e of stale)
    console.log(
      `stale: ${e.id} (approved, figure changed since the log was written)`,
    );
  if (drifted.length > 0)
    console.log(
      `${drifted.length} not-approved exercises have a changed fingerprint; run with --write to refresh (no status change).`,
    );
  if (stale.length === 0) console.log('No stale approved exercises.');
  process.exit(stale.length > 0 ? 1 : 0);
}
