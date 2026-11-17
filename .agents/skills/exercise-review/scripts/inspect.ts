/**
 * Read-only fact sheet for exercise review and fixing (exercise-review skill).
 *   npx tsx .agents/skills/exercise-review/scripts/inspect.ts <id|E-ref> [...]
 *   npx tsx .agents/skills/exercise-review/scripts/inspect.ts --scan [--min 5] [--top 15] [--metric asym:shin,drift:thigh,front,oblique,stills] [<id|E-ref> ...]
 * Per exercise: text fields, unit, side, motion, views, variants, sources,
 * spoken and timer copy, rep tempo, demonstrationTiming, the phase-0 pose,
 * per-phase segment lengths per view and equipment, baseline rows, the audit
 * entry, the fingerprint, HEAD and dirty state, whether the figure is identical
 * at HEAD (dirty tree only; --no-head skips it), and the reduced-motion stills
 * compared with the live loop.
 * --scan: one line per exercise with objective defects, worst first (side
 * drift/asymmetry above --min, front thigh above 36, front/oblique segments
 * longer than the profile, stills that differ from the live loop); --top N
 * lines (0 = all); --metric keeps only matching defects (kind[:segment], kinds
 * drift, asym, front, oblique, stills; comma = or).
 * Writes nothing in the repo except a temporary HEAD copy under
 * .impeccable/review/ (gitignored), removed again.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExerciseId } from '../../../../src/domain/types';
import type { Pose } from '../../../../src/figures/poses';

// Figure.tsx reads import.meta.env.DEV (defined by Vite only) when it renders.
// Rewrite it to false so the stills can be rendered here; therefore every src
// import below is dynamic (static imports would load before this hook).
registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context);
    return url.includes('/src/figures/') && r.source
      ? {
          ...r,
          source: String(r.source).replaceAll('import.meta.env.DEV', 'false'),
        }
      : r;
  },
});
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { beginnerExerciseIds } = await import(
  '../../../../src/content/beginnerSet'
);
const { readAuditLog } = await import('../../../../src/content/exerciseAudit');
const { exerciseMetadata } = await import(
  '../../../../src/content/exerciseMetadata'
);
const { exerciseReferences } = await import(
  '../../../../src/content/exerciseReferences'
);
const { exerciseSideCue } = await import(
  '../../../../src/content/exerciseSideCues'
);
const { exerciseList, exercises } = await import(
  '../../../../src/content/exercises'
);
const { pendingReviewIds } = await import(
  '../../../../src/content/programExclusions'
);
const { timedMovementCue } = await import(
  '../../../../src/content/timedMovement'
);
const { exerciseFingerprint } = await import(
  '../../../../src/figures/auditFingerprint'
);
const { applyEquipmentPose } = await import(
  '../../../../src/figures/equipmentPose'
);
const { demonstrationTiming, Figure, FigureFrame, movementPose } = await import(
  '../../../../src/figures/Figure'
);
const {
  defaultViewFor,
  frontMovementPose,
  obliqueMovementPose,
  supportedViewsFor,
} = await import('../../../../src/figures/frontViews');
const { figures } = await import('../../../../src/figures/poses');
const { heelSlidePose } = await import('../../../../src/figures/rehabPoses');
const { repTempo } = await import('../../../../src/rules/repTempo');

type View = 'side' | 'front' | 'oblique';
type Equip = 'dumbbell' | 'kettlebell' | 'band' | null | undefined;
type Side = 'right' | 'left' | null;

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

/** Segments measured (same pairs as the geometry ratchet). */
const SEGMENTS: [string, keyof Pose, keyof Pose][] = [
  ['head-neck', 'head', 'neck'],
  ['neck-hip', 'neck', 'hip'],
  ['upperArmR', 'neck', 'eR'],
  ['forearmR', 'eR', 'hR'],
  ['upperArmL', 'neck', 'eL'],
  ['forearmL', 'eL', 'hL'],
  ['thighR', 'hip', 'kR'],
  ['shinR', 'kR', 'aR'],
  ['footR', 'aR', 'tR'],
  ['thighL', 'hip', 'kL'],
  ['shinL', 'kL', 'aL'],
  ['footL', 'aL', 'tL'],
];
/** Right/left pairs for asymmetry (indexes into SEGMENTS). */
const ASYM: [number, number][] = [
  [2, 4],
  [3, 5],
  [6, 9],
  [7, 10],
  [8, 11],
];
const PHASES = [0, 0.25, 0.5, 0.75, 1];
const SAMPLES = Array.from({ length: 101 }, (_, i) => i / 100);
const FRONT_THIGH_MAX = 36;
const STILL_TOLERANCE = 2;
const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
const f1 = (n: number) => n.toFixed(1);
const equipName = (q: Equip) =>
  q === undefined ? 'default' : q === null ? 'none' : q;

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
  } catch {
    return '(git unavailable)';
  }
}

/** What the live loop draws at t (Figure.tsx: hold shows its end pose). */
function livePose(id: ExerciseId, t: number): Pose {
  const spec = figures[id];
  if (spec.motion === 'hold') return spec.end;
  return id === 'heel-slide' ? heelSlidePose(t, 'R') : movementPose(id, t);
}

/** Pose per phase for a view; side applies the equipment rewrite. */
function framesFor(id: ExerciseId, view: View, equip: Equip, side: Side) {
  return (t: number): Pose =>
    view === 'front'
      ? frontMovementPose(id as never, t, side)
      : view === 'oblique'
        ? obliqueMovementPose(id as never, t, side)
        : applyEquipmentPose(id, livePose(id, t), equip).p;
}

/** Equipment the app can pass: the catalogue default plus each variant's tool. */
function equipKinds(id: ExerciseId): Equip[] {
  const kinds = new Set<Equip>([undefined]);
  for (const v of exerciseMetadata[id].variants) {
    const tool = v.equipment.find(
      (q) =>
        q.type === 'dumbbell' || q.type === 'kettlebell' || q.type === 'band',
    )?.type as Equip;
    kinds.add(tool ?? null);
  }
  return [...kinds];
}

const sidesFor = (id: ExerciseId): Side[] =>
  exercises[id].perSide ? ['right', 'left'] : [null];

function lengths(make: (t: number) => Pose, ts: readonly number[]) {
  const poses = ts.map(make);
  return SEGMENTS.map(([, a, b]) => poses.map((p) => dist(p[a], p[b])));
}

function lengthTable(make: (t: number) => Pose): string {
  return lengths(make, PHASES)
    .map((v, i) => {
      const drift = Math.max(...v) - Math.min(...v);
      return `    ${(SEGMENTS[i]?.[0] ?? '').padEnd(10)} ${v.map((x) => f1(x).padStart(5)).join(' ')}  drift ${f1(drift)}`;
    })
    .join('\n');
}

// --- Reduced-motion stills vs the live loop (rendered SVG, as drawn) ---

let reducedMotion = false;
(globalThis as { window?: unknown }).window = {
  matchMedia: () => ({
    matches: reducedMotion,
    addEventListener() {},
    removeEventListener() {},
  }),
  location: { hash: '' },
};
const svgOf = (html: string) => html.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? '';
const numbers = (s: string) =>
  (s.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g) ?? []).map(Number);
/** Largest coordinate difference between two drawings; undefined if they differ in structure. */
function deviation(a: string, b: string): number | undefined {
  const x = numbers(a);
  const y = numbers(b);
  if (x.length !== y.length) return undefined;
  return x.reduce((m, v, i) => Math.max(m, Math.abs(v - (y[i] ?? 0))), 0);
}

/** How one still relates to the live loop. */
type StillResult = {
  label: string;
  /** The phase it should match (Start 0, Slut/Håll 1), if any. */
  expected?: number;
  direct?: number;
  /** Closest live phase and its difference, searched when `direct` fails. */
  nearest?: { t: number; dev: number };
  identicalTo?: string;
  flag: boolean;
};
const STILL_SEARCH = Array.from({ length: 41 }, (_, i) => i / 40);

function stillCheck(id: ExerciseId, view: View, equip: Equip, side: Side) {
  const props = { exerciseId: id, working: side, equipment: equip, view };
  reducedMotion = true;
  const reduced = renderToStaticMarkup(createElement(Figure, props));
  reducedMotion = false;
  const hold = figures[id].motion === 'hold';
  const cache = new Map<number, string>();
  // The live branch of Figure: FigureFrame with the live pose and phase.
  const live = (t: number) => {
    let svg = cache.get(t);
    if (svg === undefined) {
      svg = svgOf(
        renderToStaticMarkup(
          createElement(FigureFrame, {
            ...props,
            pose: livePose(id, t),
            phase: hold ? 1 : t,
          }),
        ),
      );
      cache.set(t, svg);
    }
    return svg;
  };
  const stills = [...reduced.matchAll(/<figure[\s\S]*?<\/figure>/g)].map(
    ([html]) => ({
      label: html.match(/<figcaption[^>]*>([^<]*)/)?.[1] ?? '?',
      svg: svgOf(html),
    }),
  );
  const out: StillResult[] = [];
  for (const [i, s] of stills.entries()) {
    const prev = stills[i - 1];
    if (prev && (deviation(prev.svg, s.svg) ?? 1) < 0.5) {
      out.push({ label: s.label, identicalTo: prev.label, flag: true });
      continue;
    }
    // A static hold live shows only its hold pose; its Start (or Vila) still is by design.
    if (hold && s.label !== 'Slut' && s.label !== 'Håll') continue;
    const expected =
      s.label === 'Start'
        ? 0
        : s.label === 'Slut' || s.label === 'Håll'
          ? 1
          : undefined;
    const direct =
      expected === undefined ? undefined : deviation(s.svg, live(expected));
    if (direct !== undefined && direct <= STILL_TOLERANCE) {
      out.push({ label: s.label, expected, direct, flag: false });
      continue;
    }
    let nearest: { t: number; dev: number } | undefined;
    const search = (ts: readonly number[]) => {
      for (const t of ts) {
        const dev = deviation(s.svg, live(t));
        if (dev !== undefined && (!nearest || dev < nearest.dev))
          nearest = { t, dev };
      }
    };
    search(hold ? [1] : STILL_SEARCH);
    // Fast phases (a jump) need a finer look around the coarse best phase.
    const coarse: { t: number; dev: number } | undefined = nearest;
    if (!hold && coarse && coarse.dev > STILL_TOLERANCE)
      search(
        Array.from({ length: 21 }, (_, k) => coarse.t + (k - 10) / 400).filter(
          (t) => t >= 0 && t <= 1,
        ),
      );
    out.push({
      label: s.label,
      expected,
      direct,
      nearest,
      flag: !nearest || nearest.dev > STILL_TOLERANCE,
    });
  }
  return { labels: stills.map((s) => s.label), out };
}

function stillText(r: StillResult): string {
  if (r.identicalTo) return `${r.label} same drawing as ${r.identicalTo} FLAG`;
  const at = (t: number) => `live ${Math.round(t * 1000) / 1000}`;
  const head =
    r.expected === undefined
      ? r.label
      : r.direct === undefined
        ? `${r.label}: ${at(r.expected)} drawn differently`
        : r.nearest
          ? `${r.label}: ${at(r.expected)} differs ${f1(r.direct)}`
          : `${r.label} = ${at(r.expected)} (${f1(r.direct)})`;
  if (!r.nearest) return r.expected === undefined ? `${head}: no match` : head;
  const near = `${at(r.nearest.t)} (${f1(r.nearest.dev)})`;
  return `${head}${r.expected === undefined ? ' =' : ', closest'} ${near}${r.flag ? ' FLAG' : ''}`;
}

// --- Scan: objective defects, one line per exercise ---

type Defect = { sev: number; text: string };
type Raw = {
  sev: number;
  where: string;
  what: string;
  kind: 'drift' | 'asym' | 'length' | 'stills';
  seg?: string;
};
/** --metric "asym:shin,front": a token matches a kind or view, then a segment. */
function matches(d: Raw, metric: string | undefined): boolean {
  if (!metric) return true;
  const view = d.where.split('/')[0];
  return metric.split(',').some((token) => {
    const [head = '', sub] = token.trim().split(':');
    return (
      (head === d.kind || head === view) &&
      (sub === undefined || (d.seg ?? '').includes(sub))
    );
  });
}
/** Merge defects that differ only in equipment or side ("side/default,dumbbell"). */
function merged(raw: Raw[]): Defect[] {
  const groups = new Map<
    string,
    { sev: number; view: string; tags: string[]; what: string }
  >();
  for (const d of raw) {
    const [view = '', ...rest] = d.where.split('/');
    const key = `${view}|${d.what}`;
    const g = groups.get(key) ?? { sev: d.sev, view, tags: [], what: d.what };
    const tag = rest.filter(Boolean).join('/');
    if (tag && !g.tags.includes(tag)) g.tags.push(tag);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    sev: g.sev,
    text: `${g.view}${g.tags.length ? `/${g.tags.join(',')}` : ''} ${g.what}`,
  }));
}

function defectsOf(id: ExerciseId, min: number, metric?: string): Defect[] {
  const raw: Raw[] = [];
  const views = supportedViewsFor(id) as readonly View[];
  const sideTag = (s: Side) => (s ? (s === 'right' ? 'H' : 'V') : '');
  let profileMax: number[] | undefined;
  for (const view of views)
    if (view === 'side')
      for (const eq of equipKinds(id)) {
        const ts = figures[id].motion === 'hold' ? [1] : SAMPLES;
        const l = lengths(framesFor(id, 'side', eq, null), ts);
        if (eq === undefined) profileMax = l.map((v) => Math.max(...v));
        const where = `side/${equipName(eq)}`;
        for (const [i, v] of l.entries()) {
          const drift = Math.max(...v) - Math.min(...v);
          if (drift > min)
            raw.push({
              sev: drift,
              where,
              what: `drift ${SEGMENTS[i]?.[0]} ${f1(drift)}`,
              kind: 'drift',
              seg: SEGMENTS[i]?.[0],
            });
        }
        for (const [r, lft] of ASYM) {
          const gap = Math.max(
            ...ts.map((_, k) =>
              Math.abs((l[r]?.[k] ?? 0) - (l[lft]?.[k] ?? 0)),
            ),
          );
          if (gap > min)
            raw.push({
              sev: gap,
              where,
              what: `asym ${SEGMENTS[r]?.[0]}/${SEGMENTS[lft]?.[0]} ${f1(gap)}`,
              kind: 'asym',
              seg: SEGMENTS[r]?.[0],
            });
        }
      }
    else
      for (const side of sidesFor(id)) {
        const l = lengths(framesFor(id, view, undefined, side), SAMPLES);
        const where = `${view}/${sideTag(side)}`;
        for (const [i, v] of l.entries()) {
          const name = SEGMENTS[i]?.[0] ?? '';
          const max = Math.max(...v);
          if (
            view === 'front' &&
            name.startsWith('thigh') &&
            max > FRONT_THIGH_MAX + 0.05
          )
            raw.push({
              sev: max - FRONT_THIGH_MAX,
              where,
              what: `${name} ${f1(max)} > ${FRONT_THIGH_MAX}`,
              kind: 'length',
              seg: name,
            });
          const prof = profileMax?.[i];
          if (prof !== undefined && max > prof + 1)
            raw.push({
              sev: max - prof,
              where,
              what: `${name} ${f1(max)} > profile ${f1(prof)}`,
              kind: 'length',
              seg: name,
            });
        }
      }
  for (const view of views)
    for (const eq of equipKinds(id))
      for (const side of view === 'side'
        ? sidesFor(id).slice(0, 1)
        : sidesFor(id))
        for (const r of stillCheck(id, view, eq, side).out)
          if (r.flag)
            raw.push({
              sev: r.identicalTo
                ? STILL_TOLERANCE
                : (r.nearest?.dev ?? r.direct ?? STILL_TOLERANCE),
              where: `${view}/${equipName(eq)}${side && view !== 'side' ? `/${sideTag(side)}` : ''}`,
              what: `still ${stillText(r)}`,
              kind: 'stills',
            });
  return merged(raw.filter((d) => matches(d, metric))).sort(
    (a, b) => b.sev - a.sev,
  );
}

function scan(ids: ExerciseId[], min: number, top: number, metric?: string) {
  console.log(
    `scan (working tree): side drift/asym > ${min}, front thigh > ${FRONT_THIGH_MAX}, front/oblique segment > profile + 1, still vs live > ${STILL_TOLERANCE} or two identical stills${metric ? `; only --metric ${metric}` : ''}. Worst first; numbers in figure units. Leads, not verdicts: confirm by eye.`,
  );
  const rows = ids
    .map((id) => ({ id, d: defectsOf(id, min, metric) }))
    .filter((r) => r.d.length > 0)
    .sort((a, b) => (b.d[0]?.sev ?? 0) - (a.d[0]?.sev ?? 0));
  for (const { id, d } of top > 0 ? rows.slice(0, top) : rows) {
    const [worst, ...rest] = d;
    console.log(
      `${f1(worst?.sev ?? 0).padStart(5)} ${exerciseReferences[id]} ${id} [${log.get(id)?.status ?? '?'}]: ${worst?.text}${
        rest.length
          ? ` (+${rest.length}: ${rest
              .slice(0, 2)
              .map((x) => x.text)
              .join('; ')}${rest.length > 2 ? '; ...' : ''})`
          : ''
      }`,
    );
  }
  console.log(
    `${rows.length} of ${ids.length} exercises have ${metric ? 'matching ' : ''}defects${top > 0 && rows.length > top ? `; top ${top} shown (--top 0 for all)` : ''}.`,
  );
}

// --- Is the figure identical at HEAD? (dirty tree) ---

/** Hash of what the figure draws: fingerprint, stills and five live phases per view, equipment and side. */
function figureDigest(id: ExerciseId): string {
  const h = createHash('sha256').update(exerciseFingerprint(id));
  const hold = figures[id].motion === 'hold';
  for (const view of supportedViewsFor(id) as readonly View[])
    for (const equipment of equipKinds(id))
      for (const working of sidesFor(id)) {
        const props = { exerciseId: id, working, equipment, view };
        reducedMotion = true;
        h.update(renderToStaticMarkup(createElement(Figure, props)));
        reducedMotion = false;
        for (const t of PHASES)
          h.update(
            renderToStaticMarkup(
              createElement(FigureFrame, {
                ...props,
                pose: livePose(id, t),
                phase: hold ? 1 : t,
              }),
            ),
          );
      }
  return h.digest('hex').slice(0, 12);
}

/** Digests at HEAD: `git archive` of src into a gitignored temp dir, this script run there. */
function headDigests(ids: ExerciseId[]): Map<string, string> | undefined {
  let dir: string | undefined;
  try {
    // Inside the repo, so node_modules resolves from the parent folders.
    const review = fileURLToPath(
      new URL('../../../../.impeccable/review/', import.meta.url),
    );
    mkdirSync(review, { recursive: true });
    dir = mkdtempSync(join(review, 'head-'));
    execFileSync('git', [
      'archive',
      '--format=tar',
      '-o',
      join(dir, 'head.tar'),
      'HEAD',
      'src',
      'docs/exercise-audit-log.json',
      'tsconfig.json',
      'package.json',
    ]);
    execFileSync('tar', ['-xf', 'head.tar'], { cwd: dir });
    const script = join(
      dir,
      '.agents/skills/exercise-review/scripts/inspect.ts',
    );
    mkdirSync(dirname(script), { recursive: true });
    copyFileSync(fileURLToPath(import.meta.url), script);
    // cwd = the copy, so tsx applies its tsconfig (react-jsx).
    const out = execFileSync(
      process.execPath,
      ['--import', 'tsx', script, '--digest', ...ids],
      {
        cwd: dir,
        encoding: 'utf8',
        timeout: 60_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return new Map(Object.entries(JSON.parse(out) as Record<string, string>));
  } catch {
    return undefined;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

/** Neutral start-pose facts. Does not guess standing/seated: read the numbers. */
function describeStart(p: Pose): string {
  return `hip y ${f1(p.hip[1])}, knee y ${f1(p.kR[1])}, ankle y ${f1(p.aR[1])}, toe y ${f1(p.tR[1])} (floor is y 178; ankle-to-floor ${f1(178 - p.aR[1])}; hip above ankle ${f1(p.aR[1] - p.hip[1])}). A foot clearly above 178 is on a step or lifted; judge the pose from the figure, not from these numbers alone`;
}

const argv = process.argv.slice(2);
const toId = (arg: string) =>
  (byRef.get(arg.toUpperCase()) ?? arg) as ExerciseId;
const VALUED = ['--min', '--top', '--metric'];
const opt = (name: string) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
};
const args = argv.filter(
  (a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1] ?? ''),
);
if (args.length === 0 && !argv.includes('--scan')) {
  console.log(
    'Usage: npx tsx .agents/skills/exercise-review/scripts/inspect.ts [--no-head] <id|E-ref> ...\n       ... inspect.ts --scan [--min 5] [--top 15] [--metric asym:shin,front,stills] [<id|E-ref> ...]',
  );
  process.exit(1);
}

if (argv.includes('--digest')) {
  // Internal: run by headDigests() inside a HEAD copy.
  console.log(
    JSON.stringify(
      Object.fromEntries(args.map((a) => [a, figureDigest(a as ExerciseId)])),
    ),
  );
  process.exit(0);
}

if (argv.includes('--scan')) {
  const named = args.map(toId).filter((id) => exercises[id]);
  scan(
    named.length ? named : exerciseList.map((e) => e.id as ExerciseId),
    Number(opt('--min') ?? 5),
    Number(opt('--top') ?? 15),
    opt('--metric'),
  );
  process.exit(0);
}

console.log(
  `HEAD ${git(['rev-parse', '--short', 'HEAD'])} on ${git(['branch', '--show-current']) || '(detached)'}`,
);
const figureArea = ['src/content', 'src/figures', 'src/rules'];
const figureDirty = git(['status', '--short', '--', ...figureArea]);
const known = args.map(toId).filter((id) => exercises[id]);
const atHead =
  figureDirty && !argv.includes('--no-head') ? headDigests(known) : undefined;

for (const arg of args) {
  const id = toId(arg);
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
  const head = !figureDirty
    ? 'yes (figure sources clean)'
    : argv.includes('--no-head')
      ? 'unknown (--no-head)'
      : !atHead?.get(id)
        ? 'unknown (HEAD copy failed)'
        : atHead.get(id) === figureDigest(id)
          ? 'yes'
          : 'no (the working tree draws this figure differently from HEAD)';
  console.log(
    `HEAD figure identical: ${head} (fingerprint, stills and live phases, every view, side and variant; state it in notes)`,
  );
  console.log(
    `unit ${e.unit}, range ${JSON.stringify(e.range)}, perSide ${e.perSide}${e.sideKind ? ` (${e.sideKind})` : ''}, kneeLoaded ${e.kneeLoaded}${timedKind ? `, ${timedKind}` : ''}`,
  );
  const views = supportedViewsFor(id) as readonly View[];
  console.log(
    `motion ${spec.motion ?? 'controlled (default)'}; views ${views
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
  for (const s of meta.sources)
    console.log(
      `source: ${s.publisher}, ${s.title}${s.url ? ` ${s.url}` : ''}; ${s.note}`,
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
      `  start: "${e.perSide ? '<side>. ' : ''}Gör dig redo. Fem sekunder." then "${tempo.hasHold ? `Börja. ${tempo.cues?.up ?? 'Upp'}.` : 'Börja.'}"; count "1", "2", ...${tempo.hasHold ? ` with "${tempo.cues?.up ?? 'Upp'}"/"${tempo.cues?.hold ?? 'Håll'}"/"${tempo.cues?.down ?? 'Ner'}"` : ''}; end "Klart."`,
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
  const first = views[0] ?? 'side';
  const startPose = framesFor(id, first, undefined, 'right')(0);
  console.log(
    `phase 0 pose (${first} view, default equipment; raw numbers, no standing/seated guess): ${describeStart(startPose)}`,
  );
  const kinds = equipKinds(id);
  if (kinds.every((q) => q == null))
    console.log(
      'U: n/a (no dumbbell, kettlebell or band variant; props and floor contact count under AS/AF)',
    );
  console.log(
    `segment lengths per phase (${PHASES.join(' / ')}); side view per equipment (default = catalogue default as in the ratchet, none = bodyweight variant), front/oblique per side (FrontFigureFrame draws their equipment internally: check grips there by eye). Front/oblique lengths are projections: shorter than profile is expected, longer is a defect; front thigh limit ${FRONT_THIGH_MAX}:`,
  );
  for (const view of views) {
    const seen = new Map<string, string>();
    const runs: [string, (t: number) => Pose][] =
      view === 'side'
        ? kinds.map((q) => [
            `side, equipment ${equipName(q)}`,
            framesFor(id, view, q, null),
          ])
        : sidesFor(id).map((s) => [
            `${view}, side ${s ?? 'both'}`,
            framesFor(id, view, undefined, s),
          ]);
    for (const [label, make] of runs) {
      const table = lengthTable(make);
      const same = seen.get(table);
      if (same) console.log(`  ${label}: same as ${same}`);
      else console.log(`  ${label}:\n${table}`);
      seen.set(table, same ?? label);
    }
  }
  console.log(
    `reduced-motion stills vs live loop (rendered SVG, max coordinate difference in units; Start should equal live 0, Slut/Håll live 1 or the hold; FLAG = no live phase within ${STILL_TOLERANCE}; side V mirrors H):`,
  );
  for (const view of views) {
    const groups = new Map<string, string[]>();
    for (const q of kinds)
      for (const s of view === 'side'
        ? sidesFor(id).slice(0, 1)
        : sidesFor(id)) {
        const { labels, out } = stillCheck(id, view, q, s);
        const text = `stills ${labels.join(', ')}; ${out.map(stillText).join('; ') || 'nothing to compare'}`;
        const tag = `${equipName(q)}${s && view !== 'side' ? `/${s === 'right' ? 'H' : 'V'}` : ''}`;
        groups.set(text, [...(groups.get(text) ?? []), tag]);
      }
    for (const [text, tags] of groups)
      console.log(`  ${view} (${tags.join(', ')}): ${text}`);
  }
  const rows = Object.entries(baseline).filter(([k]) => k.startsWith(`${id}|`));
  console.log(
    `geometry baseline rows (default equipment, right side): ${rows.length ? '' : 'none'}`,
  );
  for (const [k, v] of rows) console.log(`  ${k.slice(id.length + 1)}: ${v}`);
  console.log(
    `beginner set: ${beginnerExerciseIds.has(id)}; pending review: ${pendingReviewIds.has(id)}`,
  );
  const fp = exerciseFingerprint(id);
  console.log(
    `fingerprint now ${fp}; in log ${entry?.fingerprint ?? 'none'}${entry && entry.fingerprint !== fp ? ' (differs: the figure changed since the log was written)' : ''}`,
  );
  if (entry) {
    const fix = entry.fixes.at(-1);
    console.log(
      `audit: risk ${entry.risk}, status ${entry.status}, ${entry.reviews.length} reviews, last fix ${fix ? `${fix.date} by ${fix.fixer}` : 'none'}`,
    );
    const sameDay = fix ? entry.reviews.filter((r) => r.date === fix.date) : [];
    if (sameDay.length)
      console.log(
        `  ${sameDay.length} review(s) dated the same day as the last fix: the gates count them as after the fix; check their commit and the fix notes`,
      );
    for (const r of entry.reviews.slice(-3))
      console.log(
        `  review ${r.date} ${r.reviewer} ${r.scope} ${r.result}${r.commit ? ` @${r.commit}` : ''}`,
      );
    if (fix) console.log(`  last fix notes: ${fix.notes}`);
    for (const i of entry.openIssues) console.log(`  open: ${i}`);
  }
}
