/** Summary of docs/exercise-audit-log.json: counts, risk, stale, next in queue. */

import {
  isStale,
  queue,
  readAuditLog,
  STATUSES,
} from '../src/content/exerciseAudit';
import { exerciseList } from '../src/content/exercises';
import { exerciseFingerprint } from '../src/figures/auditFingerprint';

const log = readAuditLog();
const fp = new Map(exerciseList.map((e) => [e.id, exerciseFingerprint(e.id)]));
const line = (e: (typeof log)[number]) =>
  `${e.id} [${e.status}${e.risk === 'high' ? ', high' : ''}]${
    e.openIssues.length ? ` - ${e.openIssues[0]}` : ''
  }`;

console.log(`Exercises in log: ${log.length}`);
console.log('\nBy status:');
for (const s of STATUSES)
  console.log(`  ${s}: ${log.filter((e) => e.status === s).length}`);
const highOpen = log.filter(
  (e) => e.risk === 'high' && e.status !== 'approved',
);
console.log(
  `\nHigh-risk not approved: ${highOpen.length} of ${log.filter((e) => e.risk === 'high').length}`,
);
for (const e of highOpen.filter((x) => x.status !== 'unreviewed'))
  console.log(`  ${line(e)}`);
console.log(
  '  (high-risk unreviewed exercises are not listed here; see the queue)',
);
const stale = log.filter((e) => isStale(e, fp.get(e.id as never) ?? ''));
console.log(`\nStale (approved, figure changed): ${stale.length}`);
for (const e of stale) console.log(`  ${e.id}`);
console.log('\nNext 10 in queue:');
for (const [i, e] of queue(log).slice(0, 10).entries())
  console.log(`  ${i + 1}. ${line(e)}`);
