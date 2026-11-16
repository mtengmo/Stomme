/**
 * Read-only fact sheet for exercise review (exercise-review skill).
 *   npx tsx .agents/skills/exercise-review/scripts/inspect.ts <id|E-ref> [...]
 * Prints, per exercise: text fields, unit, side, motion, views, variants,
 * spoken and timer copy, rep tempo, geometry baseline rows and the audit entry.
 * Also prints HEAD and dirty state, per-phase segment lengths per view and
 * equipment kind, demonstrationTiming, the phase-0 pose and the rep order.
 * Writes nothing.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { beginnerExerciseIds } from '../../../../src/content/beginnerSet';
import { readAuditLog } from '../../../../src/content/exerciseAudit';
import { exerciseMetadata } from '../../../../src/content/exerciseMetadata';
import { exerciseReferences } from '../../../../src/content/exerciseReferences';
import { exerciseSideCue } from '../../../../src/content/exerciseSideCues';
import { exercises } from '../../../../src/content/exercises';
import { pendingReviewIds } from '../../../../src/content/programExclusions';
import { timedMovementCue } from '../../../../src/content/timedMovement';
import type { ExerciseId } from '../../../../src/domain/types';
import { applyEquipmentPose } from '../../../../src/figures/equipmentPose';
import {
  demonstrationTiming,
  movementPose,
} from '../../../../src/figures/Figure';
import {
  defaultViewFor,
  frontMovementPose,
  obliqueMovementPose,
  supportedViewsFor,
} from '../../../../src/figures/frontViews';
import { figures, type Pose } from '../../../../src/figures/poses';
import { repTempo } from '../../../../src/rules/repTempo';

const baseline = JSON.parse(
  readFileSync(
    new URL(
      '../../../../src/figures/figureGeometry.baseline.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as Record<string, number>;
const log = new Map(readAuditLog().map((e) => [e.id, e]));
const byRef = new Map(
  Object.entries(exerciseReferences).map(([id, ref]) => [ref, id]),
);
const viewName = {
  side: 'Från sidan',
  front: 'Framifrån',
  oblique: 'Sned vinkel',
};

/** Segments measured in the length table (same pairs as the geometry ratchet). */
const SEGMENTS: [string, keyof Pose, keyof Pose][] = [
  ['neck-hip', 'neck', 'hip'],
  ['upperArmR', 'neck', 'eR'],
  ['forearmR', 'eR', 'hR'],
  ['upperArmL', 'neck', 'eL'],
  ['forearmL', 'eL', 'hL'],
  ['thighR', 'hip', 'kR'],
  ['shinR', 'kR', 'aR'],
  ['thighL', 'hip', 'kL'],
  ['shinL', 'kL', 'aL'],
];
const PHASES = [0, 0.25, 0.5, 0.75, 1];
const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
type Equip = 'dumbbell' | 'kettlebell' | 'band' | null | undefined;

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
  } catch {
    return '(git unavailable)';
  }
}

function lengthTable(label: string, make: (t: number) => Pose) {
  console.log(`  ${label}: segment length per phase (${PHASES.join(' / ')})`);
  for (const [name, a, b] of SEGMENTS) {
    const v = PHASES.map((t) => {
      const p = make(t);
      return dist(p[a], p[b]);
    });
    const drift = Math.max(...v) - Math.min(...v);
    console.log(
      `    ${name.padEnd(10)} ${v.map((x) => x.toFixed(1).padStart(5)).join(' ')}  drift ${drift.toFixed(1)}`,
    );
  }
}

/** Neutral start-pose facts. Does not guess standing/seated: read the numbers. */
function describeStart(p: Pose): string {
  const f = (n: number) => n.toFixed(1);
  return `hip y ${f(p.hip[1])}, knee y ${f(p.kR[1])}, ankle y ${f(p.aR[1])}, toe y ${f(p.tR[1])} (floor is y 178; ankle-to-floor ${f(178 - p.aR[1])}; hip above ankle ${f(p.aR[1] - p.hip[1])}). A foot clearly above 178 is on a step or lifted; judge the pose from the figure, not from these numbers alone`;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(
    'Usage: npx tsx .agents/skills/exercise-review/scripts/inspect.ts <id|E-ref> ...',
  );
  process.exit(1);
}

console.log(
  `HEAD ${git(['rev-parse', '--short', 'HEAD'])} on ${git(['branch', '--show-current']) || '(detached)'}`,
);

for (const arg of args) {
  const id = (byRef.get(arg.toUpperCase()) ?? arg) as ExerciseId;
  const e = exercises[id];
  if (!e) {
    console.log(`\n${arg}: not in the catalogue`);
    continue;
  }
  const spec = figures[id];
  const meta = exerciseMetadata[id];
  const cue = timedMovementCue[id];
  const tempo = repTempo(id);
  const entry = log.get(id);
  const timedKind =
    e.unit !== 'seconds' ? null : cue ? 'moving timed' : 'static hold';
  console.log(`\n=== ${exerciseReferences[id]} ${id}: ${e.name}`);
  const dirty = git([
    'status',
    '--short',
    '--',
    'src/content',
    'src/figures',
    'src/rules',
    'src/features/session',
    'src/features/training',
    'docs/exercise-audit-log.json',
  ]);
  console.log(
    dirty
      ? `working tree: DIRTY (the whole area is listed, not only this exercise). State this in notes, or review from a worktree at HEAD.\n${dirty
          .split('\n')
          .map((l) => `  ${l}`)
          .join('\n')}`
      : 'working tree (content, figures, rules, session, training, audit log): clean',
  );
  if (dirty) {
    const own = git([
      'diff',
      'HEAD',
      '--name-only',
      `-G${id}`,
      '--',
      'src/content',
      'src/figures',
      'src/rules',
    ]);
    console.log(
      `  files whose diff mentions '${id}': ${own ? own.split('\n').join(', ') : 'none'} (shared rendering such as Figure.tsx, lerp.ts or frontViews.tsx can still change this figure; numbers below are from the working tree)`,
    );
  }
  console.log(
    `unit ${e.unit}, range ${JSON.stringify(e.range)}, perSide ${e.perSide}${e.sideKind ? ` (${e.sideKind})` : ''}, kneeLoaded ${e.kneeLoaded}${timedKind ? `, ${timedKind}` : ''}`,
  );
  console.log(
    `motion ${spec.motion ?? 'controlled (default)'}; views ${supportedViewsFor(
      id,
    )
      .map((v) => `${v} "${viewName[v]}"`)
      .join(', ')}; default ${defaultViewFor(id)}`,
  );
  console.log('tips:');
  for (const t of e.tips) console.log(`  - ${t}`);
  console.log(`commonMistake: ${e.commonMistake}`);
  console.log(`easierVariant: ${e.easierVariant}`);
  console.log(
    `loadLadder labels: ${e.loadLadder.map((l) => l.label).join(' | ')}`,
  );
  console.log(
    `sidePolicy ${meta.sidePolicy}${meta.holdSeconds ? `, holdSeconds ${meta.holdSeconds}` : ''}${meta.easierExerciseId ? `, easier ${meta.easierExerciseId}` : ''}`,
  );
  for (const v of meta.variants)
    console.log(
      `  variant ${v.id} [${v.technicalLevel}] ${v.label}: ${v.equipment.map((q) => `${q.count}x${q.type}`).join(', ')}; setup: ${v.setup} cue: ${v.cue} easier: ${v.easierOption}`,
    );
  console.log(
    '  (compare loadLadder labels above with the variant setup/cue and the grip that is drawn)',
  );
  if (e.perSide)
    for (const side of ['right', 'left'] as const) {
      const c = exerciseSideCue(id, side);
      console.log(
        `side cue ${side}: ${c ? `${c.label} - ${c.explanation}` : 'none'}`,
      );
    }
  console.log('voice and timer copy (see references/voice-crosscheck.md):');
  if (e.unit === 'seconds') {
    console.log(
      `  start: "${e.perSide ? '<side>. ' : ''}Gör dig redo. Fem sekunder." then "${cue?.startVoice ?? 'Börja hålla.'}"`,
    );
    console.log(
      `  end: "${cue ? 'Klart. Vila.' : 'Klart. Släpp positionen.'}"; resume: "${cue ? 'Fortsätt rörelsen.' : 'Fortsätt hålla.'}"`,
    );
    console.log(
      `  timer label: ${cue ? 'Övningstid' : 'Hålltid'}; status: ${cue?.status ?? 'Håll tills signalen. Setet sparas och nästa steg börjar automatiskt.'}`,
    );
    if (cue) console.log(`  hint: ${cue.hint}`);
  } else if (tempo) {
    console.log(
      `  start: "${e.perSide ? '<side>. ' : ''}Gör dig redo. Fem sekunder." then "${tempo.hasHold ? 'Börja. Upp.' : 'Börja.'}"; count "1", "2", ...${tempo.hasHold ? ' with "Upp"/"Håll"/"Ner"' : ''}; end "Klart."`,
    );
    console.log(
      `  repTempo up ${tempo.upMs} ms, hold ${tempo.holdMs}, down ${tempo.downMs}, relax ${tempo.relaxMs}, rep ${tempo.repMs}${tempo.sequence ? ', sequence' : ''}`,
    );
  } else
    console.log(
      `  no timer or count voice (${e.unit === 'reps' ? 'reps counted by hand' : e.unit})`,
    );
  const timing = demonstrationTiming(id);
  // Older commits have no returnMs: the return then takes tweenMs.
  const returnMs = (timing as { returnMs?: number }).returnMs ?? timing.tweenMs;
  console.log(
    `demonstrationTiming: start hold ${timing.startHoldMs} ms, up ${timing.tweenMs} ms, end hold ${timing.endHoldMs} ms, return ${returnMs} ms`,
  );
  if (tempo)
    console.log(
      `rep order (repTempo): up ${tempo.upMs} -> hold ${tempo.holdMs} -> down ${tempo.downMs} -> relax ${tempo.relaxMs} ms. Phase 0 = start position; a rep counts when progress is back at 0 (SetScreen passes counter.progress to the figure).`,
    );
  const views = supportedViewsFor(id);
  const frames =
    (view: string, equip: Equip) =>
    (t: number): Pose => {
      if (view === 'front')
        return applyEquipmentPose(
          id,
          frontMovementPose(id as never, t, 'right'),
          equip,
        ).p;
      if (view === 'oblique')
        return applyEquipmentPose(
          id,
          obliqueMovementPose(id as never, t, 'right'),
          equip,
        ).p;
      const raw = spec.motion === 'hold' ? spec.end : movementPose(id, t);
      return applyEquipmentPose(id, raw, equip).p;
    };
  const startPose = frames(views[0], undefined)(0);
  console.log(
    `phase 0 pose (${views[0]} view, default equipment; raw numbers, no standing/seated guess): ${describeStart(startPose)}`,
  );
  const equipKinds = new Set<Equip>([undefined]);
  for (const v of meta.variants)
    for (const q of v.equipment)
      if (q.type === 'dumbbell' || q.type === 'kettlebell' || q.type === 'band')
        equipKinds.add(q.type);
  if (equipKinds.size === 1)
    console.log(
      'U: n/a (no dumbbell, kettlebell or band variant; props and floor contact count under AS/AF)',
    );
  console.log(
    'segment lengths (right side only; check left and other variants by eye; front/oblique lengths are projections: shorter than profile is expected, longer is a defect; front thigh limit 36; equipment is applied via applyEquipmentPose, so check the equipment axis against the side view):',
  );
  for (const view of views)
    for (const eq of equipKinds)
      lengthTable(`${view}, equipment ${eq ?? 'default'}`, frames(view, eq));
  const rows = Object.entries(baseline).filter(([k]) => k.startsWith(`${id}|`));
  console.log(
    `geometry baseline rows (default equipment, right side): ${rows.length ? '' : 'none'}`,
  );
  for (const [k, v] of rows) console.log(`  ${k.slice(id.length + 1)}: ${v}`);
  console.log(
    `beginner set: ${beginnerExerciseIds.has(id)}; pending review: ${pendingReviewIds.has(id)}`,
  );
  if (entry) {
    const fix = entry.fixes.at(-1);
    console.log(
      `audit: risk ${entry.risk}, status ${entry.status}, ${entry.reviews.length} reviews, last fix ${fix ? `${fix.date} by ${fix.fixer}` : 'none'}`,
    );
    for (const r of entry.reviews.slice(-3))
      console.log(`  review ${r.date} ${r.reviewer} ${r.scope} ${r.result}`);
    for (const i of entry.openIssues) console.log(`  open: ${i}`);
  }
}
