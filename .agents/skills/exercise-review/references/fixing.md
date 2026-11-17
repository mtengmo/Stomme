# Fixing an exercise (for the fixer, not the reviewer)

Read when you change a figure, pose, view or exercise text after a review. `SKILL.md` rules 1-2
(ids), 8 (`risk`) and 9 (commits) still apply; `AGENTS.md` and `docs/exercise-audit-log.md` win.

1. **Read first:** the review report, the exercise's `openIssues`, the last reviews' `notes` and
   earlier `fixes` notes. Save `inspect.ts <id> > before.txt` (tables per phase, stills vs live).
2. **Siblings:** `inspect.ts --scan` lists the same defect elsewhere. Fix a shared cause once;
   every exercise whose figure changes still needs its own entry (step 6).
3. **Shared helpers before per-pose numbers:** constant segments via `SEGMENT_RULES`
   (`src/figures/constrainedLegs.ts`, opt-in) with `bone`, `limb`, `arm`, `leg`, `foot`,
   `trunk`, `headNeck` from `segmentLengths.ts`; the authored start/middle/end must share the
   lengths (`segmentLengths.test.ts`). Arms under load: `solveTwoBone` (`keyframes.ts`) with the
   authored lengths, as the `single-leg-hip-thrust` branch of `applyEquipmentPose` does. Family
   keyframes (`squatFamilyKeyframes.ts`, `hingeFamilyKeyframes.ts`, `stepUpKeyframes.ts` ...)
   already solve from constants: fix there. Front/oblique (`frontViews.tsx`, which also draws
   their equipment): no segment longer than the profile, front thighs at most 36
   (`FRONT_THIGH_MAX`).
4. **Stills:** side-view Start/Slut draw the raw `spec.start`/`spec.end`, the live loop draws
   `movementPose`, so a constraint can make them differ. Re-run `inspect.ts <id>`; "FLAG" in
   the stills block means fix the keyframe (or the still phase), not the review.
5. **Checks:** `npm run check`; `npx vitest run src/figures src/content`. Baseline: run
   `$env:UPDATE_FIGURE_BASELINE=1; npx vitest run --project unit src/figures/figureGeometry.test.ts; Remove-Item Env:UPDATE_FIGURE_BASELINE`.
   It rewrites every row: `git diff src/figures/figureGeometry.baseline.json` may only lower or
   remove rows; a raised or new row means the fix made something worse (fix it, never commit
   the raise). Compare `inspect.ts` with `before.txt`.
6. **Log** (same commit as the change, `AGENTS.md`). Append to `fixes`:
   `{"date": "<today>", "fixer": "<your id>", "notes": "..."}`; add `commit` only for a code fix
   already committed. `notes` in Swedish: E-number; what changed, before -> after in units;
   what still reproduces; what the re-review must look at (views, phases, H/V, variants,
   reduced motion) and by whom (cross-vendor). Set `status: "fixed-awaiting-review"`.
   Never remove or reword `openIssues` (a reviewer removes them after checking), never add a
   review of your own fix, never set `approved`.
7. **Same-day reviews:** the gates compare dates only (`r.date >= fixDate` in `exerciseAudit.ts`
   and `beginnerSet.test.ts`; nothing reads `commit`), so a review dated
   today that saw the old figure counts as after your fix. Never shift a date; name it in the
   fix notes ("Granskning <datum> <id> <scope> avser figuren före denna rättning.").
8. **Fingerprints:** `npm run audit:fingerprints -- --write` hashes the whole working tree.
   Before it, and before editing the log, check `git status` and `git diff
   docs/exercise-audit-log.json`: hunks or figure changes that are not yours mean another
   agent is working. Then re-read the log right before each edit, touch only your entries,
   and skip `--write` (report it) until their changes are committed. Any changed fingerprint
   is a figure change: its exercise needs a `fixes` entry too.
