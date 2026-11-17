---
name: exercise-review
description: Review, audit or approve a Stomme exercise - its stick-figure animation and views, Swedish instructions (tips, easier variant, units), spoken voice and timer cues, or safety - and record the result or a fix in docs/exercise-audit-log.json. Use when asked to review, re-review, approve, audit, check or fix an exercise figure, animation, pose, instruction text or voice cue, or to work the exercise audit queue.
---

# Exercise review (text, voice, animation, safety)

Shared by Claude Code and Codex. Process owner: `docs/exercise-audit-log.md` (Swedish); if it and
this skill disagree, the doc wins: say so in your report. A review is evidence plus a log entry,
not a fix: never change figures, poses, exercise text or other app code; leave fixes to a fixer.

**Load** this file and `references/checklist.md` every review. Read on demand:
`references/views-and-scoring.md` for `animation`/`all` (views, left/right, projection, baseline
rows, contact measurement, screenshots, by-hand viewing); `references/voice-crosscheck.md` when a
spoken string, timer label or status line is in doubt, or to test or play audio;
`references/sources.md` for safety scope, high risk, loading/progression or rehab claims;
`references/fixing.md` instead of the review workflow when you fix (change a figure, view or text).

## Must-follow rules (T = a test enforces it)

1. **Allowed ids** (T, `REVIEWERS` in `src/content/exerciseAudit.ts`): `claude-opus`,
   `claude-sonnet`, `claude-fable`, `unknown-claude`, `codex:gpt6astra`, `codex:gpt61sol`, `human`.
   No new ids or suffixes. Agents never write `human`; nobody writes `unknown-claude` (2026-10-23
   seed only).
2. **Your id:** (a) the id the user names, if allowed (Codex often only knows it is "GPT-6"; do
   not stop for this); else (b) your known model: Opus `claude-opus`, Sonnet `claude-sonnet`,
   Fable `claude-fable`, Codex the codex id matching a model stated in the session; else (c) stop
   and ask. Never guess between the two codex ids. A named id not in the list: stop and report
   (adding ids is the maintainer's change). Report the id and its source ("angivet av
   användaren" / "känd modell").
3. **Never review your own fix:** if `fixes.at(-1).fixer` is your id, skip and say so (T,
   `validateEntry`).
4. **Prefer cross-vendor** (Claude fix -> Codex or `human`, and vice versa). Same vendor, other
   model is allowed but weaker; write in `notes`: "Samma leverantör som rättaren (claude-sonnet):
   svagare än cross-vendor."
5. **`approved`** (T for most): one `scope: "all"` review or `text` + `animation` + `safety`, all
   `ok`, all dated on or after the last fix, none by the last fixer; the last review in `reviews`
   is `ok`; `openIssues` empty. Never set `approved` without such an entry; unreviewed stays
   `unreviewed`. The gates compare dates only (`>=`): do not rely on a same-day review that saw
   the old figure (its `commit` predates the fix, or the fix notes name it); re-review that scope.
6. **Whole loop in every existing view x side (H/V) x equipment variant**, several phases. Anything
   existing but unchecked = incomplete: no `ok` for `animation` or `all`.
7. **No new JSON fields or scopes** (T, `SCOPES`: `text`, `animation`, `safety`, `all`). Voice goes
   under `text` (or `all`); the score goes in `notes`.
8. **Never touch `fixes`, `fingerprint` or `risk`** by hand (report a wrong risk). **Never soften a
   finding** to make a test pass.
9. **No commit or push** unless asked; then commit only your review hunk (`git add -p`).
10. **Examples are hints; verify independently.** Nothing here describes the exercise in front of
    you; its open bugs live in its `openIssues`, never in this skill.

## Setup

Node 24 (`engines.node >= 24`; on Node 22 vitest fails with "Cannot read properties of undefined
(reading 'config')"). The default `node` (nvm4w) is 22: run npm and tests from **PowerShell** with
this prefix in every call: `$env:Path = "C:\Program Files\nodejs;$env:Path"; node --version`.
Screenshot scripts need `npx playwright install chromium` once.

## Workflow

1. Read `AGENTS.md`, `docs/exercise-audit-log.md`, this file and `references/checklist.md`.
2. `git status --short`; `git diff --stat HEAD -- src/figures src/content src/rules/repTempo.ts`.
   If dirty: "Dirty workspace".
3. `npm run audit:summary`. Queue: high risk first; then `needs-fix`, `fixed-awaiting-review`,
   `unreviewed`; then fewest reviews. Take about 8-10 from the top unless the user named
   exercises; skip your own fixes.
4. `npx tsx .agents/skills/exercise-review/scripts/inspect.ts <id|E-ref> ...` (read-only facts:
   text, variants, sources, views, voice, tempo, segment lengths, stills vs live loop (FLAG = a
   finding to confirm), baseline rows, fingerprint, HEAD figure identical, audit entry).
   Siblings with the same defect, for the report: `inspect.ts --scan --metric asym:shin` (kinds
   `drift`, `asym`, `front`, `oblique`, `stills`; top 15, `--top 0` all).
5. `npx tsx .agents/skills/exercise-review/scripts/capture.ts <id>`; look at every sheet in
   `.impeccable/review/<id>/`: each view x side x variant, phases out and back, reduced-motion
   stills, live loop, 390 dark and 1280 light.
6. Work `checklist.md` per scope; fill the voice | animation | how-to row; score (below). Note
   each finding with phase, view, side and variant.
7. Record, run "After editing the log", report with the template.

Sources: text `src/content/exercises.ts` (spreads `bodyweightExercises.ts`,
`kneeStrengthExercises.ts`, `additionalExercises.ts`, `rehabAdditions.ts`); variants
`exerciseMetadata.ts`; side `exerciseSideCues.ts`; moving timed `timedMovement.ts`; tempo
`src/rules/repTempo.ts`; figure `figures[id]` in `src/figures/poses.ts`, `*Poses.ts`,
`*Keyframes.ts`, `frontViews.tsx`, `equipmentPose.ts`, `constrainedLegs.ts` (`SEGMENT_RULES`),
`Figure.tsx` (`HOLD_STILLS`); E-number
`src/content/exerciseReferences.ts`.

## Dirty workspace

`inspect.ts`, tests and screenshots read the **working tree**; another agent may be editing.

- Review a clean copy (`git worktree add ../stomme-review HEAD`; own `node_modules`; remove it
  after), or review the working tree and say so in `notes` (`commit` is then only a reference).
- On a dirty tree, `inspect.ts` prints `HEAD figure identical: yes/no/unknown` (rendered from a
  HEAD copy, shared code included) and the files whose diff names the id: report both.
- Status before: from `git show HEAD:docs/exercise-audit-log.json` or the working tree; say which.
- `npm run audit:fingerprints -- --write` only if no other uncommitted figure change would be
  hashed; otherwise skip and report which fingerprints it would change.
- Red `needs-fix` gates do not block committing the review (preferably on `review/<E-ref>`).
  Moving the exercise out of pools is the fixer's job.

## Scoring (in `notes`, never a JSON field)

**0** wrong or unsafe; **1** major (misleads, or a visible error); **2** minor (the user still
moves right); **3** correct.

| Dim | Scope | Judge |
|---|---|---|
| T | text | tips, commonMistake, easierVariant, unit and range, side cue, variant copy |
| R | text | spoken, timer and status copy |
| AS | animation | side view across phases; `n/a` for front-only |
| AF | animation | every non-side view; 1 "saknas" when a needed view is missing (`views-and-scoring.md` §1); `n/a` only when none is needed |
| U | animation | each dumbbell, kettlebell or band variant in every view: grip, contact, axis, no "wide bar"; `n/a` when there is none (`inspect.ts` says so); props and floor contact go under AS/AF |
| S | safety | risk, cautions, regression, contraindication wording, form under load |

- Denominator = 3 x dimensions scored (`n/a` excluded), per scope entry: `text` "score 6/6 (T3
  R3; konsistens ok)"; `animation` "score 8/9 (AS3 AF2 U3)"; `all` "score 17/18 (T3 R3 AS3 AF2 U3
  S3; konsistens ok)".
- A failing figure test for the exercise caps animation at 1. A missing view hiding a stated
  safety cue (knee tracking in a loaded squat) may also cap S at 2.
- **Consistency** (voice | animation | how-to): `consistent`; `minor mismatch` (wording only,
  scores 2); `mismatch` = a channel would make the user *do* something else (hold vs move, reps vs
  timer, wrong side, wrong tempo): at most 1 in the channel that contradicts the written
  prescription (T if the text is wrong). A drawing defect that does not change what the user does
  (a contact gap, a shrinking limb) is scored in AS/AF/U, not called a mismatch.

| Scores | `result` | Log |
|---|---|---|
| any 0 or 1, S below 3, or `mismatch` | `issues` | `needs-fix`; one `openIssues` line per 0/1 finding and for S |
| all 2-3 and S 3 | `ok` | minor (2) issues in `notes` only, never `openIssues` (`beginnerSet.test.ts` reads them as factual errors) |
| an existing view or variant unchecked | not `ok` | `issues` or leave the scope unrecorded; list what is missing |

## Recording

Append one object per scope to the end of `reviews`, 2-space formatting, exactly these fields
(`AuditReview`):

```json
{
  "date": "2026-11-16",
  "reviewer": "codex:gpt61sol",
  "scope": "animation",
  "result": "issues",
  "commit": "538d6f8",
  "notes": "E00: score 6/9 (AS1 AF2 U3). Vyer: sida, fram. Nio faser ut/tillbaka H/V, 10 kg hantel och 16 kg kettlebell, reduced-motion Start/Slut. ... Ej sett: mörkt läge."
}
```

- `date`: today `YYYY-MM-DD` (`Get-Date -Format yyyy-MM-dd` / `date +%F`), on or after the last
  fix. `result`: `ok` or `issues` only ("needs fix" = `issues` + status `needs-fix`).
- `commit`: always `git rev-parse --short HEAD` (optional in the schema, but it dates what you
  saw); dirty tree: say so and add `fp <fingerprint now>` and "HEAD-figur identisk: ja/nej/okänd"
  from `inspect.ts` to `notes`.
  `evidence` (optional): a committed path only
  (`.impeccable/review/` is gitignored); suggest `docs/audit-evidence/<E-ref>-<date>.png` only if
  the user wants the image committed, otherwise describe what you saw in `notes`.
- `notes`: Swedish, at most about 1200 characters, no trailing whitespace; details go in the
  report. Order: (1) E-number and score; (2) views that exist and those checked; (3) what you saw
  (phases, H/V, variants, reduced motion); (4) `text`/`all`: "Röst kontrollerad: ..." or "Röst ej
  kontrollerad" (source only: "kontrollerad i källa, ej uppspelad"; R may still be 3, but say the
  audio is unverified); (5) consistency verdict; (6) findings, minor issues, not seen, same-vendor
  sentence.
- Name only views and variants that exist (`inspect.ts`); no copied boilerplate ("2x10 kg samma
  geometri"). "Ej sett" lists only existing things you skipped; a missing view is AF "saknas".

| Outcome | Status and `openIssues` |
|---|---|
| new 0/1 finding, or S below 3 | add a line; `needs-fix` |
| existing line still true | keep it; `result: "issues"`; say "befintlig [strong]-punkt kvarstår" |
| open line really fixed (you are not the fixer) | remove it; explain in `notes` |
| your scopes `ok`, rule 5 not yet met | leave the status (`unreviewed` / `fixed-awaiting-review`) |
| only open line is a process gap | `ok` for fully covered scopes; keep line and status |
| rule 5 fully met | empty `openIssues`; `approved` |

**Issue line** (Swedish): `"[strong] E00 <id>, profil fas 0.875-1 och reduced-motion Slut H/V:
<what is wrong>. <what it should do>."` Tag by the fix: `[cheap]` when one line or a few
constants fix it, otherwise `[strong]`.

**Process gaps** (`PROCESS_GAPS` in `src/content/beginnerSet.test.ts`): lines starting `Beginner
comprehension check and full-loop visual acceptance outstanding` or `Not covered individually by
any audit doc` name a missing check, not a fault. Do not record `issues` for them; keep them word
for word; say in `notes` which half you did ("fullständig visuell loopkontroll: gjord (alla vyer,
H/V, varianter)"), never claim the other. The approval gate still fails on them ("approved with open issues").
Beginner comprehension is a human judgement: only `human` or a maintainer decision clears the
line, so agents alone cannot approve the exercise; say so, and remove the line only if the user
says to.

**Self-check:** `npx tsx .agents/skills/exercise-review/scripts/check-entry.ts --log <id>` passes
(length, trailing space, a space before numbers: "fas 0", not "fas0", exactly `AF n/a`/`U n/a`,
score sum and denominator); every view and variant named exists; status-before source known;
`result`, status and tags follow the rules above; the report starts with the template header.

## After editing the log

1. `npm run audit:fingerprints -- --write` only as "Dirty workspace" allows (hashes only, never a
   status; report changes). Then `npm run audit:fingerprints` must print "No stale approved
   exercises."
2. `npm run audit:summary`.
3. `npx vitest run src/content src/rules/programVariety.test.ts` (or `npm run test`). Report
   which failures name this exercise (search the output for its id) and which already failed.
4. Gates failing by design (report, never work around):
   - `needs-fix` exercise in a pool: `beginnerSet.test.ts`, `programVariety.test.ts` (wide pool),
     `readyWorkouts.test.ts`, `runningProposals.test.ts`. Moving it out (as commit `da74028`) is
     the fixer's job.
   - high risk in the beginner set: `beginnerSet.test.ts` needs `ok` text and animation reviews
     on or after the last fix.
   - `renegade-row`, `weighted-sit-up` (`pendingReviewIds`) must not become `approved`
     (`pendingReview.test.ts`).
   - `isometric-lunge-hold`, `plate-pogos` stay `fixed-awaiting-review`, no `claude-sonnet`
     review (`runningStrength.test.ts`).
5. Any other failure (invalid date, reviewer, scope or approval in `exerciseAudit.test.ts`) is your
   mistake: fix the entry.

## Report template

```
## Exercise review - <date> - reviewer <id> (<angivet av användaren | känd modell>)
Batch: <n> from audit:summary (queue positions ...). Skipped: <id> (own fix) ...
| Ref | id | Views checked/existing | T | R | AS | AF | U | S | Score | Consistency | Result | Status before (HEAD/working tree) -> after | Notes chars |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| <E-ref> | <id> | side, front / side, front | 3 | 3 | 1 | 2 | n/a | 3 | 12/15 | consistent | issues | fixed-awaiting-review (HEAD) -> needs-fix | 1010 |
Voice | animation | how-to: | <E-ref> | <said> | <shown> | <written> | <verdict> |
Checklist per exercise: [ ] text [ ] voice [ ] every view x side x variant [ ] safety
Findings: <E-ref: phase, view, side, variant - problem (score, tag)>. Minor (2): <...>. Not viewed: <...>.
Objective inputs: baseline rows <...>; `npx vitest run src/figures` <pass/fail>.
Same-vendor: <list|none>. Gates failing because of this review: <list|none>; already failing: <list>.
Workspace: HEAD <sha>, clean | dirty (<files>; HEAD figure identical yes/no/unknown; own lines in diff yes/no); worktree yes/no.
Commands: audit:fingerprints --write (<n> changed | skipped: ...), audit:summary, tests <result>. Log edited, not committed.
```
