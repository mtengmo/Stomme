# Training continuity, short workouts and weekly planning

Scope: the three recommended additions, implemented with Luna (weekly planning) and Sol (data/rules), with integration and verification by the main agent. Preserve the Swedish notebook interface, local-only storage and explicit progression policy. No new exercises, notifications, accounts or automated rehab changes.

Status: implemented on 2026-10-28. Luna and Sol were resumed after the initial usage-limit interruption. All three stages below are built and integrated.

## 1. Remember the normal A/B workout

- Store a full `PlannedExercise[]` separately for general/running × A/B in `trainingRoutines` metadata.
- Keep exercises, order, set count, rest, equipment variant and working sides. Continue using compatible full-session history for suggested reps/weight; saved structural choices take priority.
- Changes affect today by default. An explicit “Behåll som mitt pass A/B” saves the normal routine; “Återställ appens förslag” removes only that programme/template's saved routine.
- Persist through restart and backup/import. Equipment changes leave an incompatible saved item visible for review rather than replacing it silently. Existing custom-workout and rehab persistence remains separate.

## 2. Explicit short version

- Offer a shorter version of the reviewed full plan for standard general/running workouts only. Keep the full draft intact; the user can switch back before starting.
- Show an honest approximate duration including rests, movement, holds, sides and transitions, with warm-up additional. Do not promise an exact 15-minute finish, accelerate reps or shorten rests.
- The first version selects up to four exercises spread through the full order and caps each at two sets, without increasing dose. Show the actual shortened roster before starting. Hide the option when it would not shorten the workout.
- Mark saved sessions as `workoutMode: 'short'`; retain the full-plan snapshot for editing an unstarted preparation. Show “Kortpass” in summary/history.
- Short sessions count as actual training in history and weekly activity, but never advance the standard A/B sequence or supply evidence for full-workout progression. Symptoms still affect subsequent suggestions. Shortening never saves over the normal routine. Rehab and named custom workouts are excluded.

## 3. Simple weekly plan

- Optional preferred weekdays (one to three; suggest two), saved locally in `weeklySchedule` metadata. Use ISO weekdays and local calendar dates.
- Show the next planned date and this week's completed activity. Allow moving one occurrence to another date and restoring the usual plan.
- Use the existing 48-hour rest information as advice, scoped to the current programme. Do not block training or promise recovery. No push notifications or automatic symptom-based rescheduling.
- Add the control below the primary next-workout action; keep editing in a disclosure so the primary task remains clear.

## Data and integration

- Additive metadata and optional session fields retain schema-2 backup compatibility for existing exports; import strictly validates new values. Older app versions may reject new exports, as for other recent metadata additions.
- Defaults must preserve existing behavior when metadata is absent. Never change an active session silently. Draft choices survive navigation/reload; a completed workout has an immutable planned roster.
- `fullPlan` is provenance for a short preparation, not completed sets. Only `session.plan` drives logging and history set counts.
- Saved-routine progression compares matching equipment and normalized working sides. The symptom gate checks all newer sessions in the same programme even when those sessions do not qualify as comparison evidence.

## Acceptance and verification

1. Edit normal A, save it, complete A and B, and return to A: choices/order/sets/rest remain. “Bara idag” edits do not change that saved routine. General/running and A/B stay independent.
2. Select a short workout, switch back, and reload: the full draft is intact. After starting, inspect its actual short plan and marker. A short session cannot qualify a harder exercise or move the ordinary A/B sequence; symptom reports still block increases.
3. Choose weekdays, reload, move the next occurrence, and reset it. Check week rollover, local dates, completed occurrences and advisory rest information.
4. Round-trip new settings and short-session provenance through backup; retain legacy imports and reject malformed new data.
5. Run check, full test coverage (100% rules branches), production build, relevant browser regressions, accessibility and upgrade checks. Capture real 320/360/412 px light/dark screenshots and review the built result in a bounded pass.

Work remains on `feature/training-continuity` for review. The readable physiotherapist report was an alternative, not part of this build.

## Verification results

- Complete test suite: 105 files, 1,372 tests passed; 100% of rules branches covered.
- Production build and TypeScript/Biome checks pass (existing repository Biome warnings remain).
- Full production browser suite: 112 checks passed, including the six new end-to-end cases at 320/360/412 px in light/dark. These verify remembered edits and order/rest, temporary edits, reversible short selection and reload, full-plan provenance, history markers, ordinary A/B boundaries, weekday persistence, moving/resetting dates, 48 px targets and no horizontal overflow.
- Structural accessibility audit: 104 screens, no findings; contrast checks pass.
- All six installed-client upgrade scenarios pass, including old-client bootstrap, offline retry, active inputs and multiple tabs.
- Screenshots/logs are local synthetic artifacts under `.impeccable/review/training-continuity/`. The first review tightened short-workout copy and selected-weekday affordances; confirmation captures use the final build.
