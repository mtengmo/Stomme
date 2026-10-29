# Plan: custom workout builder GUI

Planned 2026-10-29 (architect-einstein, from reading the code). About 70 % already exists; the plan mostly connects and tidies it. M0–M3 need no data-model change.

## Current state

- **Library** `src/features/library/ExerciseLibrary.tsx` (`/ovningar`): purpose, search, favourites, equipment, level, ~20 muscle chips. State in hash params `syfte, sok, favoriter, redskap, niva, muskel, kalla`.
- **Builder** `WorkoutBuilder.tsx`: per-row "Välj till eget pass" (max 12, sessionStorage `stomme.library-selection`), name field, "Spara eget pass" (max 30), floating "Visa eget pass".
- **Storage** `meta.customWorkouts` = `{id, name, exerciseIds, plan?}` (`src/db/customWorkouts.ts`), covered by the backup (strictObject). Sessions carry `customWorkoutId/Name`.
- **Dose editor** = `TrainingPreview.tsx` in edit mode: reorder, add via `ExercisePicker`, remove with undo, variant/sides/sets/reps/weight/rest, "Ca X minuter", "Spara ändringar", "Börja passet".
- **`ExercisePicker.tsx`** has better filters than the library (body regions, "Mer specifikt", "Fler filter").

## Gaps

1. Hard to find: Home → "Ändra" → "Bläddra bland övningar". Saved workouts only at top of the library, never on Home.
2. Two filter systems; no movement-type, reps/time or one-side filter; muscle chips take several screens at 320 px.
3. Select → name → save → tap link → dose is split; no reorder or time estimate while choosing.
4. Unusable exercises (missing equipment, non-AAOS in knee rehab) can be picked; start is blocked later.
5. No rename, no confirm/undo on delete, no "add more" from the editor.
6. No scheduling of custom workouts.

## Flow

Home "Mina pass" → `/ovningar` (filter, toggle "Välj") → selection bar (count, ca minutes, "Visa valda") → "Skapa pass" → existing preview `/traning/A?workout=<id>` used as the builder (order, dose, rename, save, start). Do not duplicate the dose editor.

```
/ovningar (360 px)
| < Till träningen                   |
| Övningar                           |
| [Sök namn eller nummer        ]    |
| [Alla][Ben & säte][Bål][Rygg]...   |
| Mer specifikt [v muskel     ]      |
| > Fler filter · 2 aktiva           |
| 24 övningar        Rensa filter    |
| [fig] E12 Knäböj med hantel        |
|       Ben & säte · Hantlar         |
|       [ Välj ] / [check Vald]      |
| [fig] E24 Utfall bakåt · per sida  |
|       Saknar utrustning: Hantlar   |
| 3 valda · ca 18 min  [Visa valda]  |
| [          Skapa pass          ]   |
```

- Row: static thumbnail, play on tap (no new motion). 48 px toggle "Välj"/"Vald" with `aria-pressed`; accent colour, never the pencil tick or done colour.
- "Skapa pass": auto name (e.g. "Eget pass 29 okt"), `plan` from `customWorkoutPlan()`, clears the selection, opens the preview in edit mode. Preview gains: name field, "Ta bort passet" with confirm, "Lägg till fler från biblioteket" (`/ovningar?till=<id>`).
- New shared `src/features/exercise/ExerciseFilterControls.tsx` (from ExercisePicker, props `value/onChange`); library maps it to hash params. Saved-workout list moves to `src/features/library/CustomWorkoutList.tsx`, used on Home (after WeeklyPlan) and in the library header.

## Data and storage

- M0–M3: no schema change (name, exerciseIds, plan already pass strict Zod). Do NOT add fields like `createdAt` (old clients reject unknown keys).
- M4 (scheduling, only if approved): `weeklySchedule.workouts?: Partial<Record<'1'..'7', string>>`; bump `BACKUP_SCHEMA_VERSION` to 3 (accept 1–3); refine that ids exist; deleted workout → "pass borttaget", day falls back to A/B; amend the comment at `backup.ts:24`. Tests: v2 imports into new client; v3 rejected with `schema_version` by old parser fixture.
- Existing risk: `readCustomWorkouts` drops a workout if an exercise id leaves the catalogue. Keep ids stable.

## Safety (must stay)

- Dose from `basePlan(id, prefs)` then `trainingPlanSuggestion` (inline at `TrainingPreview.tsx:177-185`). Decision 3 (below): starting weight follows experience via the roster rule (`chooseStartingWeight`/`heavyStartAllowed`), so experienced users may start heavy on heavy-slot exercises; limited exercises never start on the heaviest weight; pain on record → lightest. Sets by `startingSets(experience)`, target = `range.start`; history can add one rep only; weight never auto-increases; symptoms block increases. Lock with tests.
- Rehab: sets/target start at 0 (user enters the physio dose), never auto-increase, always via `/kansla/:id/before`. In knee rehab non-AAOS rows show "Ingår inte i knäprogrammet" and cannot be selected. Physio consent box unchanged.
- Knee-pain gates in `src/rules/progression.ts`, check-in routing, symptom hold untouched. Custom workouts stay out of short workouts.
- Hard gates at start stay: equipment fit, max 12, no duplicates, valid dose, `validateTrainingPlan`. The selection bar only warns early.
- Level above experience: allowed but labelled ("Kräver god teknik. Börja med lätt vikt.").

## Filters and edge states

- Pure functions in `src/rules/libraryFilters.ts`: add `region`, `muscle`, `kind` (strength/mobility), `unit` (reps/time), `oneSide` (`perSide`); `filterExercises(...) → {primary, supporting}`. Skip `movementSlots` (covers ~45 of 86). New hash params `omrade, typ, utforande, sida`; old `muskel` keeps working.
- Library default "Alla redskap"; rows lacking equipment show "Saknar utrustning: Hantlar".
- Edge: only bodyweight owned → link to Settings; zero matches → "Inga övningar passar filtren." + "Rensa filter" (focus stays); no setup yet → bar says "Välj träningsinriktning för att skapa pass"; 12 selected → other "Välj" disabled + "Högst 12 övningar."; 30 saved → "Skapa pass" disabled; rehab shows no time estimate.

## Accessibility and copy

48 px targets; selection bar is a labelled region "Valda övningar" with padding so it never covers the last row; one `role=status` for count ("3 valda"); selecting never moves focus; up/down named "Flytta upp: Knäböj" and announced; focus to h1 after navigating; check 320 px (long names wrap); `.count` only for numbers. Plain du-form Swedish, no hype.

## Milestones (each shippable)

| # | Scope | Size | Model | Tests |
|---|---|---|---|---|
| M0 | Move inline plan code to `customWorkoutPlan(ids, prefs, sessions, logs)` in `defaultPlan.ts`; preview calls it. Pure refactor. | S | Sonnet | Limited exercises start lightest; rehab 0/0; sets by experience; symptom hold |
| M1 | `filterExercises` + new filters; extract `ExerciseFilterControls`; library and picker share it; regions + "Mer specifikt" replace muscle chips | M | Sonnet | Unit per filter; update ExerciseLibrary/ExercisePicker tests; e2e `muscles.spec.ts`, `exercise-picker.spec.ts` |
| M2 | Row toggle, selection bar with estimate, "Visa valda" (reorder/remove), "Skapa pass" with auto name → preview; equipment/AAOS labels | M | Sonnet | jsdom: aria-pressed, status, 12 limit, AAOS disabled, create; e2e `custom-programme.spec.ts` at 320/360/412 light/dark incl. no overflow |
| M3 | "Mina pass" on Home, rename, delete with confirm, "Lägg till fler", `?till=<id>`; update `docs/custom-workouts.md` | S–M | Sonnet (docs Haiku) | jsdom Home list, rename, delete; update `library-workouts.spec.ts` |
| M4 | Scheduling + backup v3 (only if approved) | M–L | Sonnet, then reviewer | Backup round trips, deleted-workout fallback |

Review M0 (safety) and M4 (backup) with the reviewer agent. One owner for `TrainingPreview.tsx` (~1,660 lines). Haiku for copy/docs and selector updates. Use /impeccable and real screenshots for M1–M3 UI.

## Decisions (owner, 2026-10-29)

1. Name: automatic, with the date ("Eget pass 29 okt"), editable afterwards.
2. Equipment not owned: allow, label "Saknar utrustning", block at start unless temporary equipment is set.
3. Above your level: allow and label. Starting weight follows the user's experience, not always the lightest: reuse the roster rule (`chooseStartingWeight`), so an experienced user starts heavier. Limited exercises (overhead, one-sided, rotation, ballistic, bent-over row, etc.) stay below the heaviest weight, and any pain on record still means the lightest. This replaces the "always lightest" rule in the Safety section; update M0 tests accordingly.
4. Scheduling (M4): out of scope for now. (It would let a custom workout sit on a weekday in the weekly plan.)
5. A completed custom workout counts as that day's training in the weekly plan (so it is not shown as missed), but it does not advance the A/B sequence or progression.
6. Bottom-nav tab: no. Keep three tabs; "Mina pass" is a section on Home.
7. Limits: 12 exercises per workout, 30 saved workouts.
8. Saved workouts can be deleted (with a confirmation) from Home, from the library list and from the preview.
9. Backups: there are no users with older backups, so no migration or old-client compatibility work is needed. Prefer simple schema changes over versioned ones; M4 can add its field without a version bump if it is ever built.

## Update 2026-10-29: start flow and Home

The builder is also reachable without a library visit: first-run goal "Skapa eget pass" (pick step in `QuickStart.tsx`) and `/nytt-pass` from Home "Mina pass". Both use `CustomPicker`; see `docs/custom-workouts.md` and `docs/start-custom-plan.md`. Global preferences change only through the explicit "Ändra utrustning eller vana" link.
