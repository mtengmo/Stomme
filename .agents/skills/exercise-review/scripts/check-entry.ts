/**
 * Lint review notes before saving (exercise-review skill, SKILL.md "Self-check").
 *   npx tsx .agents/skills/exercise-review/scripts/check-entry.ts "<notes>"
 *   npx tsx .agents/skills/exercise-review/scripts/check-entry.ts --log <id|E-ref> ...
 * --log checks the last review of each exercise in docs/exercise-audit-log.json
 * (working tree). Checks: length <= 1200, no trailing whitespace, a space
 * between a word and a number ("fas 0.5", not "fas0.5"), "AF n/a" / "U n/a"
 * spelled exactly, and "score a/b (...)" adding up (b = 3 x scored dimensions).
 * Exit 1 on a problem. Writes nothing.
 */
import { readAuditLog } from '../../../../src/content/exerciseAudit';
import { exerciseReferences } from '../../../../src/content/exerciseReferences';

const MAX = 1200;

export function lint(notes: string): string[] {
  const out: string[] = [];
  if (notes.length > MAX) out.push(`length ${notes.length} > ${MAX}`);
  if (/\s$/.test(notes) || /[ \t]\n/.test(notes))
    out.push('trailing whitespace');
  // Hex ids (commit, fp), reviewer ids, URLs and paths are not words.
  const plain = notes
    .replace(/https?:\/\/\S+|codex:\S+|claude-\S+/g, '')
    .replace(
      /(?:\.impeccable|src|docs|scripts)\/\S*|\S+\.(?:png|tsx?|json|md)\b/g,
      '',
    )
    .replace(/\b[0-9a-f]{7,}\b/g, '');
  for (const m of plain.matchAll(/[a-zåäö]\d/g))
    out.push(
      `no space before a number: "${plain.slice(Math.max(0, m.index - 8), m.index + 6)}"`,
    );
  for (const m of notes.matchAll(
    /\b(AS|AF|U)\s*[:=-]?\s*(n\.?a\.?|N\/A|-|–)(?=[\s;),.]|$)/g,
  ))
    if (m[0] !== `${m[1]} n/a`) out.push(`write "${m[1]} n/a", not "${m[0]}"`);
  const score = notes.match(/score (\d+)\/(\d+) \(([^)]*)\)/);
  if (!score) out.push('no "score a/b (T3 R3 ...)"');
  else {
    const dims = [
      ...(score[3] ?? '').matchAll(/\b(T|R|AS|AF|U|S)(?:([0-3])| n\/a)\b/g),
    ];
    const scored = dims.filter((d) => d[2] !== undefined);
    const sum = scored.reduce((s, d) => s + Number(d[2]), 0);
    if (!dims.length) out.push(`score dimensions unreadable: "${score[3]}"`);
    else if (sum !== Number(score[1]) || 3 * scored.length !== Number(score[2]))
      out.push(
        `score ${score[1]}/${score[2]} but dimensions give ${sum}/${3 * scored.length}`,
      );
  }
  return out;
}

const argv = process.argv.slice(2);
const byRef = new Map(
  Object.entries(exerciseReferences).map(([id, ref]) => [ref, id]),
);
const checks: [string, string][] =
  argv[0] === '--log'
    ? argv.slice(1).map((a) => {
        const id = byRef.get(a.toUpperCase()) ?? a;
        const r = readAuditLog()
          .find((e) => e.id === id)
          ?.reviews.at(-1);
        return [`${id} ${r?.date} ${r?.reviewer} ${r?.scope}`, r?.notes ?? ''];
      })
    : argv.map((n) => ['notes', n]);
if (!checks.length) {
  console.log(
    'Usage: check-entry.ts "<notes>" | check-entry.ts --log <id|E-ref> ...',
  );
  process.exit(1);
}
let bad = 0;
for (const [label, notes] of checks) {
  const problems = lint(notes);
  bad += problems.length;
  console.log(
    `${label}: ${notes.length} chars, ${problems.length ? problems.join('; ') : 'ok'}`,
  );
}
process.exit(bad ? 1 : 0);
