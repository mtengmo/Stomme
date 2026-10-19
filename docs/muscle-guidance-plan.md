# Muscle guidance and exercise choice — review and implementation brief

Status: implemented locally on `feature/muscle-guidance`, 2026-10-19. Baseline: release `47d00ea`. The brief below records the agreed scope and staged design; implementation results are recorded at the end.

## Outcome

A beginner can answer “What does this train?”, find exercises for an area, and understand the movement without guessing what the animation's colours mean. Preserve the existing mobile notebook design and low-tap workout flow. This is an Operate surface for Swedish-speaking home exercisers.

Confirmed product direction: keep the running/knee-strength programme and Pass A/B, add muscle browsing, and allow reviewed exercise choices within those workouts. Exercise choices are part of the intended scope, delivered after the content and session-planning foundations. A general workout builder is outside this plan.

## Findings from the implementation

1. `ExerciseCard.tsx` displays muscle chips, but users must open an exercise to see them. `PassPreview.tsx` shows exercise names, prescriptions and progression reasons without training focus. Week cards are simply Pass A/B.
2. `Exercise.muscles` is an array of display strings. It mixes muscles/body regions with qualities: “Balans” and “Grepp”. Naming differs between exercises, which makes reliable filtering difficult.
3. `Figure.tsx` colours the near arm AND leg blue when a working side is supplied. This communicates side, not muscle involvement. The explanatory H/V legend exists on the detail card. It must not become a muscle legend accidentally.
4. Figures interpolate joint coordinates in a side view. They contain no anatomical surfaces. Mirroring the whole scene indicates the selected side; that does not establish which muscles or limbs are active in contralateral floor exercises.
5. The app has eleven exercises, fixed A/B templates and no browsable exercise-library route. It is not a general catalogue of chest, shoulder, back and arm training.
6. `startSession` builds from A/B; `replanSession` rebuilds from A/B after the before-pain reading. A UI-only replacement would be overwritten. History and scheduling also assume A/B.
7. Progression already looks up previous results by exercise ID, which is useful for future substitutions. Feedback and parts of the runner also key by exercise ID, so duplicate exercises within one session need to be prohibited unless those structures are redesigned.

## Proposed experience

### 1. Explain the existing programme

- Add a short programme-purpose sentence on the week screen and descriptive subtitles to A/B. Derive or editorially verify the subtitles against the actual exercises; do not suggest the two passes isolate separate muscle groups.
- Under each exercise in the preview, show a concise “Tränar främst: …” line. In the detail card show “Tränar främst”, “Hjälper till” and, where useful, “Tränar också” for qualities such as balance.
- Replace free-text filtering with stable muscle-group IDs and separate training-quality IDs. Keep Swedish labels in shared content. Distinguish the display grouping from the existing `kneeLoaded` rule.
- Audit the eleven exercise mappings before labelling anything primary/secondary. The existing unordered strings are evidence of intended content, not a verified ranking. Keep a source/review table with each mapping and resolve unclear anatomy before publishing it.
- Do not add activation percentages, diagnostic claims, or wording that promises an exercise fixes pain.

### 2. Discover exercises by training area

Add `#/ovningar`, reachable through a visible “Övningar” link on the week screen and a link from the preview. Keep the current three bottom-nav destinations for this first release.

Layout: heading “Övningar”; prompt “Vad vill du träna?”; wrapping filter chips; result count; a simple list of exercise names, primary muscle groups and equipment. Start with one selected group plus “Alla”; avoid unnecessary search and complex multi-filter logic for eleven items.

Use plain-language group labels based on reviewed content, for example front/back thigh, seat/hip, calves and trunk. These are navigation categories, not claims that a movement trains only that region. Separate primary matches from secondary matches or clearly label why a result matches. A chip on an exercise card should open the same library filter.

Selecting a result opens its explanation and animation. Show “Ingår i Pass A/B” where applicable and link to that preview. Wall sit remains marked optional. Browsing alone must not add exercises to a session.

States: all exercises, a selected group, no matches, invalid filter in the URL, return from a detail card, and browser Back. Persist the filter in the URL so returning restores it. Include a text-based alternative to any body-map input; do not require users to tap tiny anatomy regions.

### 3. Make the animation teach muscle involvement

Use two complementary views on the exercise card: the movement demonstration and a small front/back body map labelled “Muskler”. Show primary regions with solid fill and supporting regions with a distinct pattern/outline, accompanied by text. Do not encode the distinction with colour alone.

Prototype an optional “Visa muskler” overlay in the movement itself. Begin with chair squat, single-leg RDL and dead bug: these exercise bilateral motion, a hinge and contralateral movement. Resolve their anatomy mappings first. Review start, midpoint and end, both sides where relevant, plus light/dark and reduced-motion versions before extending to all eleven.

Implementation direction:

- Keep SVG and the current joint interpolation. Build region geometry in coordinates local to body segments, then transform it with the interpolated joints. Avoid fixed screen-space patches that slide off the moving body.
- The side-view skeleton cannot distinguish every region. Use the body map for regions that are hidden or ambiguous; do not draw invented visible anatomy. If the prototype remains unclear, ship the map and retain the movement drawing until a better silhouette is ready.
- Keep H/V as an explicit side label. Separate side highlighting from muscle highlighting, preferably with a labelled view toggle. A blue arm/leg must not imply that the whole limb is a target muscle.
- Keep muscle emphasis steady throughout the animation. Do not pulse intensity with the movement as though this measured activation.
- Add pause/play for the looping demonstration. Reduced motion shows labelled static frames and the static map. Text explains the same information for screen-reader users.
- The compact in-session figure prioritises movement and side. Detailed anatomy belongs in “Hur gör man?” so the set screen remains easy to use.
- Follow the existing palette semantics; do not repurpose the pain/stop or completion colours without reviewing the legend and updating design documentation.

### 4. Choose exercises within a workout (second release)

Add “Byt övning” in the pre-start preview only, with a deliberately reviewed list of compatible alternatives. Sharing a muscle group is not enough to declare two exercises interchangeable. If no reviewed alternative exists, say so; never invent one. “Återställ passet” restores the original selection. The current small catalogue may provide few useful alternatives.

Rules and persistence that must precede this UI:

- Store the selected exercise roster as part of the session definition/snapshot. Replanning after before-pain must preserve that roster and only update its prescriptions through existing rules.
- Freeze choices after the session starts for the initial implementation. An active session must render its stored plan in the preview, rather than mapping the default template and looking for matching IDs.
- Look up progression and previous load for the replacement exercise itself. Never copy another exercise's load, reps, unit or progression history. New-to-user exercises use their own initial prescription.
- Preserve all pain gates, the optional wall-sit handling and atomic writes. Exercise filters and choices must not be treated as pain clearance.
- Enforce one occurrence of each exercise ID per session. Specify where replacement set/rest prescriptions come from in the reviewed alternative definition; do not silently inherit an incompatible prescription.
- Keep A/B scheduling for adapted A/B workouts. Render completed-session counts from the stored plan. Preserve past sessions when content changes.
- Update import validation, backup compatibility and migration tests for any new persisted fields. Do not assume a new field can be added only to TypeScript.

Keep adapted workouts attached to their original A/B template. This scope does not require custom workout identities or a new scheduling system. Any additional exercises needed to provide useful alternatives must receive the same content, prescription, pain-rule and illustration review as the existing catalogue.

## Work packages for Sol / Luna

These were proposed assignments, not model benchmark claims. The user subsequently requested implementation by Sol and Luna. Two Sol agents implemented content/library and exercise-choice persistence; Luna implemented anatomy views and animation controls; the parent agent reviewed and integrated them.

| Package | Suggested owner | Inputs / files | Deliverable and acceptance |
| --- | --- | --- | --- |
| A. Content contract | Sol | `domain/types.ts`, `content/exercises.ts`, content tests | Stable group/quality IDs; primary/supporting roles; review table for all eleven; no persistence change required for display-only metadata. Resolve uncertain mappings before delegating entry. |
| B. Populate content and copy | Luna | Approved contract and reviewed mapping table from A | Populate all entries and Swedish labels; remove qualities from muscle groups; concise purpose text. Tests catch unknown IDs, duplicates and missing entries. Luna must flag gaps rather than invent anatomy. |
| C. Preview and library | Sol | A/B complete; `PassPreview.tsx`, `ExerciseCard.tsx`, `App.tsx`, new library feature | Focus lines, library and linked filters with URL/Back behaviour; existing start/continue flow retained; 360/412 px and both themes. |
| D. Muscle-map/overlay prototype | Sol | Approved mappings; `figures/Figure.tsx`, `poses.ts`, proposed new region renderer | Three-exercise proof with text legend, pause and reduced motion; no detached patches, side confusion or fake activation intensity. Decide whether overlays are clear enough before all-exercise rollout. |
| E. Bounded rollout and checks | Luna | Approved D geometry/visual contract | Apply the established pattern to remaining unambiguous exercises; add agreed labels and capture fixtures. Escalate geometry/anatomy ambiguity to Sol. No independent pose redesign. |
| F. Controlled substitutions | Sol | Explicitly approved alternatives and prescription policy | Snapshot/replanning changes before UI; persistence and backup handling; exercise-specific progression and active-session behaviour verified. Separate PR from display/discovery work. |
| G. Final integration review | Sol, then user visual review | A–E, or F separately | Check muscle labels against map and animation, all eleven poses, left/right, offline navigation and programme behaviour; document remaining content uncertainties. |

Order: A → B → C and D → E → G. C and D can proceed independently once the shared contract is fixed. F is confirmed in scope and follows a reviewed alternative list and the session-planning changes described above; it does not depend on completing every animation overlay. Keep commits bounded so content, discovery, exercise choices and anatomy visuals can be reviewed independently.

## Verification and release criteria

- User can find an exercise by its primary training area from the week screen within three taps, and can identify primary/supporting regions without relying on colour.
- Library filters and empty states are tested against the approved metadata, including invalid URL values and Back restoration.
- Visual review covers all eleven exercises at start/mid/end, unilateral side selection and contralateral floor poses. Automated geometry checks can catch detached patches; they cannot certify anatomical correctness.
- Touch targets at least 48 px, body text at least 16 px, labelled controls, keyboard access, reduced motion, light/dark and 360/412 px layouts.
- Offline library/detail navigation works after precaching. Keep initial JavaScript under the existing 150 KB gz target; lazy-load anatomy assets/library if needed and verify production output.
- For F, meaningful regressions: selected roster survives before-pain replan and reload; warning/stop rules still apply; replacement uses its own history; duplicates rejected; old backups remain supported according to the documented version policy; history stays unchanged by later edits.
- Run relevant unit/component tests and production browser flows for changed behaviour; update the existing accessibility walkthrough for new screens.

## Suggested first implementation brief

“Implement packages A–C in `docs/muscle-guidance-plan.md`. Keep the current A/B programme. Review and structure existing muscle content, expose exercise purpose in previews, and add the muscle-filtered exercise library. Resolve anatomical primary/supporting classifications with a source/review table. Do not implement workout substitutions or animation overlays in this change. Follow the existing design, test filter/navigation behaviour and verify both mobile sizes/themes. Then prepare package D as a separately reviewable prototype.”

## Implementation result

Implemented muscle metadata, the filtered exercise library, purpose labels, pre-start choices/reset and per-tab drafts, choice-preserving pain replanning, complete active previews, and backup validation for duplicate exercise IDs. The existing session plan is the persisted roster; no database or backup schema change is needed. Legacy backups remain supported.

All eleven exercises have front/back region maps. Chair squat, single-leg RDL and dead bug also have optional segment-attached animated overlays; the other exercises direct users to the map. Pause/resume preserves animation progress, and reduced motion shows static frames. Overlays deliberately remain a three-exercise prototype; extend only after reviewing additional geometry and region meaning. See `docs/muscle-content-review.md` for the content desk review and its limits.

Review fixes include default-roster recovery when an older session has an empty snapshot, snapshot-based weekly totals, counting unilateral sets once, prioritising an active third workout over earlier weekly completions, and wrapping six exercise tallies at 360 px. Audit runs now reserve an independent port so an old worktree's server cannot silently be checked.

Validation: 415 unit/component tests, 18 production Playwright tests, 46 light/dark mobile accessibility screen checks and all contrast checks pass. Type-check/lint and production build pass, with existing reduced-motion CSS lint warnings. Test concurrency is bounded to four workers to avoid resource-dependent timeouts on large Windows hosts. First-load JavaScript is approximately 136.5 KB gzipped including the shared content chunk and service-worker helper, below 150 KB. Mobile screenshots cover 360×800 and 412×915 in both themes, with static start/mid/end overlay fixtures. Impeccable's detector reports no findings on the new surfaces. Physical Android/TalkBack review remains manual.
