# Stomme: MVP build plan

Author: architect-einstein, saved 2026-10-18. Source: `docs/spec.md`. Greenfield repo.
Scope: 10 exercises (+ optional wall sit), Android Chrome PWA, local data only, no sync/Garmin/accounts. UI text Swedish; code, identifiers, comments English.

## 1. Stack
Kept: Vite + `@vitejs/plugin-react`, React 19, TypeScript strict (`noUncheckedIndexedAccess`), Tailwind v4 (`@tailwindcss/vite`, tokens as CSS vars in `@theme`, `dark:` follows `prefers-color-scheme`, no theme toggle in MVP), Dexie 4 + `dexie-react-hooks`, `vite-plugin-pwa` (`generateSW`, `registerType: 'prompt'`), Vitest (node; `fake-indexeddb` for DB; jsdom only for few component tests).

Changes/additions:
- Hand-rolled SVG charts instead of Recharts (3 simple charts; Recharts costs ~100 KB+ gz; pure scale functions are testable).
- `wouter` with `useHashLocation` (no 404 on Pages, simpler SW fallback).
- `zod` v4 to validate JSON import (untrusted).
- Biome instead of ESLint+Prettier. `npm run check` = `biome check && tsc --noEmit`.
- Playwright locally (not in CI) for milestone screenshots at 360x800 and 412x915, light and dark, plus a smoke flow.
- `@vite-pwa/assets-generator` for icons from one SVG.
- No state library (`useLiveQuery` + `useReducer`). Session resume is derived from DB (plan snapshot + logs).
- Static content (exercises, templates) as typed TS constants, not in DB. A Session stores a plan snapshot so history survives content edits.
- Pain values live only in PainLog; session-level values derived via `sessionId`.
- No date library: local `YYYY-MM-DD` strings, `Intl.DateTimeFormat('sv-SE')`, small tested helper.
- Font: system stack or one self-hosted variable font (e.g. Atkinson Hyperlegible Next; /impeccable decides). Never a CDN.

Node 24 LTS, npm, commit `package-lock.json`. Bundle target < 150 KB gz JS.
Runtime deps: react, react-dom, dexie, dexie-react-hooks, wouter, zod. Dev: vite, @vitejs/plugin-react, typescript, tailwindcss, @tailwindcss/vite, vite-plugin-pwa, @vite-pwa/assets-generator, vitest, fake-indexeddb, jsdom, @testing-library/react, @biomejs/biome, @playwright/test.

## 2. Repo layout
```
.github/workflows/deploy.yml
docs/spec.md, docs/plan.md
public/ favicon.svg, icon-source.svg
scripts/screenshots.ts
tests/e2e/smoke.spec.ts
src/
  main.tsx, App.tsx, routes.tsx
  content/ exercises.ts, templates.ts, copy.ts
  domain/types.ts
  rules/ pain, progression, schedule, sessionPlan, stats (+ .test.ts each)   PURE
  lib/ dates.ts(+test), wakeLock.ts, haptics.ts, storage.ts, share.ts
  db/ db.ts, repo.ts(+test), backup.ts(+test)
  features/ week, session, exercise, pain, history, settings, onboarding
  ui/ Button, Stepper, Ring, PainScale, Sheet, BottomNav, Banner
  figures/ Figure.tsx, poses.ts, props.tsx, lerp.ts(+test)
  charts/ scales.ts(+test), BarChart, StepLineChart, PainChart
  styles/index.css
biome.json, tsconfig*.json, vite.config.ts, vitest.config.ts, playwright.config.ts
```
Hard rule: `src/rules/**` must not import react, dexie, src/db, src/features (Biome `noRestrictedImports`). "Now" is always a parameter.

## 3. Hosting: GitHub Pages at stomme.tengmo.com
- `base: process.env.VITE_BASE ?? '/'` (use `/Stomme/` only if github.io URL is needed before DNS).
- With an Actions deploy a `CNAME` file is ignored: set the domain in repo Settings, Pages. Do not add `public/CNAME`.
- Manual steps for Magnus:
  1. DNS: `stomme  CNAME  mtengmo.github.io.`
  2. Repo Settings, Pages: Source = GitHub Actions; Custom domain = `stomme.tengmo.com`.
  3. After the certificate is issued, tick Enforce HTTPS (required for SW, install, wake lock, randomUUID).
  4. Recommended: verify `tengmo.com` under account Settings, Pages (TXT record) to prevent subdomain takeover.
  5. Pages from a private repo needs a paid plan; check visibility (default: public, no personal data in the repo).
- IndexedDB is per origin: data entered on github.io will not appear on stomme.tengmo.com. Only use the app for real on the final domain.

Workflow `deploy.yml` (bump actions to latest majors when implementing): on push to main / PR / dispatch; `permissions: contents: read`; job `build`: checkout, setup-node 24 (cache npm), `npm ci`, `npm run check`, `npm test`, `npm run build`, upload-pages-artifact (main only); job `deploy` (main only, needs build, `pages: write`, `id-token: write`, environment github-pages) with deploy-pages. Playwright not in CI for MVP.

## 4. Data model
### 4.1 Static content types (`src/domain/types.ts`)
```ts
type ExerciseId = 'goblet-chair-squat' | 'step-up' | 'single-leg-rdl' | 'dead-bug' | 'side-plank'
  | 'split-squat' | 'single-leg-hip-thrust' | 'single-leg-calf-raise' | 'suitcase-carry' | 'bird-dog' | 'wall-sit';
type Unit = 'reps' | 'seconds' | 'meters';
type SideKind = 'ben' | 'sida' | 'hand';
interface Load { kg: number; label: string }            // kg = total external load (2x5 kg -> 10)
interface Exercise {
  id: ExerciseId; name: string; muscles: string[];
  tips: [string, string, string]; commonMistake: string; easierVariant: string;
  unit: Unit; perSide: boolean; sideKind?: SideKind;
  range: { start: number; max: number; step: number };
  loadLadder: Load[];          // light -> heavy; index 0 may be bodyweight (kg 0)
  startLoadIndex: number;      // used from week 2
  week1LoadIndex: number;      // "första veckan kroppsvikt"
  kneeLoaded: boolean;         // gated by pain rule
  optional?: boolean;
}
interface TemplateItem { exerciseId: ExerciseId; sets: number; restSec: number }
interface WorkoutTemplate { id: 'A' | 'B'; name: string; items: TemplateItem[] }
```
### 4.2 User data (Dexie)
```ts
type SessionStatus = 'in_progress' | 'completed' | 'aborted';
type Effort = 'easy' | 'ok' | 'hard';                    // Lätt / Lagom / Tungt
interface PlannedExercise { exerciseId; sets; target; loadIndex; weightKg; restSec; reason: ReasonCode }
interface Session { id: string /*randomUUID*/; templateId: 'A'|'B'; date: string; startedAt: string; finishedAt?: string;
  status: SessionStatus; abortReason?: 'pain_stop'|'user'; programWeek: number;
  plan: PlannedExercise[]; feedback: Partial<Record<ExerciseId,{effort?: Effort; skipped?: boolean}>>; note?: string }
interface SetLog { id; sessionId; exerciseId; setNumber /*1-based*/; side: 'right'|'left'|'both';
  amount: number /*reps|seconds|meters*/; loadIndex; weightKg /*denormalised*/; loggedAt }
interface PainLog { id; sessionId; date; timing: 'before'|'after'|'dayAfter'; score: number /*int 0-10*/;
  location: 'right_knee'; redFlags: { sharp; swelling; locking }; createdAt }
interface MetaEntry { key: 'program'|'onboarding'|'backup'; value: unknown }
// program: { startDate }  onboarding: { acceptedAt }  backup: { lastExportAt }
```
### 4.3 Dexie schema
```ts
this.version(1).stores({
  sessions: 'id, date, status, templateId',
  setLogs:  'id, sessionId, [exerciseId+loggedAt]',
  painLogs: 'id, sessionId, date, [sessionId+timing]',
  meta:     'key',
});
```
Each set is written the moment "Klar set" is tapped. Future changes via `version(n).stores().upgrade()`. Backups carry `schemaVersion`.

### 4.4 Seed exercises
| id | name (sv) | unit | perSide | range start-max/step | loadLadder (kg) | start idx | wk1 idx | knee |
|---|---|---|---|---|---|---|---|---|
| goblet-chair-squat | Sitta ner och resa sig från stol (goblet) | reps | no | 10-12/1 | Kroppsvikt 0; 10 kg hantel mot bröstet 10; 16 kg kettlebell 16 | 1 | 0 | yes |
| step-up | Step-up (20–30 cm) | reps | ben | 8-12/1 | Kroppsvikt 0; 2×5 kg 10; 2×10 kg 20 | 1 | 0 | yes |
| single-leg-rdl | Enbens rumänskt marklyft | reps | ben | 8-12/1 | Kroppsvikt 0; 1×10 kg hantel 10; 16 kg kettlebell 16 | 1 | 0 | yes |
| dead-bug | Dead bug | reps | sida | 8-12/1 | Kroppsvikt 0 | 0 | 0 | no |
| side-plank | Sidoplanka | seconds | sida | 20-30/5 | Kroppsvikt 0 | 0 | 0 | no |
| split-squat | Split squat (stöd vägg/stol) | reps | ben | 8-12/1 | Kroppsvikt 0; 2×5 kg 10; 2×10 kg 20 | 1 | 0 | yes |
| single-leg-hip-thrust | Enbens bäckenlyft | reps | ben | 10-12/1 | Kroppsvikt 0; 10 kg på höften 10; 16 kg kettlebell på höften 16 | 1 | 0 | yes |
| single-leg-calf-raise | Enbens tåhävning | reps | ben | 12-12/1 | Kroppsvikt 0; 1×10 kg hantel 10 | 0 | 0 | yes |
| suitcase-carry | Väskbärning (suitcase carry) | meters | hand | 20-30/5 | 10 kg hantel 10; 16 kg kettlebell 16 | 1 | 0 (Q1) | no |
| bird-dog | Bird dog | reps | sida | 8-12/1 | Kroppsvikt 0 | 0 | 0 | no |
| wall-sit (optional) | Väggsittning | seconds | no | 30-30/5 | Kroppsvikt 0 | 0 | 0 | yes |

Swedish text (muscles / 3 tips, first = spec's "Tänk på" / common mistake / easier variant). Magnus reviews; physio sees the programme.
- **goblet-chair-squat**: Framsida lår, säte, bål. "Sätt dig på stolen – knäna följer tårnas riktning" / "Håll hanteln tätt mot bröstet" / "Sänk dig på 3 sekunder, res dig med tryck genom hela foten". Fel: "Knäna faller inåt när du reser dig." Enklare: "Utan vikt med armarna i kors, eller sätt en kudde på stolen."
- **step-up**: Framsida lår, säte. "Höger ben jobbar hela vägen upp, sänk långsamt" / "Hela foten på steget" / "Skjut inte ifrån med det nedre benet". Fel: "Knäet faller inåt eller du studsar ifrån med bakre foten." Enklare: "Lägre steg (10–15 cm) utan hantlar, håll i väggen."
- **single-leg-rdl**: Baksida lår, säte, balans. "Rak rygg, höften bakåt, lätt böjt knä" / "Bakre benet lyfts i linje med ryggen" / "Vikten nära benet". Fel: "Ryggen rundas och vikten hamnar på tårna." Enklare: "Stöd en hand mot stol, eller låt bakre tån vila i golvet."
- **dead-bug**: Djupa bålmuskler, magmuskler. "Ländryggen kvar i golvet" / "Sträck motsatt arm och ben långsamt" / "Andas ut när du sträcker". Fel: "Svanken lyfter när benet sträcks ut." Enklare: "Rör bara benen, med böjt knä."
- **side-plank**: Sneda magmuskler, sidan av höften. "Rak linje huvud–fot" / "Armbågen rakt under axeln" / "Pressa upp höften". Fel: "Höften sjunker eller skjuts bakåt." Enklare: "Från knäna i stället för fötterna."
- **split-squat**: Framsida lår, säte. "Kort steg, bakre knäet mot golvet med kontroll" / "Höger fot fram först" / "Upprätt överkropp, ta stöd i vägg/stol". Fel: "Främre knäet faller inåt eller hälen lyfter." Enklare: "Utan hantlar, kortare rörelse, håll med båda händerna."
- **single-leg-hip-thrust**: Säte, baksida lår. "Pressa upp med klacken, inte ländryggen" / "Spänn sätet i toppen" / "Håll bäckenet rakt". Fel: "Svanken ökar i toppen." Enklare: "Båda fötterna i golvet (vanligt bäckenlyft)."
- **single-leg-calf-raise**: Vader. "Hela rörelsen upp och ner" / "Håll i väggen för balans" / "Sänk långsamt". Fel: "Korta, snabba studsar." Enklare: "Båda fötterna samtidigt."
- **suitcase-carry**: Bål (sneda magmuskler), grepp, höft. "Stå rak, luta dig inte åt sidan" / "Armen rak, axeln ner" / "Lugna, korta steg". Fel: "Överkroppen lutar mot vikten." Enklare: "Lättare vikt eller kortare sträcka."
- **bird-dog**: Ryggmuskler, säte, bål. "Höften stilla, långsam rörelse" / "Händer under axlar, knän under höfter" / "Sträck motsatt arm och ben". Fel: "Höften vrids eller svanken ökar." Enklare: "Lyft bara benet, eller bara armen."
- **wall-sit**: Framsida lår. "Ryggen mot väggen" / "Knäna ovanför fotlederna" / "Välj ett djup som känns okej". Fel: "Knäna hamnar framför tårna." Enklare: "Högre position (mindre böj i knäna)."

Session screen shows global cues "Sänk på 3 sekunder" and "Börja med höger".

### 4.5 Templates
- A: goblet-chair-squat 2, step-up 2, single-leg-rdl 2, dead-bug 2, side-plank 2. Rest 60 s.
- B: split-squat 2, single-leg-hip-thrust 2, single-leg-calf-raise 2, suitcase-carry 3, bird-dog 2. Rest 60 s.
Target = `range.start`; weight from ladder via progression rules.

## 5. Pure rules modules (`src/rules/`)
Rules return reason codes, never Swedish; `copy.ts` maps codes to text.

### 5.1 pain.ts
```ts
const PAIN_OK_MAX = 3; type PainStatus = 'ok'|'warn'|'stop';
type PainReason = 'red_flag'|'above_threshold'|'worse_than_previous_day';
assessReading(r, reference?) ; assessSession(readings) /* worst wins */ ; dayAfterReference(readings) /* 'after' ?? 'before' */ ;
shouldPromptDayAfter(session, readings, today) ; isValidScore(n) /* int 0..10 */
```
Rules: any red flag = stop; score > 3 = warn; dayAfter higher than same session's `after` (fallback `before`) = warn. No other thresholds or advice; warn/stop copy includes "Fråga fysioterapeuten".
Tests: 0–3 each ok (3 boundary); 4 warn, 10 warn (only red flags stop); each red flag alone with score 0 = stop; 5 + swelling = stop with both reasons; dayAfter 3 vs after 2 = warn (worse_than_previous_day); 2 vs 2 ok; 1 vs 2 ok; dayAfter 2 with no after and before 1 = warn; no reference = threshold only; dayAfter 5 vs after 2 = both reasons; assessSession stop > warn > ok, empty = ok; isValidScore (-1, 11, 2.5, NaN false; 0, 10 true); shouldPromptDayAfter (completed yesterday no dayAfter true; same day false; already logged false; pain_stop yesterday true; 1–2 days ago true, 3+ false; newer session started false); date boundaries (23:50 session answered 00:10) and DST 2026-10-25 Europe/Stockholm.

### 5.2 progression.ts
```ts
type ReasonCode = 'first_time'|'week1_bodyweight'|'start_load'|'added_set'|'increase_amount'|'next_load'
  |'hold_incomplete'|'hold_hard'|'hold_not_easy_at_max'|'hold_waiting_for_3_sets'|'max_level'|'pain_hold'|'pain_stop_hold';
interface LastResult { plan: PlannedExercise; logs: SetLog[]; feedback?: {effort?; skipped?}; sessionPain: PainStatus }
interface Suggestion { sets; target; loadIndex; weightKg; reason; seePhysio: boolean }
setsForWeek(templateSets, programWeek)  // week >= 3 -> max(templateSets, 3)
suggestNext(ex, templateSets, programWeek, last?)
```
Algorithm in order; never change more than one variable (sets, amount, load) per step:
1. programWeek 1: `week1LoadIndex`, `range.start`, template sets (`first_time`/`week1_bodyweight`).
2. No `last`: week-appropriate load (start load from week 2), `range.start`, `setsForWeek` (`first_time`).
3. Pain gate, only if `kneeLoaded`: `stop` -> repeat last plan, `pain_stop_hold`, `seePhysio=true`; `warn` -> repeat last plan, `pain_hold`. Also blocks week-based set increase. Never lowers load automatically.
4. Last session week 1 and now week 2+: switch to start load, reset to `range.start` (`start_load`).
5. `setsForWeek` > last sets: add set, keep amount/load (`added_set`).
6. Skipped, or any set on any side below target: hold (`hold_incomplete`); per-side uses minimum across sides.
7. Effort `hard`: hold (`hold_hard`).
8. Target below `range.max`: `target + step` capped (`increase_amount`).
9. At max: sets < 3 hold (`hold_waiting_for_3_sets`); effort not `easy` hold (`hold_not_easy_at_max`); next ladder load exists -> move and reset to `range.start` (`next_load`); else hold (`max_level`).
10. Base is what was actually logged (user's chosen loadIndex). Load picker offers ladder steps only.
Tests (table-driven): week 1 goblet 2x10 bodyweight, carry 3x20 m at 10 kg; week 2 no history goblet 2x10 at 10 kg; week1->week2 step-up 2x8 at 2×5 kg (reps reset); week 2->3 add set; 2x8 ok -> 2x9; hard hold; 7/8 hold and right 8/left 7 hold; skipped hold; at 12 with 2 sets easy waits; 3x12 ok holds; 3x12 easy goblet 10->16 kg reps 10, step-up 2×5->2×10 reps 8; max_level at goblet 16 kg and dead bug; side plank 20->25->30 then max_level; carry 3x30 easy 10->16 kg at 20 m, 16 kg max_level; calf raise 3x12 easy -> 10 kg step at 12, waits at 2 sets; pain warn knee-loaded split squat repeats exactly (no week-3 set); pain warn bird dog progresses normally; pain stop knee-loaded hold + seePhysio; logged load differs from suggestion -> base is logged; property test: at most one of sets/target/loadIndex changes and load never decreases; purity.

### 5.3 schedule.ts
`nextTemplate(sessions)` (alternates over completed; aborted repeats same), `earliestNext` (last completed finishedAt + 48 h), `restStatus(sessions, now)`, `programWeek(startDate, today)` = floor(days/7)+1 local dates, `weekDays(today)` Monday-first, `weekSummary`.
Tests: none -> A; A done -> B; A aborted -> A; 47h59m not ok, 48h ok; programWeek day 1 / +6 -> 1 / +7 -> 2 / +14 -> 3 across 2026-10-25 DST; Sunday weekDays starts six days earlier; year boundary. The 48 h rule is advisory ("Vila – tidigast tors kl 18"), never blocks. `startDate` = date of first started session.

### 5.4 sessionPlan.ts
`buildSteps(plan, catalog)` -> steps `set | rest | effort`; `resumeIndex(steps, logs, feedback)`. Per-side: right then left per set, no rest between sides, rest after left. No rest after last set of last exercise; effort step after each exercise's last set. Tests: A order in week 1, B carry 3 sets, rest placement, resume after 0/3/all logged, skipped exercise moves cursor.

### 5.5 stats.ts (M5)
`weeklyVolume` ({weekStart, sets, tonnageKg}[], zero-filled), `loadPerExercise`, `painSeries`. Tests: empty, gaps, sorting, per-side sets counted once per set number.

## 6. Screens and routes (hash)
| Route | Screen |
|---|---|
| `#/` | Week view: Monday-first strip; Pass A/B cards with ring; "Nästa" marker; rest status; day-after pain prompt; "Fortsätt passet" |
| `#/pass/:templateId` | Pass preview: exercises with today's prescription + reason; "Starta pass" |
| `#/session/:id` | Session mode, full screen, no bottom nav: pain before, [set, rest, ..., effort] per exercise, pain after, summary |
| `#/ovning/:exerciseId` | Exercise card (also a sheet from session "Hur gör man?") |
| `#/smarta/:sessionId/:timing` | Pain entry (0–10 buttons, three red-flag toggles) |
| `#/historik`, `#/historik/:sessionId` | History + charts; session detail (delete with confirm) |
| `#/installningar` | Export/import, storage, install, update, about/disclaimer, delete all |
| `#/dev/figurer` | DEV only: all poses |

Bottom nav: Vecka, Historik, Inställningar (hidden in session). `display: standalone`. One-handed: primary action in bottom third, height ≥ 56 px; targets ≥ 48 px; no swipe-only/long-press-only; 5 s "Ångra" snackbar after each set; confirm only for destructive actions.

## 7. Milestones
Model key: H = Haiku, S = Sonnet, O = Opus (architect-einstein / reviewer). **[IMP]** = GUI task, must go through /impeccable.
Definition of done per milestone: CI green; deployed to Pages; `npm run shots` produces screenshots (360x800 and 412x915, light/dark); Magnus tried it on his phone.

### M1: Skeleton and data
| # | Task | Model | Acceptance |
|---|---|---|---|
| 1.1 | Scaffold Vite+React+TS strict+Tailwind v4+Biome+Vitest; scripts dev/build/preview/check/test/shots | H | check/test/build pass on clean clone |
| 1.2 | deploy.yml, `VITE_BASE`, README with DNS/Pages steps | H | Push to main deploys; PRs build/test only |
| 1.3 | types, exercises, templates seed | S | Typechecks; test: 11 exercises, templates resolve, ladders non-decreasing, start idx in range, 3 tips |
| 1.4 | `lib/dates.ts` + tests | S | DST 2026-10-25 and year boundary covered |
| 1.5 | `rules/schedule.ts` + tests | S | 5.3 tests pass |
| 1.6 | `db.ts`, `repo.ts` (create/list sessions, meta) + fake-indexeddb tests | S | Fresh DB name per test |
| 1.7 | [IMP] Design tokens, app shell, bottom nav, Button/Ring/Banner | S | Light/dark by system; text ≥ 16 px; targets ≥ 48 px; contrast ≥ 4.5:1 body, ≥ 3:1 large/UI |
| 1.8 | [IMP] Week view (CTA to pass preview stub) | S | Current week, A/B cards, next marked; state by icon+label+colour (green+check+"Klar", yellow+"Idag", grey "Kommande"); works with empty DB |
| 1.9 | Onboarding/disclaimer once (not medical advice; show programme to physio, esp. step-up/split squat; stop on sharp pain, swelling, locking) | S [IMP-light] | Shown first launch only; stored in meta |

### M2: Session mode
| # | Task | Model | Acceptance |
|---|---|---|---|
| 2.1 | `sessionPlan.ts` + tests | S | 5.4 tests pass |
| 2.2 | Interim prescription: target=start, load from week, sets=`setsForWeek`; prefill last logged | S | Preview correct for week 1 and 2+ (M4 swaps in `suggestNext`) |
| 2.3 | Repo: startSession (snapshot; sets `program.startDate` on first), logSet, undoLastSet, setFeedback, finishSession, abortSession, getActiveSession + tests | S | One transaction per set; killed tab resumes at correct step |
| 2.4 | `wakeLock.ts` (re-acquire on visibilitychange, no-op if unsupported), `haptics.ts` | S | Screen stays on through 30 min on Android Chrome; no errors on desktop Firefox |
| 2.5 | Rest timer hook on timestamps (`endsAt`); +15 s; skip; vibrate at 0 | S | Correct after 30 s backgrounded; fake-timer test |
| 2.6 | [IMP] Session screens: set (name, small figure placeholder, "Set 1 av 2 · Höger ben", big steppers, "Klar set"), rest (big countdown ring, next up), effort (Lätt/Lagom/Tungt), summary; skip exercise; abort; elapsed time | S | Pass A completable one-handed with only "Klar set"; timed side plank optional hold countdown; carry in meters; Ångra works |
| 2.7 | `vite-plugin-pwa` precache + `navigateFallback` | H | Airplane mode after one load: app works, session completable |
| 2.8 | Playwright smoke (Pixel viewport) + `scripts/screenshots.ts` | S | `npm run shots` writes gitignored `screenshots/` |

### M3: Exercise cards and SVG illustrations
| # | Task | Model | Acceptance |
|---|---|---|---|
| 3.1 | [IMP] `figures/` parametric renderer: pose = joint coords in 200x200 viewBox, rounded strokes, props (chair, step, wall, floor, dumbbell, kettlebell, mat); `lerp.ts` + tests | S | Consistent stroke; tween ~1.6 s ease-in-out, 0.8 s hold; reduced motion = two static frames "Start"/"Slut"; working right side in accent colour AND an "H" marker |
| 3.2 | Poses for 11 exercises (start/end) + `#/dev/figurer` | S (O reviews screenshots) | Each recognisable in side view; Magnus approves; text fallback if a pose is wrong |
| 3.3 | [IMP] Exercise card: name, muscle chips, figure, 3 tips, "Vanligt fel", "Enklare variant", "Fråga fysioterapeuten" footnote for step-up/split squat | S | Reachable from pass preview, session (sheet keeps state), exercise list |
| 3.4 | Swedish copy proofreading of exercises.ts + copy.ts | H | No English in UI; consistent terms |

### M4: Pain log and progression
| # | Task | Model | Acceptance |
|---|---|---|---|
| 4.1 | `pain.ts` + tests | S | 100% branch coverage |
| 4.2 | `progression.ts` + tests | S | 100% branch coverage; invariant test passes |
| 4.3 | Review rules + tests vs spec | O (reviewer) | Written sign-off; ambiguities in section 12 |
| 4.4 | [IMP] Pain UI: 0–10 picker (11 buttons ≥ 48 px, anchors "Ingen"/"Värsta"), red-flag toggles, `before` gate, `after` at end, day-after prompt on week view | S | Red flag -> stop screen ("Avbryt passet. Fråga fysioterapeuten."), session aborted `pain_stop`, logs kept; > 3 -> warning with "Fortsätt ändå"/"Avsluta" and wall-sit option; day-after worse -> warning card |
| 4.5 | [IMP] Wire `suggestNext` into preview + prefill; "Förra gången: 2×8 · 2×5 kg" / "Idag: 2×9 · 2×5 kg" + one-line reason | S | Prefill = suggestion; overridable; override becomes next base |
| 4.6 | Banner after `pain_stop` until next session: "Senast stoppade du pga knäet. Fråga fysioterapeuten innan nästa pass." | S | On week view and pass preview |

### M5: History and charts
| # | Task | Model | Acceptance |
|---|---|---|---|
| 5.1 | `stats.ts` + tests; `charts/scales.ts` + tests | S | Pass |
| 5.2 | [IMP] SVG `BarChart` (sets/week, 12 weeks), `StepLineChart` (load per exercise, chips), `PainChart` (distinct shapes + colours, shaded 0–3 "Okej-zon") | S | Text summary + "Visa som tabell" toggle; works at 360 px; dark mode readable |
| 5.3 | [IMP] History screen: charts, sessions by week, detail, delete (confirm) | S | Delete removes sets and pain logs in one transaction |

### M6: PWA and finish
| # | Task | Model | Acceptance |
|---|---|---|---|
| 6.1 | Manifest: name/short_name "Stomme", lang sv, id/start_url/scope "/", standalone, portrait, theme/background colours, icons 192/512/512 maskable, theme-color metas | H | DevTools Application > Manifest: no installability errors |
| 6.2 | [IMP] App icon + maskable (stylised knee/frame line) via pwa-assets | S | Right in Android adaptive mask |
| 6.3 | Install button (`beforeinstallprompt`); update prompt (`useRegisterSW`) outside session only | S | Installs as WebAPK; update banner never mid-session |
| 6.4 | `backup.ts`: export (JSON, `schemaVersion`, `stomme-backup-YYYY-MM-DD.json`, Web Share file or download); import (zod, export current first, replace in one transaction) + tests | S | Round trip; wrong schemaVersion and malformed rejected; mid-import failure leaves DB unchanged |
| 6.5 | `storage.ts`: `navigator.storage.persist()` after first completed session; status + estimate in settings; backup reminder > 14 days or 4 sessions | H | Shows "Lagring: skyddad" / "kan rensas av webbläsaren" |
| 6.6 | [IMP] Settings + "Radera all data" (two-step) | S | |
| 6.7 | [IMP] Dark theme + accessibility audit (contrast, 48 px, 16 px, colour never sole signal, focus, reduced motion) | S, then O review | Checklist with screenshots |
| 6.8 | Final review: import security, data-loss paths, rules, offline | O (reviewer) | Sign-off; issues fixed |

Parallel: in M1, 1.3, 1.4/1.5, 1.6 after 1.1. M3 can run alongside start of M4 (4.1, 4.2 are pure).
Routing: Haiku = 1.1, 1.2, 2.7, 3.4, 6.1, 6.5. Sonnet = everything else incl. all [IMP]. Opus = 4.3, 3.2 screenshot review, 6.7 review, 6.8, escalation if figures don't converge in 2 iterations.

## 8. /impeccable design direction (all [IMP] tasks)
- Calm, confident coach, not a dashboard. One idea and one primary action per screen, anchored bottom within thumb reach.
- Type: glanceable from arm's length. Amount value ~64–80 px, rest countdown ≥ 96 px, tabular numerals; body ≥ 16 px, labels ≥ 14 px only for secondary. Hyperlegible sans; check å/ä/ö.
- Colour: green = done, amber = today, grey = upcoming, always with icon + word. Amber as fill/ring with dark text, never yellow text on light.
- Themes: warm off-white + ink text; dark = deep neutral (not pure #000), slightly desaturated accents. Follow system.
- Illustrations: one stroke weight, rounded caps/joins, monochrome in text colour, working right side in accent + "H" marker, muted props, floor line, side view. Slow breathing tween; reduced motion = two static frames.
- Rings: per pass card (sets this week) and big for rest timer; thick strokes, number centred.
- Sweaty-hand ergonomics: ≥ 8 px spacing between buttons; destructive never next to "Klar set"; Ångra not confirm dialogs.
- Swedish tone: short, imperative, friendly ("Klar set", "Vila", "Nästa: Step-up"); "Fråga fysioterapeuten" is the escape hatch.

## 9. Testing
Vitest node for rules, dates, lerp, scales; fake-indexeddb for repo/backup; few jsdom component tests (rest timer, pain picker); Playwright local smoke (onboarding, pass A, pain, summary, history) + screenshots. LAN `http://192.168.x.x:5173` is not a secure context (SW, wake lock, randomUUID fail): use Chrome USB remote debugging with port forward to localhost, or the deployed Pages site.

## 10. Risks
1. IndexedDB eviction/clearing: `storage.persist()`, status in settings, JSON export via share sheet, backup reminder, import exports current first.
2. Origin change github.io vs custom domain: only use real data on stomme.tengmo.com.
3. PWA install: HTTPS on custom domain, valid manifest with 192/512/maskable, SW with fetch handler; manual install button.
4. CNAME ignored by Actions / takeover: set domain in Settings; verify domain.
5. Wake lock released when hidden: re-acquire; indicator; no-op fallback.
6. SW update mid-session: `prompt` mode, banner only outside session.
7. Timer drift: timestamp-based; vibration primary.
8. Illustration quality: parametric figure + dev page, Opus/Magnus review, max two iterations, then simpler static diagrams.
9. Rule ambiguity: decisions in section 12; rules isolated and tested.
10. Medical liability: reason codes -> vetted copy; spec rules only; disclaimer; never auto-reduce load.
11. DST 2026-10-25: local date strings, explicit tests.
12. Malicious import: zod, ~5 MB limit, atomic transaction, pre-import backup, render as text only.
13. Schema evolution: versioned upgrades, `schemaVersion`, migration test per bump.
14. Scope creep: out of scope = sync, Garmin, CSV, reminders, other programmes, long-run warning, iOS, theme toggle.

## 11. Out of scope (MVP)
Sync, accounts, server, Garmin, CSV, push reminders, other programmes/exercises, long-run calendar awareness, iOS tuning, i18n framework, manual theme switch, social.

## 12. Open questions (proceed on default)
Magnus's answers 2026-10-18: Q1 keep it generic (no special carry rule; use the default ladder, user can pick any step); Q3, Q4, Q5 ok; Q9 Monday; Q2, Q6, Q7, Q8 no preference, so defaults stand.

1. Carry in week 1: default 10 kg dumbbell, 16 kg from week 2.
2. Wall sit: optional card, offered on pain warn and in exercise list; not in A/B.
3. "Känns lätt": three-button effort rating after each exercise's last set.
4. Prefill: today's suggestion, with "Förra gången" beside it.
5. Programme week: calendar weeks from first started session; breaks don't reset (settings reset later).
6. "Worse the day after": vs same session's `after`, fallback `before`.
7. Volume/week: completed sets primary; kg×reps tonnage secondary in table view.
8. Rep progression: +1 rep (or +5 s / +5 m) when all sets completed and effort not "Tungt"; load jump needs 3 sets at max and "Lätt".
9. Week starts Monday.
10. Pain warn holds only knee-loaded exercises; core and carry progress normally.
11. Calf raise (start = max = 12): moves to 10 kg step once 3x12 is easy.
12. Repo visibility: public (free Pages); no personal data in the app repo.
