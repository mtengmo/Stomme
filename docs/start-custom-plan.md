# Plan: "Skapa eget pass" in the start flow

Planned 2026-10-29 (architect-einstein). Key fact: a custom workout has no equipment or level of its own; dose and start checks read the global prefs (`customWorkoutPlan(ids, prefs, …)` in `defaultPlan.ts:214`, `startProblems` in `startReadiness.ts`).

## Model (`src/features/training/quickStartModel.ts`)

- New goal `'build'` (`'custom'` is taken by the custom rehab programme). `Step` gets `'pick'`. `isRehabGoal('build')` false; `allowedEquipment('build')` = general's; `preferencesFromDraft` → `programId:'general'`, equipment, experience, weights; no `bodyParts`, no rehab fields.
- Draft: `pickFilters` (query string ≤ 500 chars, parsed by shared parser). Selection in its own key `stomme.quickstart.selection`. `readDraft` accepts `step:'pick'` only for goal `'build'`; `clearDraft()` clears the selection key.
- Saved only on "Skapa pass": existing `meta.training` + one `meta.customWorkouts` entry `{id,name,exerciseIds,plan}` in ONE transaction via `saveStartWithCustomWorkout(prefs, ids, plan)` in `src/db/customWorkouts.ts` (so prefs without a workout can never happen). No schema change.

## Step order

- general: goal → equipment → level → focus; running: goal → equipment → level (unchanged).
- **build: goal → equipment → level → pick** ("Steg 4 av 4"); level always asked (drives sets, start weight, level filter).
- knee / physio / custom rehab: unchanged, never reaches `pick`; unit test locks it.

## Pick step (inside `QuickStart.tsx`)

- Reuse `ExerciseFilterControls`, `WorkoutBuilder` selection context + bar, library rows. Move `ExerciseRow`/`ResultList` to `src/features/library/ExerciseResults.tsx`; move hash-param parsing (`ExerciseLibrary.tsx:168-258`) to `filtersFromParams/filtersToParams` in `src/rules/libraryFilters.ts`.
- Pre-filled: `equipment:'available'` from draft prefs; new `levelFit` filter (`allowedLevels(experience)`), default on, checkbox "Bara övningar som passar min vana" under "Fler filter" (only when host passes `showLevelFit`). Body-region chips = optional focus (a filter, not a question).
- `WorkoutBuilder` new optional props: `preferences`, `storageKey`, `showSaved={false}`, `alwaysShowBar` (disabled "Skapa pass" + hint when empty), `onCreate(ids, plan)`. Limits stay (12, 30, AAOS block, missing-equipment labels).
- Add the "Kräver god teknik. Börja med lätt vikt." row label (planned earlier, not implemented) when no variant fits the level.
- Create: `saveStartWithCustomWorkout` with `customWorkoutPlan(ids, draftPrefs, [], [], false)`, `clearDraft()`, navigate to `/traning/A?workout=<id>` (preview in edit mode). Name = `autoWorkoutName(today)`; move the "Namn på passet" field (`TrainingPreview.tsx:~1396`) above the exercise list. No text field in the sticky bar (keyboard covers it at 320 px).
- Back: "Tillbaka" → level step, filters and picks kept (sessionStorage per tab). Nothing is written before "Skapa pass". Choosing another goal clears picks.

## Live summary (owner request, 2026-10-29)

Show a compact summary at the TOP of the pick step (and of the library while selecting, and `/nytt-pass`), updating as exercises are ticked:
- number of exercises ("3 av 12 övningar");
- split per body region, using the existing `bodyRegions` in `src/content/muscles.ts` and each exercise's primary muscle ("Ben & säte 2 · Bål 1"); regions with 0 are not shown; a plain empty text before the first pick ("Inga övningar valda än.");
- estimated time ("ca 18 min", from `estimateWorkoutMinutes` using the draft prefs so it is right before anything is saved; hidden in rehab and when no setup exists).
Pure helper `selectionSummary(ids, prefs)` in `src/rules/` (unit-tested), rendered as one `role=status` region (replaces the bar's separate count). It stays short enough for 320 px (wraps, `.count` numerals, pencil-tick rule above, no new motion). The sticky bottom bar keeps only "Visa valda" and "Skapa pass". Tests: unit for the helper (counts, per-region split, rehab/no-setup hide), jsdom for updates on tick/untick, e2e overflow check at 320.

## Compact result list (owner question, 2026-10-29)

The result rows are too tall today (thumbnail + "Visa rörelse", name, E-number, muscles, equipment, level, Favorit button, "Ingår i Pass A" link ≈ 250 px each). Recommendation: **compact list is the default**, shared by the library, the pick step and `/nytt-pass` via `ExerciseResults.tsx`.
- Row ≈ 72–88 px: small static thumbnail (56 px, tap plays, as today), name (wraps, max 2 lines), ONE meta line "Ben & säte · Hantlar · Rutinerad", and the 48 px Välj/Vald toggle on the right. Whole row except the toggle opens `/ovningar/:id`; Favorit, E-number, muscle list and "Ingår i Pass A" move to the detail page (heart may stay as a small icon).
- Optional view switch "Kompakt / Detaljerad" (segmented, remembered in localStorage per viewer) — detailed = today's rows. Build compact first; the switch is cheap once rows are one component.
- No grid for now: at 320–412 px a 2-column grid gives ~150 px cells where long Swedish names ("Lårmuskelspänning i ryggläge") wrap to 3–4 lines, the toggle needs its own row, and meta can't be scanned. Revisit a grid for the pictures-only browse mode if wanted.
- Section grouping with sticky region headers (Ben & säte, Bål, …) when no search text is active, to make 86 items scannable.
Tests: jsdom for row content and toggle; e2e screenshot at 320/360/412 (no overflow, row height ≤ 100 px, toggle ≥ 48 px).

## Returning users

- Home "Mina pass" section always shows: heading, list or "Inga egna pass än.", link "Skapa eget pass" → new route `/nytt-pass` (`src/App.tsx`), same picker with DB prefs, summary line "Utrustning: … · Träningsvana: …", link "Ändra utrustning eller vana" → `/?andra=utrustning&tillbaka=nytt-pass` (whitelisted return target). Not added to "Byt inriktning".
- **Global prefs stay as they are; equipment/level are not asked again.** Reasons: per-workout equipment/level would need new `customWorkouts` fields and changed preview/draft keys and start checks (large, risky); saving "general" prefs would silently drop a rehab user's setup (safety); dose then follows real experience (limited exercises never heaviest, pain on record → lightest); one-off equipment is covered by temporary equipment at start.
- Rehab prefs in `/nytt-pass`: 0/0 dose, "Ingår inte i knäprogrammet" block, no time estimate (as in the library).

## Copy (du-form)

Step 1 intro "Välj ett fokus så gör vi ett pass åt dig, eller välj övningarna själv." + 4th button "Skapa eget pass". Step 2 hint "Välj det du vill använda. Vi visar övningar som passar." Step 3 hint "Styr vilka övningar vi visar, antal set och startvikt." Step 4: h1 "Välj dina övningar", "Välj upp till 12. Ordning, set och vikt ändrar du sedan.", region legend "Kroppsdel", empty hint "Välj minst en övning.", bar "3 valda · ca 18 min" / "Visa valda" / "Skapa pass". Home: "Inga egna pass än.", "Skapa eget pass". `/nytt-pass`: h1 "Skapa eget pass".

## Accessibility / 320 px

Focus to h1 each step; selecting never moves focus; one `role=status`; labelled region "Valda övningar"; disabled "Skapa pass" has `aria-describedby` to the hint; 48 px targets; no overflow at 320; the QuickStart footer is replaced by the builder bar in the pick step (never stacked); bar must not cover the last row; no new motion; check light + dark.

## Milestones

| # | Scope | Size | Model |
|---|---|---|---|
| M1 | `filtersFromParams/ToParams`, `levelFit` + checkbox, "Kräver god teknik" label | S | Sonnet |
| M2 | Extract `ExerciseResults.tsx`; new `WorkoutBuilder` props; `saveStartWithCustomWorkout` (one transaction) | M | Sonnet, then reviewer |
| M3 | Goal `build`, step `pick`, `QuickStart.tsx`; move the name field to the top of the preview | M | Sonnet, then reviewer |
| M4 | Home empty state + link, `/nytt-pass`, return after setup | S–M | Sonnet |
| M5 | Docs (`custom-workouts.md`, `custom-program-plan.md`), copy pass, selector updates | S | Haiku |

Tests: unit (`quickStartModel.test.ts`: steps per goal, knee never `pick`, `pick` rejected for other goals, build prefs; `libraryFilters.test.ts`: levelFit + param round trip; `defaultPlan.test.ts`: dose from draft prefs), jsdom (`quickStart.test.tsx`: full build flow, no DB writes before "Skapa pass", prefs + one workout after, 0 sessions, draft cleared, back keeps picks; Home/`CustomWorkoutList` empty state; `/nytt-pass` leaves prefs unchanged; AAOS blocked), e2e (new `tests/e2e/quick-start-custom.spec.ts` at 320/360/412 × light/dark; `tests/e2e/flow.ts` add `build` to `GOAL_BUTTON`/`FINISH`; `first-run-nav.spec.ts` picks survive leaving; `custom-programme.spec.ts:205` and `library-workouts.spec.ts:103` must expect "Inga egna pass än." instead of the region disappearing).

## Open decisions (owner)

1. Label: "Skapa eget pass" (recommended; "program" sits next to "Jag har ett eget rehabprogram" and the result is one pass) or "Skapa eget program".
2. Home still leads with A/B "Nästa pass"; the workout shows under "Mina pass".
3. Name edited in the preview (field moved to top), not in the flow.
4. `levelFit` on by default only in the start flow and `/nytt-pass`, not in the plain library.
5. Returning users change global prefs only via "Ändra utrustning" (Inställningar › Min utrustning, `?tillbaka=nytt-pass`) and Home "Byt inriktning".
