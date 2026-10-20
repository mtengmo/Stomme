# Broader strength library and context filters

Planning baseline: 2026-10-19, app 0.1.74 / commit 96f2913. Status: proposed implementation plan; no new exercises or training prescriptions have shipped.

## Outcome

Expand Stomme into a useful home strength library covering legs, hips, back, chest, shoulders, arms and core, with dumbbells and kettlebells. Keep the existing knee/running programme selectable. Let users find exercises by purpose without treating a purpose tag as a personalised prescription.

First deliverable: 27 exercises (the existing 11 plus 16), searchable and filterable, with instructions, equipment variants and individually reviewed movement demonstrations. Next deliverable: a separate general-strength programme that can be logged using the existing session experience. History redesign remains deferred.

## Filters and navigation

Put a single-choice purpose filter above the exercise results:

| Swedish label | Meaning |
|---|---|
| Alla | Entire library |
| Allmän styrka | Exercises curated for general strength |
| Knäfokus | Curated knee-focused collection; inclusion needs an exercise-specific rationale |
| Löpstyrka | Curated running-support collection; may include hips, calves, trunk and single-leg control |
| Mitt program | Exercises in the user's selected programme, including chosen alternatives |

Combine purpose with muscle, equipment and technical difficulty. Offer name/reference search. Show the result count and active filters, with a visible clear-filters action. Keep choices in the URL so Back and shared links restore the same results. Use AND across filter categories; multiple muscles within a category use OR. For equipment, match a complete supported variant and all its requirements, including one versus two weights and any bench/step/support. Do not match an exercise merely because one required item is available.

Examples:

- Löpstyrka + Kettlebell + Säte.
- Knäfokus + Kroppsvikt + Grundläggande.
- Allmän styrka + Hantlar + Bröst.

On small screens, show purpose and search directly; put the remaining options behind “Fler filter” with an active-filter count. Preserve the bounded exercise reader and visible close/back controls.

“Mitt program” is exact membership. “Knäfokus” and “Löpstyrka” are overlapping curated collections, not synonyms for that membership. Never derive them from the existing `kneeLoaded` flag: that flag currently controls pain-related progression logic, not suitability. A “Rehab” shortcut should mean the user's actual rehab programme, with no universal “rehab-safe” badge.

## Proposed additions

References below are reserved proposals. Preserve E01–E11 and their IDs. Equipment variants share a reference when the movement is the same; mechanically different exercises retain separate IDs.

| Ref | Exercise / Swedish display name | Initial equipment variants | Delivery |
|---|---|---|---|
| E12 | Goblet squat / Gobletknäböj utan stol | One kettlebell or dumbbell; bodyweight variant | First library release |
| E13 | Kettlebell deadlift / Marklyft med kettlebell | One kettlebell | First library release |
| E14 | Dumbbell Romanian deadlift / Rumänskt marklyft med hantlar | Two dumbbells | First library release |
| E15 | Supported one-arm row / Enarmsrodd med stöd | One dumbbell or kettlebell, stable support | First library release |
| E16 | Dumbbell floor press / Hantelpress på golv | Two dumbbells | First library release |
| E17 | Dumbbell shoulder press / Axelpress med hantlar | Two dumbbells | First library release |
| E18 | Farmer carry / Farmergång | Two dumbbells or two kettlebells | First library release |
| E19 | Biceps curl / Bicepscurl | Two dumbbells | First library release |
| E20 | Hammer curl / Hammarcurl | Two dumbbells | First library release |
| E21 | Lateral raise / Sidolyft | Two dumbbells | First library release |
| E22 | Triceps kickback / Triceps kickback med stöd | One dumbbell, stable support | First library release |
| E23 | Glute bridge / Bäckenlyft med båda benen | Bodyweight or one dumbbell on hips | First library release |
| E24 | Reverse lunge / Bakåtutfall | Bodyweight or two dumbbells | Second library release |
| E25 | Forward lunge / Framåtutfall | Bodyweight or two dumbbells | Second library release |
| E26 | Two-hand kettlebell swing / Kettlebellsving med två händer | One kettlebell | Second library release |
| E27 | One-arm kettlebell press / Enarms axelpress med kettlebell | One kettlebell | Second library release |

This list is a product scope proposal, not a workout to perform in one session. Exercise-specific instructions, muscle mapping, difficulty and context tags need source review during implementation. Existing single-leg RDL, split squat, calf raise, suitcase carry and core exercises remain useful library entries.

The second release gets separate animation work for stepping, changing support and ballistic movement. Swings require a distinct hip-hinge demonstration and timing model; do not animate them as squats or apply a universal “lower for three seconds” cue. Cleans, snatches, Turkish get-ups and pistol squats can follow later as separately reviewed content.

## Difficulty, variants and loading

- Technical difficulty: `Grundläggande`, `Viss vana`, `Teknikkrävande`. Include one short reason such as balance demand, setup or coordination. Classify the variant, since support can change the difficulty.
- Perceived effort: keep the existing `Lätt / Lagom / Tungt` answer after an exercise. It describes that workout and remains separate from technical difficulty.
- Equipment: explicit variant records for implement type, quantity, support, hand placement, side behaviour, instructions and demonstration. Stop inferring kettlebell/dumbbell type from Swedish label text.
- Load: show both per-implement weight and total, e.g. “2 × 5 kg · totalt 10 kg”. General exercises need their own selectable loads; do not copy the current 10/16 kg ladder into every exercise.
- Keep load history stable: existing logs store ladder indices as well as weight. Do not reorder or replace old ladders silently. Snapshot the selected variant and actual load for future sessions and define how older logs are interpreted.
- Each exercise needs an easier option that can actually be selected and shown correctly. A textual easier-variant note alone must not change the logged movement without an explicit choice.

## Content and review requirements

For every new exercise/variant, provide Swedish name, permanent reference, primary and secondary muscles, technical difficulty with explanation, equipment requirements, setup, three concise movement cues, common mistake and easier option. Add the reason for each context tag and source/review metadata.

Expand muscle groups and the body map to include chest, shoulders, biceps, triceps and forearms. Preserve stable existing IDs. Keep grip, balance and power as training qualities rather than anatomical muscles.

Demonstrations must show the selected implement, one/two weights, working side, start/end positions and a meaningful midpoint where needed. Check floor/body contact, support, range and equipment placement. Each new motion needs authored poses; reusing a visually incorrect motion is not an acceptable fallback. Provide equivalent static frames under reduced motion. Muscle overlays are approximate educational locations, never measured activation or injury-risk scores.

Use the review page to inspect every exercise, side and equipment variant before release. Retain text guidance and the muscle map when a motion overlay has not yet been reviewed.

## General workouts as a separate programme

After the expanded library works, add an opt-in `Allmän styrka` programme with two full-body session templates. Design slots around squat/lunge, hinge, push, pull, carry and core; include upper-body coverage. Exact exercises, sets, repetitions, rest and progression require a separate content review before release.

Keep the current programme available as `Knä och löpning`. Switching programme must preserve completed sessions and never rewrite an active session. Show programme names in session previews and stored session details. Programme choices are distinct from temporary library filters.

The current code assumes templates A/B, a programme week, first-week bodyweight and knee-oriented pain rules. General training needs an explicit programme policy rather than applying those rules to every new exercise. Keep programme-specific allowed substitutions; matching a muscle or purpose filter alone must not authorise a replacement in the knee programme.

## Training-direction setup and feeling questions

User-approved addition, 2026-10-20.

On first use, ask “Vad vill du träna?” with three choices: `Allmän styrka`, `Styrka för löpning`, and `Mitt rehabprogram`. Follow with available equipment; ask general-strength users about training experience. Remember the selection and expose “Byt träningsinriktning” from the programme overview. Before subsequent workouts, show the selected programme and “Starta pass” without repeating setup.

Existing users retain their current programme and can opt into another direction. Never interrupt or rewrite an active session. Choosing rehab means following an individually selected programme; selecting that label alone must not generate a personalised rehab prescription. Library filters remain independent of the saved training direction.

Retain feeling questions, with explicit programme-specific policies:

| Timing | Allmän styrka | Styrka för löpning | Mitt rehabprogram |
|---|---|---|---|
| Before the workout | Readiness and any pain | Readiness and any pain | Programme-specific symptom check |
| After each exercise | `Lätt / Lagom / Tungt` effort rating | Same effort rating | Same effort rating, with changes limited by the rehab programme |
| After the workout | Overall feeling; symptom follow-up if reported | Overall feeling and symptoms | Programme-specific symptom follow-up |
| Next day | Conditional follow-up when relevant | Conditional follow-up when relevant | Follow-up according to the rehab programme |

Keep perceived effort, readiness, overall feeling and pain as distinct data fields and questions. “Tungt” must never imply pain; “Lätt” must never override reported symptoms. Provide a separate way to report pain during an exercise, without waiting for its completion. General training must not force every symptom into the current right-knee field: store body area and side where relevant. A skipped or unanswered check remains unknown, never zero pain or normal readiness.

Each programme policy must explicitly define which questions appear, required versus optional answers, follow-up triggers, progression limits and the explanation shown to the user. Implementers must not invent medical thresholds or reuse the current knee threshold for every programme. Exact readiness choices and their effect on a workout are a content/policy review item; do not automatically alter a prescription based on an undefined score.

Use exercise effort to inform future repetitions/load only within the selected programme's reviewed progression rules. Evaluate symptoms separately before offering progression. Show a short reason for the next suggestion, based on the actual recorded answers. Next-day questions appear in the app when due; push notifications are outside this scope.

Persist answers with session/exercise identity, timing, programme identity and policy version so switching direction cannot reinterpret earlier answers. Preserve existing effort and knee-pain records during migration, resume and backup round-trips. This work adds the data and session flow needed for feedback; it does not resume the deferred history redesign.

## Implementation sequence

1. **Content model and filter foundation.** Add purpose, technical-level and structured variant metadata. Expand muscle taxonomy and maps. Implement combinable filters, URL persistence, result counts and empty states using the existing exercises first. Record explicit rationales for the knee/running collections.
2. **Core library expansion.** Add E12–E23 with reviewed instructions, poses, variants and source records. Expand review controls to select equipment and difficulty variants. Keep the programme roster unchanged during this stage.
3. **Stepping and kettlebell movements.** Add E24–E27 with correct side changes, setup and motion-specific guidance. Review every pose and load configuration.
4. **Programme setup, feedback and persistence.** Add the training-direction setup above, programme identity and separate policy/templates. Implement programme-specific feeling questions and explanations alongside explicit user-selected loads, validated alternatives and stable session snapshots. Update backup schema/version and migrations as required. Preserve old A/B sessions, effort ratings, knee-pain answers and backups.
5. **Release validation.** Verify filters, selected variants, session logging, resume, imports/exports, offline use, accessibility and live deployment. Keep the automatic commit version in Settings.

Implementation touchpoints: `src/content/exercises.ts`, `muscles.ts`, `exerciseReferences.ts`, `alternatives.ts`, `loadPresentation.ts`; `src/domain/types.ts`; library/review/session features; figures and overlays; progression/next-plan rules; database and backup validation. The backup parser explicitly validates exercise IDs and A/B templates, so extending the catalogue/programmes includes updating those validators, not just adding UI entries.

## Acceptance criteria

- All 27 entries have permanent IDs/references and complete reviewed content; no placeholder poses ship.
- General-strength browsing finds upper-body as well as lower-body exercises.
- Knee and running filters have explicit membership and rationale; programme membership is independently correct.
- Equipment filters match usable variants; selecting a variant updates instructions, picture, load labels and logged identity consistently.
- Context, equipment, muscle and technical-level filters combine correctly and survive Back, reload and shared URLs; empty results offer clear recovery.
- Existing workouts, progression, exercise references and historical logs continue to work. New data round-trips through backup; older supported backups import through tested migrations.
- First-use training direction and equipment choices are remembered; existing users retain their programme. Switching direction affects future sessions only and does not alter library filters or active workouts.
- Feeling questions follow the selected programme policy. Effort and pain stay independent; missing answers remain unknown; symptom reports cannot be overridden by an easy-effort answer. Next-session explanations agree with the actual inputs and policy.
- Tests cover all three directions, conditional symptom/next-day questions, an easy-but-painful exercise, a hard-without-pain exercise, unanswered checks, session resume and migration of existing feedback.
- Both sides and all equipment variants work in normal and reduced-motion views; the document remains bounded on mobile and desktop help/review screens.
- Meaningful tests cover filter combinations, equipment quantity, loading snapshots, programme isolation, side transitions and backup compatibility. Run static checks, unit tests, browser flows and light/dark accessibility audits.
- Lazy-load expanded illustration/content assets as needed to keep first-load JavaScript below the existing 150 KB gzip target and preserve offline access after installation.

## Reference basis and limits

- [ACE exercise library](https://www.acefitness.org/resources/everyone/exercise-library/) demonstrates independent body-part, experience and equipment categories. It is a starting point for exercise-specific source review, not approval of this entire proposed catalogue or its eventual classifications.
- [AAOS knee conditioning programme](https://orthoinfo.aaos.org/globalassets/pdfs/2017-rehab_knee.pdf) is a knee-specific conditioning reference that calls for selecting exercises with a doctor or physical therapist. It supports keeping personalised rehab distinct from broad library tags.
- [NHS knee exercises for runners](https://www.nhs.uk/live-well/exercise/knee-exercises-for-runners/) is a discovery reference for the running/knee collection. Its accessible page content was limited during this planning pass; verify individual exercise guidance before using it as content evidence.

These sources inform the plan. They do not clinically validate the existing programme, the proposed additions, or an individual's suitability for an exercise.
