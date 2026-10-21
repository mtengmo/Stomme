# Exercise names, animation accuracy and viewing angles

Implementation brief — 2026-10-21. Original requirements are preserved below; catalogue comparisons describe the baseline before implementation.

## Implementation status

- Implemented: Swedish names/aliases, numeric equipment count choices, local favourites and backup support, explicit same-movement favourite replacements, history progress over 4/12 weeks, explainable next-session doses, and a conditional A/B outlook.
- Implemented: front/side pilot for goblet squat, Romanian deadlift and rack carry; corrected leg interpolation for step-up, lunges and stationary split squat; new E41–E48 movements and separate personal low-back workout creation.
- Rehab exercise selections require the user to enter their agreed dose. Known sheet values remain recorded below; ambiguous individual prescriptions are not filled in automatically. No automatic rehab progression.
- The high-step/barbell variant remains outside this release, as specified in the original comparison. Front views cover the three pilot exercises, not every equipment movement. Multiweek strength outcomes are not predicted; the outlook explains the next A/B sequence and recalculates doses from real results.
- Equipment count now displays numeric 1/2 with translation protection. This addresses the ambiguous “En” wording; Edge's actual automatic translation service has not been exercised by the automated browser suite.

### Release verification

- Static checks and production build pass; only the existing configuration/CSS warnings remain.
- Full unit suite: 740 tests pass. Browser verification: 28 distinct scenarios pass across the final runs, covering mobile/desktop, reduced motion, guide layout, symptoms/replanning, unstarted-workout editing, favourites and substitutions, history progress, personal low-back setup and the numbered catalogue.
- Reviewed a batched mobile/desktop capture and a new-movement contact sheet; corrected the mobile table overflow, working-side labels, support contacts and movement continuity. Numeric full-cycle tests cover the final pendulum swing and heel-slide alternation.
- Initial HTML-linked JavaScript measures about 129.5 KB gzipped (126.4 KiB), below the 150 KB target. Extra views/history remain in route chunks.

## Outcome

A beginner can identify an exercise from a Swedish training sheet, understand which leg moves and how to hold equipment, and read quantities reliably. Preserve the current notebook design, integrated how-to panel and prominent workout timer. Do not add more navigation pages or automatic camera changes during exercise.

## Comparison with the supplied sheet

| Sheet | Current catalogue | Decision |
| --- | --- | --- |
| Bulgariskt utfall på bänk | E06 Split squat keeps both feet on the floor | Different exercise. Add a separate rear-foot-elevated entry, provisionally E41, named “Bulgariskt utfall på bänk”. |
| Sidoplanka på bänk m. benlyft | E05 Sidoplanka is a timed floor hold | Different exercise. Proposed E42 “Sidoplanka på bänk med benlyft”; the pictured upper-foot support and lower-leg lift must be preserved. Copenhagen-style variant; verify the exact movement against a suitable source before authoring it. |
| Hög step up (m/skivstång) | E02 Step-up (20–30 cm), bodyweight or dumbbells | Related, not an exact match: height, knee drive and barbell setup differ. Keep E02 intact. Define a separate high-step variant only after establishing equipment support and source-backed setup. Do not display a barbell exercise with dumbbell geometry. |
| Utfall bakåt | E24 Bakåtutfall | Same exercise family and stepping pattern. Prefer “Utfall bakåt” as display name, retaining “Bakåtutfall” as a searchable alias. |

The sheet's “Övning 3 & 4 kombineras” is ambiguous without its full numbering/context. Do not infer a combined movement or superset. Its two sets and 10–20 reps are a supplied prescription, not new universal defaults.

## 1. Names and language reliability

- Audit all 40 names and add Swedish/common English aliases to searchable metadata. Examples: E06 “Stationärt utfall (split squat)”, E02 “Uppsteg på låda (step-up)”, E24 “Utfall bakåt”. Confirm names against the actual movement, not literal translation. Preserve stable IDs, E-numbers, load indices, saved workouts and history.
- Current HTML declares `lang="sv"`; no app translation layer was found. The reported “1” becoming “a” is unconfirmed. Reproduce the exact screen with Edge translation off/on, including live timer updates and navigation. Compare source strings with the translated DOM before choosing a fix.
- Keep quantity markup and accessible labels explicit, for example “1 repetition”, “1 set”, “1 kg”. Where browser translation changes values/identifiers, protect only those tokens with `translate="no"` and verify in Edge. Do not disable translation for all instructions.
- Reviewed English support would be a separate scope; automatic browser translation is not a reliable authored English edition.

## 2. Audit movement before adding viewpoints

- Record a review matrix for E01–E40: instruction match, start/middle/end and continuous movement, left/right, bodyweight and every distinct equipment setup, floor/bench contact and hand grip.
- Prioritize E02 step-up, E03 single-leg RDL, E06 split squat, E24/E25 lunges, then floor exercises and E29/E30 regressions. User-reported examples take priority when available.
- Most poses currently interpolate joint coordinates independently (`Figure.tsx`). This can shorten limbs during motion. This is a plausible mechanism, not a confirmed diagnosis for every reported animation.
- Replace affected interpolation with constrained joint rotation or two-segment solutions. Keep supporting feet planted, preserve intended limb lengths, and move knee/ankle/hip consistently. For front projections, allow expected projected shortening; do not apply side-view length assertions blindly.
- Add numeric regression checks for corrected geometry plus visual review of full loops. Good endpoints alone do not prove a good animation. Preserve existing E29/E30 specialized movement and hold timing.

## 3. Two useful angles in the existing how-to panel

- Add a compact “Vy: Från sidan / Framifrån” control only where both views are authored and reviewed. Keep “Ben: Höger / Vänster” separate: viewpoint and working side are different concepts.
- Render one animation at a time in the same space. Switching view preserves motion phase, pause state, working side and equipment; it never restarts a workout timer or changes logging.
- Default to the clearest view for each exercise. Keep the choice while viewing that exercise. Do not auto-switch while the user is exercising.
- Pilot on E12 goblet squat, E14 Romanian deadlift and E40 rack carry: these cover two-handed equipment, hinge depth, and one-sided grip. Retain E40's close-up because a distant front view cannot replace a grip detail.
- Author distinct front geometry, equipment placement and drawing order. Do not stretch or mirror a side pose and label it front view. Expand to other equipment exercises only after the pilot is reviewed.
- Reuse the viewer in guide, Granska and session help. Keep catalogue thumbnails static by default and only the selected visible animation running. Keep muscles in the same how-to section; check any overlays in their supported perspective rather than reusing incompatible paths.
- Mobile: one viewer, wrapping 48 px controls, no extra sticky layer, no added page scrolling for a second animation. Maintain blue working-side cues, orange equipment, text labels, both themes and reduced-motion alternatives.

## 4. Add the missing exercises

- Add the two bench exercises as distinct entries with new IDs and permanent E-numbers, source links, muscles, technical difficulty, equipment, setup/move/return instructions, easier options and reviewed animations.
- Model bench support explicitly, including custom-workout filtering. For the bench side plank distinguish timed holds from the pictured repeated lower-leg lifts; count repetitions on the selected side and do not reuse the timed side-plank dose blindly.
- Resolve the high-step/barbell variant separately: either implement actual barbell equipment throughout selection, load presentation and drawing, or explicitly scope a differently named bodyweight/dumbbell adaptation. Do not silently claim an exact match to the sheet.
- New entries belong in the library/custom workouts initially. Do not automatically add them to general knee conditioning or replace current programme exercises. Technical difficulty is not a rehab suitability rating.

## Delivery scope

This document is the consolidated implementation plan. The user has authorized application implementation, commit and push. Implementation follows the stages below, with the status above recording the delivered scope.

## Additional supplied sheets: lower back and knee

Added 2026-10-21. These are user-supplied individual exercise sheets, not evidence that every movement or dose suits all users. Store generic movement descriptions in the public catalogue, not the attached images, recipient identity or clinician identity. Preserve prescribed doses in an optional locally stored personal workout; do not replace the general knee-conditioning programme or invent a general low-back treatment programme.

| Sheet label | Catalogue comparison | Proposed catalogue wording/work |
| --- | --- | --- |
| Höftböjare 2 | Missing. E36 standing quadriceps stretch is not the same position. | “Höftböjarstretch i halvknästående”. Rear knee rests on the mat, front foot planted; author distinct geometry. Keep sheet label as an alias if useful. |
| Höftböjaren 8 | Missing. E32 prone leg raise moves the leg, not the upper body. | “Magliggande på underarmar”. Match elbows under shoulders and pelvis remaining on the surface. Do not turn it into a straight-arm press-up or claim a diagnosis-specific benefit. |
| Liggande korsrygg-kontroll 2 | Missing. E04 dead bug lifts limbs; this exercise slides a heel along the surface. | “Hälglidning med bålkontroll”. Alternate legs with trunk/pelvis still and heel contact maintained. |
| Balans-pendel på ett ben | Related to E03 single-leg Romanian deadlift, but arms reach forward and return includes a knee lift. | Separate “Balanspendel på ett ben” entry, rather than renaming E03 or reusing its weighted movement unchanged. |
| Enbensknäböj till stol | Missing. E01 chair sit-to-stand uses both legs. | “Enbensknäböj till stol”. Distinct unilateral entry with chair contact, free leg clear of floor and explicit return technique. |
| Bulgarian squats med fot på stol | Same elevated-rear-foot family as proposed E41 in the earlier sheet; not current E06. | Reuse one new entry; searchable aliases “Bulgariskt utfall”, “Bulgarian split squat”, “Bulgarian squats”. Describe a stable chair/bench support without duplicating the exercise for each prop. |
| Ettbens bäckenlyft | Related entries, but no exact match: E07 uses upper-back support; E23 is a two-legged floor bridge. | Add “Enbens bäckenlyft på golv”. Clarify E07 display name as an elevated-back variant while preserving its ID and history. |

Reserve final E-numbers centrally when implementing; only E01–E40 are currently allocated. Do not let parallel workers independently assign numbers.

### Dose transcription and timing requirements

These values record what is visible in the supplied sheets; they are not new app-wide recommendations.

- Half-kneeling stretch: 1 minute per side, 2–3 times daily.
- Prone on forearms: after running or every evening; no duration/repetition count supplied. Leave dose unresolved for the personal-workout setup rather than inventing one.
- Heel slides: 2 minutes daily, alternating legs within that total. This is a timed movement block, not a static hold or 2 minutes on each side.
- Knee sheet heading: stability/strength 3 times weekly. Balance pendulum: 3 sets, 10 repetitions, 5 seconds indicated. Single-leg chair squat: 3 × 10. Bulgarian split squat: 3 × 10. Floor single-leg bridge: 3 × 10, with a 2-second top hold explicitly stated.
- The balance pendulum's 5 seconds does not specify unambiguously where to hold. Confirm before encoding automatic phase timing. The unilateral repetition totals are not explicitly labelled per side on this sheet; do not silently reinterpret them in a personal preset.
- Distinguish duration per exercise, duration per side and hold per repetition in data and UI. Show “10 repetitioner · håll 2 sek i toppläget” for a confirmed bridge dose, not a two-second set countdown. Reuse hands-free side transitions for suitable timed work; do not require taps between individual repetitions.
- Personal prescribed doses must not be silently increased by normal strength progression. Review the custom-workout dose model before adding presets, and keep clinician-derived notes separate from generic defaults.

### Sol / Luna implementation handoff

Assignments describe ownership. Luna assisted with catalogue content, progress aggregation/UI and animation geometry; the integrator owns shared contracts and the combined release.

1. **Luna — content and naming specification.** Produce a single exercise matrix covering the original four and these seven sheet rows: exact match/related/missing, preferred Swedish name, aliases, setup/movement/return, equipment and contact points, primary/supporting muscles, proposed technical difficulty, source and unresolved dose details. Deduplicate the Bulgarian split squat. Use original wording for generic instructions, verify new exercise guidance against authoritative sources before publishing, and do not infer medical suitability from a sheet heading. Own a draft content document, not shared domain types or E-number allocation.
2. **Sol — geometry audit and implementation design.** Audit current leg paths and equipment quantity inputs first. Define distinct movement models for the missing exercises and the two-view pilot, including planted contacts, support props, left/right behavior and grip. Review timing/data needs for alternating heel slides versus timed holds and per-repetition holds. Keep current timers, backups and saved-workout IDs compatible. Own animation code and its focused tests once implementation is authorized.
3. **Integrator — shared contracts and catalogue wiring.** Review Luna's matrix, allocate IDs/E-numbers once, settle equipment and dose types, then integrate content, search aliases, custom-workout availability, persistence/backup validation and viewer controls. Sol and Luna should not concurrently edit the same catalogue/type files. Use documented contracts before parallel implementation.
4. **Joint acceptance.** Compare each new animation to its written instructions and supplied movement, checking a full cycle rather than endpoints only. Verify no incorrect equivalence with E01/E03/E04/E06/E07/E23/E32/E36; no personal identifiers or sheet images in tracked/public assets; no invented prescription values; and no new automatic rehab assignments. Run the existing acceptance checks below.

The first useful delivery is accurate naming and existing-animation fixes, followed by new catalogue entries and the two-view pilot. Personal prescribed-workout presets remain dependent on resolving the ambiguous dose fields; generic catalogue work can proceed independently.

## General programme, favourites and next-workout suggestions

### Verified baseline behaviour

- “Bli starkare” selects “Allmän styrka”, with A/B rosters in `src/rules/programRosters.ts`. A: goblet squat, Romanian deadlift, supported row, floor press, farmer carry, dead bug. B: bridge, step-up, shoulder press, supported row, hammer curl, side plank. Equipment availability filters the roster, so actual coverage can be narrower than the full template.
- `src/rules/training.ts` restores the latest completed exercise result within the same programme. It proposes +1 repetition up to the exercise ceiling when required sets/sides are logged, effort was easy, the after-check was good, no symptoms were reported and planned sets have not increased. Otherwise it generally repeats the last level. It does not automatically increase weight or supply a multiweek forecast. Rehab does not automatically progress. Do not confuse this with the separate legacy progression engine.
- No favourites-driven exercise selection is currently implemented.

### Proposed behaviour

- Add an accessible heart toggle labelled “Favorit” / “Ta bort favorit” to library entries and the guide; add a favourites filter. Store locally by stable exercise ID, include it in backup validation/export, and keep old backups compatible. Use pressed state and text, not colour alone. Favourite means enjoyment/preference, separate from effort, symptoms and completion.
- Let favourites influence suggested replacements within suitable movement slots, while respecting available equipment, training context and experience. Do not append more exercises every time a heart is selected or repeatedly replace familiar exercises: preserve the chosen session size and continuity for progression.
- Review full-body A/B coverage after equipment filtering. Explain unavailable slots and offer compatible alternatives rather than claiming full-body coverage for every filtered roster. Prefer a balanced programme over choosing only the most-liked body area.
- Show an editable “Förslag nästa pass” preview with the proposed dose and plain-language reasons (“Samma som senast”, “+1 repetition”, “En av dina favoriter”). Explain when there is insufficient history. Keep exercise selection and dose progression as separate decisions.
- A later multiweek outlook should be conditional, not a promised result: show planned A/B sessions and explain what would allow an increase. Recalculate after actual logs and check-ins; do not forecast guaranteed strength gains or auto-raise weights without a reviewed progression policy.
- Before extending progression, verify every logged set met its target, consistent load/variant, both required sides, relevant before/after/day-after symptoms, and incomplete/skipped workouts. The existing completion check counts set/side presence; it is not sufficient evidence by itself for more ambitious progression.
- Personal low-back rehab must be visibly separate as “Ländrygg – personligt rehabprogram”. Hearts can bookmark its exercises but must not automatically replace prescribed exercises, add work or increase dose.

### Assignment and acceptance

- Luna: favourite labels, empty states, recommendation explanations and content/movement-slot matrix for balanced alternatives.
- Sol: favourite persistence and backup compatibility, deterministic selection rules, next-session preview and progression edge-case tests. Shared schema changes go through the integrator before parallel edits.
- Test toggling/removal, reload/export/import, no favourites, all favourites incompatible, all favourites in one body area, unchanged session size, stable exercise history, and rehab exclusion. Verify favourites cannot override symptoms or equipment constraints.

## Progress over time: Din utveckling

### First delivery

Extend History with one overview and an exercise detail chart, using existing sessions, set logs and check-ins. No additional post-workout questionnaire is needed. Keep the existing history list and access to individual workouts.

- Offer 4- and 12-week ranges. Show completed workouts per local calendar week (Monday start), including zero-workout weeks. Count completed sessions once; show partial/aborted work separately rather than counting it as a completed workout. Label general strength, running and rehab contexts explicitly.
- Exercise selector: only exercises with recorded results, with stable E-number and current Swedish name. Filter by programme, equipment variant and side. Do not merge dumbbell/kettlebell results simply because their kilogram values match. Label unknown legacy variants and keep them separate.
- Show chronological session results for weight, repetitions, hold duration or distance, using the exercise's actual unit. Keep the weight convention explicit (per implement or combined, according to the recorded variant). Provide a readable session breakdown and text/table alternative to the chart.
- First version: plot recorded set values or a clearly labelled per-session range; never silently sum both sides or present the last set as the whole workout. Show completed/planned sets as context, including changes in dose and incomplete work. Use dates with real gaps; missing sessions are not zero strength.
- Display effort and symptom reports alongside results. Missing answers mean “Svar saknas”, never “Inga besvär”. Keep symptom area, side and timing visible; do not average unrelated body areas or infer recovery from increased load.
- A summary such as “8 → 12 repetitioner med samma vikt” requires comparable exercise, variant, side, weight and set structure, with the referenced dates available. When those differ, display the actual results without a blanket improvement claim. No estimated strength score or combined strength/rehab ranking in this delivery.
- Personal rehab emphasizes completion of the prescribed work and recorded symptoms. Keep its fixed prescription separate from strength progression; graphs do not automatically change the dose.
- Below measured results, link to the editable next-session suggestion and explain its rule. Future suggestions are labelled as suggestions and never plotted as completed results.

### States and implementation

- No history: explain that the first saved workout will appear here and link to training. One result: show it and explain that comparison needs another comparable result. Support no results in selected range, missing feedback, mixed variants, deleted custom workout names and older backups.
- Sol owns pure aggregation/comparison functions, date boundaries and tests, reusing `src/rules/history.ts` and existing chart infrastructure where suitable. Luna owns Swedish labels, explanation rules and empty-state copy. The integrator builds the History UI after these contracts agree, avoiding concurrent edits to shared files.
- Keep aggregation read-only: no database migration or destructive rewrite is required for deriving charts from existing logs. If additional metadata is later needed, mark its absence honestly for old records. Keep all data local and preserve export/import.
- Acceptance fixtures: both sides, multiple sets/weights in one session, changed equipment, partial sessions, skipped exercises, missing feedback, repeated sessions in one day, DST/week boundaries, 4/12-week ranges, sparse history and imported legacy records. Verify keyboard access, 360 px mobile layout, light/dark contrast and reduced motion. A text/table alternative must convey the chart's meaningful values.

## Implementation sequence and ownership

| Stage | Deliverable | Lead / dependency |
| --- | --- | --- |
| 1 | Reproduce equipment translation; Swedish aliases; catalogue/source matrix | Luna content, Sol reproduction; integrator allocates IDs |
| 2 | Audit and correct existing leg movement | Sol; independent of new catalogue entries |
| 3 | History progress overview and comparable exercise results | Sol aggregation, Luna copy, integrator UI |
| 4 | Local favourites and balanced replacement suggestions | Sol persistence/rules, Luna copy; shared backup contract first |
| 5 | Three-exercise front/side pilot in the existing viewer | Sol geometry, integrator UI; reviewed before expansion |
| 6 | Missing sourced exercises and personal rehab support | Luna source/content, Sol movement; centrally allocated IDs |
| 7 | Explainable next-workout preview and conditional outlook | Integrator; depends on comparable history and reviewed rules |

Stages can be committed independently after relevant checks. Preserve current programme behaviour until its replacement is tested; unresolved prescribed doses block only the affected personal preset, not other stages. Final release review checks the combined result before application code is pushed.

## Release checks

Follow the implementation sequence above. Run the combined checks before committing and pushing application code; record actual verification in the release handoff.

- Catalogue integrity and alias search tests; old backups/custom workouts still load without renumbering.
- Targeted geometry and equipment-count/contact tests; actual visual inspection across both sides and selected views.
- Mobile/desktop browser checks: controls do not hide instructions, view changes preserve timer/phase, reduced motion remains usable, only one loop renders, both themes retain contrast.
- Edge translation verification is manual evidence; automated markup assertions alone cannot prove browser translator behavior.
- Build and static checks, relevant unit/browser suites and bundle-size comparison before release. Lazy-load extra perspective data if needed; retain the existing initial-JavaScript budget.
- One batched visual review, one correction batch and at most one confirmation round. Keep a concrete remaining-issues list rather than declaring every pose biomechanically validated.

## Evidence and unresolved details

- Catalogue and geometry inspected in `src/content/exercises.ts`, `additionalExercises.ts`, `exerciseReferences.ts`, `src/figures/Figure.tsx` and `poses.ts`.
- NASM Bulgarian split squat reference: https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat
- Copenhagen support/lever-arm context: https://www.sportsmith.co/articles/measuring-monitoring-and-training-for-athletic-hip-and-groin-function/ . This establishes related variants, not an exact source for the pictured lower-leg repetition.
- User follow-up: “1 → a” was probably in an input form showing the number of dumbbells (hantlar). Start reproduction with equipment quantity fields/options in Edge, comparing translation off/on and distinguishing equipment count from weight. Exact field and cause remain unconfirmed.
- Await exercise numbers with strange legs. These narrow reproduction work but do not block the catalogue/geometry audit.
