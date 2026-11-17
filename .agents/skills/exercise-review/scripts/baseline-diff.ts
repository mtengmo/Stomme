/**
 * Compare the working-tree figure baseline with HEAD (exercise-review skill).
 *   npx tsx .agents/skills/exercise-review/scripts/baseline-diff.ts [<id> ...]
 * Prints RAISED / NEW / LOWERED / REMOVED rows of src/figures/figureGeometry.baseline.json
 * (optionally only rows of the given ids). Rule: no RAISED, no NEW. Exit 1 if there is one.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FILE = 'src/figures/figureGeometry.baseline.json';
type Rows = Record<string, number>;
const ids = process.argv.slice(2);
const keep = (k: string) => !ids.length || ids.includes(k.split('|')[0] ?? '');
const head = JSON.parse(
  execFileSync('git', ['show', `HEAD:${FILE}`], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  }),
) as Rows;
const work = JSON.parse(readFileSync(FILE, 'utf8')) as Rows;
const out: Record<string, string[]> = {
  RAISED: [],
  NEW: [],
  LOWERED: [],
  REMOVED: [],
};
for (const k of Object.keys({ ...head, ...work }).sort()) {
  if (!keep(k)) continue;
  const a = head[k];
  const b = work[k];
  if (a === undefined && b !== undefined) out.NEW?.push(`${k}: ${b}`);
  else if (a !== undefined && b === undefined)
    out.REMOVED?.push(`${k}: was ${a}`);
  else if (a !== undefined && b !== undefined && b > a)
    out.RAISED?.push(`${k}: ${a} -> ${b}`);
  else if (a !== undefined && b !== undefined && b < a)
    out.LOWERED?.push(`${k}: ${a} -> ${b}`);
}
for (const [kind, rows] of Object.entries(out))
  for (const r of rows) console.log(`${kind} ${r}`);
const bad = (out.RAISED?.length ?? 0) + (out.NEW?.length ?? 0);
console.log(
  `${Object.values(out)
    .map((r) => r.length)
    .join(
      '/',
    )} raised/new/lowered/removed${ids.length ? ` (${ids.join(', ')})` : ''}: ${bad ? 'FAIL, fix the figure' : 'ok'}`,
);
process.exit(bad ? 1 : 0);
