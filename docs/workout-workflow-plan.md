# Simpler workout editing, equipment and session flow

Status: proposed implementation plan, 2026-10-21. Planning only; no application changes in this delivery. Supplements `exercise-clarity-plan.md`; that plan and its completed work remain intact.

## Brief and evidence

The user wants less scrolling, clearer exercise boundaries, equipment that reflects actual owned weights, fewer questions and taps, and body-part filtering while customizing a workout. Primary context: a phone before and during exercise. Impeccable mode: Operate. Preserve the squared-notebook identity and large movement/timer presentation.

Source review of the current implementation found:

- `TrainingPreview.tsx` expands dose, rest, variant, side, replacement and removal controls for every exercise. Its add control is a long select without the library's muscle filters.
- `QuickStart.tsx` and `rules/equipment.ts` describe equipment type and quantity, but not owned weights. The editor accepts arbitrary total kilograms and variant changes restore a catalogue load.
- `ExerciseLibrary.tsx` already has muscle, purpose, equipment, difficulty and favourite filters. Reuse their rules rather than creating a competing catalogue.
- `SessionScreen.tsx` requires the before check-in for current training sessions; legacy sessions have a separate pain-reading gate. This is a routing/persistence change, not just hiding a screen.
- `Runner.tsx` renders a separate effort screen. Rest advances automatically only within the same timed exercise. `trainingSuggestion` uses recorded effort and after feedback to qualify repetition increases.

This is a source-grounded review, not a fresh visual browser audit. Implementation must include the bounded mobile/desktop visual review below.

## 1. Compact workout customization

Default to an ordered, collapsed overview. Each row shows sequence number, stable E-number, name, small static illustration, dose and equipment summary, and an explicit “Ändra” control. Example: “2 · E24 Utfall bakåt / 3 × 8 per sida / 2 × 5 kg”. Sequence number and E-number have different labels.

- Open one row's editor at a time. Keep the heading and summary visible above its controls. Collapse advanced fields such as rest and side under “Fler inställningar”; expose required missing rehab dose immediately.
- Use a visible divider, spacing and numbered headings to separate exercises. Add a subtle alternating neutral paper tint to odd/even rows. Change background colour only, never opacity of the whole row; text contrast stays constant. This is an intentional local exception to DESIGN.md's same-paper-surface rule, authorized by this request, and should be documented when implemented. No red/blue alternating decoration.
- Save each valid edit to the draft, showing “Sparat”; preserve incomplete field text while editing. Starting validates the whole plan and expands/focuses the first invalid row. Collapsing or switching rows must not silently discard changes.
- Remove with undo; reorder with accessible up/down controls inside the editor. Do not require drag gestures.
- Keep a compact action area with exercise count and “Starta pass”; secondary “Lägg till övning”. Reserve space for bottom navigation, safe area and keyboard. Do not add a fixed top panel that hides instructions.
- Adding/replacing opens the shared picker described below and returns focus to the changed row. Preserve draft and scroll position on cancellation, guide viewing and browser back. Avoid nested scroll regions in the workout editor.

Target: a normal five-exercise workout can be scanned without expanding five forms. On 390 × 844, at least three complete collapsed rows and the start action should be visible after the page heading, subject to long names and text zoom; never shrink targets or text to meet this goal.

## 2. Equipment inventory with real loads

Add “Min utrustning” in Settings, linked from the preview. Onboarding asks equipment families first; weight details are optional and can be added when selecting a load. Save once and reuse across programmes.

Represent separate inventory entries with stable ID, equipment type, kilograms **per implement**, and quantity. Support multiple fixed weights, plus adjustable equipment with an explicit list of available settings. Retain non-weighted equipment such as bands, chair and support. Equipment availability and chosen exercise load remain distinct.

Owner fixture, based on PRODUCT.md: dumbbells 2 × 5 kg and 2 × 10 kg, kettlebell 1 × 16 kg. Quantities remain editable; these values are not defaults for every user.

- Show choices such as “1 × 5 kg”, “2 × 5 kg · totalt 10 kg” and “1 × 16 kg”. Default picker offers physically available combinations matching the selected variant.
- Two-implement variants require two matching weights by default. Do not silently pair a 5 kg and 10 kg dumbbell. One kettlebell cannot satisfy a two-kettlebell variant.
- Keep stored/logged `weightKg` as total external weight for compatibility; explicitly convert per-implement inventory values to that total. Preserve variant and implement count so equal totals are not conflated in history.
- An explicit “Annan utrustning för detta pass” path supports a gym or borrowed weights without overwriting home inventory. Manual actual-result correction remains available even if the equipment was not registered.
- Availability is not a suitability recommendation: do not prescribe the only available 16 kg kettlebell automatically. If a prior/suggested weight is unavailable, explain it and ask for a compatible choice or exercise alternative; never round upward automatically.
- Retain repetition progression within its existing limits. No automatic jump from 5 kg to 10 kg per hand. At the repetition ceiling, explain that load changes are manual. Rehab dose stays prescribed.
- Old type/count preferences migrate as “Vikter ej angivna”, with the current manual load path still working. Never invent owned weights. Existing history and active session snapshots remain unchanged if inventory changes.
- Extend backup validation/version compatibility and draft invalidation for inventory edits. Keep all data local. Imported older backups must still work.

## 3. Body-part picker shared by library and editor

Reuse the library's catalogue, alias search, favourites and equipment matching. Add a compact broad-region selector: “Alla”, “Ben & säte”, “Bål”, “Rygg”, “Bröst”, “Axlar”, “Armar”. Offer existing individual muscle filters under “Mer specifikt”. Broad regions map explicitly to existing muscle metadata; they are training targets, not diagnoses.

- Show search plus body-part selector first. Put purpose, difficulty, favourites and equipment filters in one expandable “Fler filter” section with active count and reset. Default editor picker to available equipment; library retains its intentional browsing scope.
- Primary muscle matches precede supporting matches, labelled in text. Handle mobility entries without primary strength muscles explicitly; do not invent muscles just to fit a filter. Keep knee/running purpose independent of body region; “Rygg” must not imply suitability for back rehab.
- Result rows contain a static thumbnail, E-number, name, concise target/equipment text and Add/Replace action. Already-added exercises show their status; avoid duplicates. No dozens of simultaneous animations.
- “Byt övning” first offers compatible movement-pattern alternatives to preserve a balanced plan. A deliberate “Visa alla övningar” broadens the choice with a clear explanation; favourites do not override equipment, symptoms or rehab restrictions.
- Support zero matches, unavailable inventory, custom workouts and long Swedish names. Keep selected filters and return position while inspecting a guide.

## 4. Before and after feedback

Recommended policy: remove the mandatory full before questionnaire for ordinary general-strength/running sessions. Show an optional “Besvär eller något att anpassa idag?” disclosure in the preview. One primary “Starta pass” enters the first exercise directly when the draft is valid.

- For rehab, retain a compact pre-session symptom check inside the preview using the existing agreed rules. Recent reported symptoms may make this panel prominent for other programmes, but should not invent new clinical thresholds or recommendations.
- Record explicit skipped/not-answered state, not a synthetic “ready” or zero-pain response. Absence of a baseline means before/after change cannot be calculated. Keep symptom reporting accessible throughout the session.
- Keep after feedback as the main short check: overall feeling, then symptom fields only when relevant. Saving completes the session once and shows the summary; do not add another Finish confirmation.
- Allow “Svara senare” to save a completed workout with feedback pending. Missing after feedback must prevent an automatic increase under current progression rules. Returning later edits feedback, not completion timestamps or workout counts.
- Preserve targeted day-after follow-up under existing rules; do not ask every user three full questionnaires per workout.
- Update routing, resume, start timestamps, history labels, progression and backups together. Regression-test legacy knee pain gates separately; do not bypass them by globally removing the before guard.

These are product-flow recommendations. Existing symptom/stop policies remain the clinical boundary; changing those policies requires separate source review.

## 5. Fewer transitions during a workout

Desired flow: workout overview → first exercise → set complete → rest with next movement visible → next set → short after check → saved summary.

- Repetition sets keep one large “Set klart” action because the app cannot know when physical repetitions finish. Prefill planned values; make corrections secondary and retain undo.
- Put “Lätt / Lagom / Tungt” effort choices for the just-completed exercise inside the transition/rest screen. Answering should not restart rest or require an extra Continue. A skipped effort remains unknown and cannot qualify an increase.
- When rest ends, automatically show the next set's ready/instruction state. Preserve manual skip, add time and pause. New movement or equipment changes wait for readiness before starting a timed interval.
- Keep existing hands-free timed sequences within an exercise: preparation countdown, automatic logging, alternating required sides and planned rests. Do not auto-start a different timed exercise while the user is fetching equipment. Offer a clear “Redo – starta” there.
- Pause automatic sequences when the page is hidden; preserve resume behaviour and prevent duplicate logs under rapid taps, timer expiry, reload or undo.
- At the final exercise, collect any unanswered effort in the short finish flow without one screen per exercise. Do not default all efforts to easy. Keep movement and current timer dominant; no new persistent panel covering either.

## Delivery order and ownership

### Running programme: visible starting level

User follow-up: the running setup appears to have no initial effort/level selection, and the exercises may feel too easy. Source review confirms that “Träningsvana” exists for running but is hidden inside “Fler inställningar” and defaults to “Ny eller på väg tillbaka”. The initial dose uses the exercise's starting target; regular experience increases starting sets to three, while new/some use two. This does not establish an individually suitable load.

- Move a compact “Vana av styrketräning” choice into the visible running/general setup and make it editable from the preview summary. Distinguish strength experience from running experience; an experienced runner may be new to lifting.
- Explain three separate concepts: experience selects a starting proposal; technical difficulty describes movement complexity; reported effort describes how challenging the actual dose felt. Avoid a single ambiguous “level” controlling all three.
- Keep the running programme's movement purpose, but review how starting variants, repetitions and available loads are chosen for each experience level. More sets alone should not be presented as a complete advanced programme. Do not label simple-looking exercises ineffective or replace them solely because of their appearance.
- Preview should show “Startförslag – anpassa efter första setet”, with available-load choices and quick dose editing. Offer an explicit way to apply a corrected first-set dose to remaining unlogged sets; preserve the actual first-set log and previous history.
- Use actual effort feedback to support subsequent suggestions under the existing progression conditions. If a workout feels easy but the next owned load is a large jump, do not automatically increase it or exceed repetition limits. Personal rehab retains its separate prescription rules.
- Before implementing new strength-dose recommendations, verify their rationale against current primary exercise guidance and document the policy. No claim that the user's current exercises are too easy can be made from exercise names or equipment ownership alone.
- Acceptance: running/new, running/some and running/regular have visible, correctly persisted choices and honest explanations of any differences; changing experience does not overwrite active sessions or silently raise weight. Include both bodyweight-only and the owner's equipment fixture.

Include the visible-level control in stage A and inventory-aware starting-dose work in stage B; any progression-policy change receives separate rule tests and review.

| Stage | Deliverable | Suggested ownership |
| --- | --- | --- |
| A | Compact rows, disclosure state, separation, shared picker and body regions | Sol UI/state; Luna Swedish copy and region/empty-state review |
| B | Inventory schema, compatibility adapter, load choices and backups | Sol persistence/rules; Luna labels and example fixtures |
| C | Optional general pre-check, inline rehab check, pending after feedback | Sol session state/routing; Luna copy; integrator reviews progression/legacy gates |
| D | Effort during rest, automatic ready-state transition, resume/undo | Sol timer/state machine; Luna interaction review |
| E | Combined verification and bounded visual review | Integrator |

Agree shared inventory and check-in contracts before parallel edits. One owner per shared file, especially TrainingPreview, domain types and backup schema. Do not expand the exercise catalogue or change animation geometry as part of this work.

## Acceptance and verification

- Inventory fixtures: this owner's weights, one dumbbell, two unequal dumbbells, multiple identical implements, adjustable weights, no weights entered, borrowed equipment, deleted inventory and old backup. Verify all totals and equipment gates.
- Workflow fixtures: untouched preview, invalid collapsed row, switching exercises, cancel picker, undo removal, reload draft, interrupted session, missing before/after/effort, reported symptoms and personal rehab. No silent data loss or unearned progression.
- Compare taps for the same five-exercise fixture before/after. Target: one Start from a valid overview; one completion tap per repetition set; no mandatory post-rest Continue within the same exercise; one after-feedback save. Record equipment-readiness taps separately.
- Browser checks at 360/390 px and desktop, light/dark, keyboard, reduced motion and 200% text zoom. At least 48 px touch targets; no horizontal page overflow; clear exercise boundaries without colour; keyboard focus restored; sticky controls never obscure content.
- Unit tests for new pure rules and migration/serialization; focused browser journeys for the changed flows; static checks, production build and existing session/backup regressions. Retain initial JavaScript budget and static list thumbnails.
- One batched visual inspection, one correction batch and at most one confirmation round, following Impeccable. Record actual evidence rather than treating this planning review as visual validation.

## Decisions used for this proposal

The user requested a plan, so this document does not authorize implementation or deployment on its own. Suggested defaults are compact accordion editing, subtle alternating neutral rows, optional ordinary pre-check, retained rehab symptom entry, after feedback as the main check, and manual readiness for new timed movements. No extra onboarding questionnaire is proposed.
