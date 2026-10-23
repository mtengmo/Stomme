# Animation clarity: review and Sol/Luna implementation handoff

Status: implemented 2026-10-24, verification below. Supplements the existing animation audit and exercise-clarity plan; neither is replaced.

## Implementation and verification

- Luna supplied the side-meaning module and E42 return wording. Integration corrected bridge cues (planted foot rather than standing), stretch cues, Dead bug's non-supporting raised limbs, and added the rack-carry entry. All unilateral catalogue entries have explicit cues. Shared session labels preserve stored side values.
- Sol supplied the three front-view pilots and tests. The combined visual pass corrected step-up head clipping and made suitcase walking alternate both feet.
- E27/E39 use a forearm-relative supported press grip, with one bell and a neutral-wrist hand drawn over its handle. The guide magnifies the actual press start geometry in its own close-up; E40 keeps its existing rack close-up.
- Demonstration hold and relaxation times now use `exerciseMetadata`, the same values displayed by the guide/set screen. No personal dose or progression rules changed. Explicit holds: E28–E34 and E51 5 s; E38 and E48 2 s. E32–E34 relax 2 s. E49 retains its pre-existing editorial 3 s visual contraction, without presenting that as a prescribed dose. Other controlled demonstrations retain 0.8 s pauses; ballistic and static-hold movements retain their separate behaviour.
- Geometry tests sample 41 positions for each press, both sides, checking one bell, forearm-relative orientation and head/floor clearance. Timing tests cover hold, relaxation and cycle seam. All 1,021 unit tests pass.
- `scripts/animation-fix-shots.ts` captured nine outward/return phases on both sides for E04/E10/E27/E39/E42 and the three front pilots at 390 px dark and desktop light. One batched review plus a targeted confirmation of the two visual corrections. The script uses the real movement path through the DEV phase hook; it is sampled visual evidence, not human biomechanical certification.
- Browser checks include the paired side switch, press close-ups and three front views at mobile/desktop, plus the existing reduced-motion, timer, session and guide regressions. Initial HTML-linked JavaScript remains about 135 KB gzipped, below 150 KB. The Impeccable detector returned no findings for changed UI surfaces.
- No beginner participant was available: comprehension validation remains outstanding. E42's exact variant still follows the supplied sheet with the qualified research note. Further front views listed below remain subsequent scope.
- Final checks: static checks and production build pass. Full browser run: 87/94 passed initially; six assertions expected old side labels and the seventh exposed a selector whose accessible name included its explanatory text. Updated the assertions and separated the selector name/description; all 19 affected guide, training, kettlebell and smoke journeys pass on the final build. All 94 scenarios are covered across those runs.

## Evidence and limits

Reviewed current rendering, pose generators, instructions, equipment rendering, side labels and cycle/hold selection against the previous catalogue contact sheets and the supplied exercise sheet. This follow-up is a source-code and reference review, not a fresh observation of every live loop. Full-cycle visual acceptance remains required before claiming the fixes are complete. Software tests and three static frames do not establish anatomical accuracy or beginner comprehension.

Correction to the earlier audit: `stillOnly` only affected reduced-motion rendering. Removing it enabled Start/Slut frames in that mode; it did not restore a universally frozen review page. The previous statement that every exercise is sufficiently understandable was stronger than the evidence supports.

## Confirmed findings

| Priority | Finding and evidence | Required change |
| --- | --- | --- |
| P1 | E42 text says to lower the hip after each repetition; `rehabPoses.ts` fixes the hip at `[102,132]` throughout the lower-leg lift. The supplied sheet describes holding the plank while repeating the lower-leg movement. | Keep the sheet's held-plank variant. Rewrite the return instruction so the lower leg returns each repetition and the hip lowers after the set. Explicitly identify the side lying towards the floor and the upper supported foot. |
| P1 | E27 and E39 use the generic hanging kettlebell. Only E40 opts into the special supported grip in `Figure.tsx`; `Held` uses a fixed rotation for that rack illustration. | Author a press-specific hand/forearm grip for E27/E39 over the entire motion. Derive bell orientation from the forearm and grip, preserving contact and a neutral wrist. Do not simply apply E40's fixed rotation to moving arms. |
| P1 | E04/E10 move opposite limbs and now colour them correctly, but `sideLabel` only knows a generic side noun and the guide still says that the right/left side works. | Show the explicit pair across guide, set, preparation and transition text. Right means right arm plus left leg; left means left arm plus right leg. Preserve the existing stored side meaning. |
| P2 | E53 already explains moving versus standing foot locally; other unilateral exercises use the same generic wording despite different side meanings. | Centralize descriptive side cues with explicit overrides: E03/E46/E47 selected standing leg; E43 selected kneeling leg; E33 selected upper leg; E34 selected lower leg; E42 selected lower body side; E53 selected moving foot. Review E07/E48 selected planted foot as well. |
| P2 | `END_HOLD_MS` specifies E30, E51, E48 and E49, while E28/E29/E31–E34/E38 instructions also contain holds. A generic explanatory tempo disclaimer does not make these demonstrations show the stated hold. | Inventory explicit hold and relaxation durations against metadata, source notes and personal programme overrides. Establish one demonstration timing policy and eliminate accidental conflicting values. Do not turn a repetition hold into the session's set duration. |
| P2 | Profile views hide frontal knee alignment and carry side lean. Existing E12/E14/E40 front views form a useful pilot. | Add separately authored front views for E02, E41 and E09 first, after P1 fixes. Preserve phase, side, pause and equipment when switching. |

## Decisions and proposed Swedish copy

- E42 step 3: “Sänk den nedre foten kontrollerat till golvet medan höften hålls uppe. Ett benlyft och en sänkning är en repetition. Sänk höften lugnt när setet är klart.” Keep the first two setup/lift steps. The loop demonstrates repetitions within the held plank; explain that setup and finishing are outside that loop.
- E04/E10 right cue: “Höger arm + vänster ben”. Left cue: “Vänster arm + höger ben”. The switch button can retain “Byt sida”, with the pair in its accessible name.
- E03/E46/E47 right cue: “Stå på höger ben”. E53 right cue: “Höger fot rör sig · stå på vänster ben”. Blue is a selected-limb cue, not a universal claim that only that limb works.
- E27/E39: retain original movement-specific setup instructions. A shared grip close-up must show the appropriate press orientation; do not relabel the upright rack-carry image as a floor-press diagram.
- Keep one main viewer. Add angle controls only where both views exist. No automatic camera changes, extra guide pages or smaller timer area. Keep orange equipment, theme tokens, 48 px controls and static library thumbnails.
- No new exercises, prescribed doses, automatic progression or storage-side reinterpretation in this work.

## Ownership and sequence

### 1. Luna: content and side-meaning specification

Own a small content module (suggested `src/content/exerciseSideCues.ts`) and its focused tests, plus instruction/source-note edits in `rehabAdditions.ts`, `additionalExercises.ts` and `exerciseMetadata.ts`. Produce an explicit side-meaning table for all unilateral exercises, including which arm/leg supports versus moves. Fix E42 wording first. Review press grip wording against the references below. Create a timing table listing exercise, text hold, animation hold, metadata hold and programme override; flag unresolved differences rather than guessing a prescription.

Contract: export a pure cue function keyed by stable exercise ID and existing right/left/both value. Return compact label and explanatory sentence; keep general `sideLabel` compatibility until the integrator updates consumers. Do not edit `Figure.tsx`, session state or shared domain schemas.

### 2. Sol: geometry and demonstration timing

Own `src/figures/props.tsx`, `additionalPoses.ts`, `rehabPoses.ts`, `frontViews.tsx` and geometry tests. Implement E27/E39 supported press grips with explicit grip modes and forearm-relative transforms. Check start, lift, lockout, lowering and loop seam on both sides. Keep bell count and floor/bench contacts correct. E42's hip remains raised during repetitions, matching the agreed copy. Implement the reconciled demonstration timing table after Luna's source review, leaving workout countdown and logging untouched.

Then author the three front-view pilots: E02 shows step/support foot and knee path; E41 distinguishes front working leg and rear elevated foot; E09 shows the loaded hand, level shoulders and upright torso. Front geometry must be authored as a projection, not a mirrored side pose. Avoid treating projected limb shortening as anatomical shrinkage.

### 3. Integrator: shared files and combined acceptance

Own `Figure.tsx`, `ExerciseCard.tsx`, `FigureSlot.tsx`, `SetScreen.tsx`, transition text, shared copy wiring and browser journeys. Agree grip and side-cue contracts before agents edit. Wire Luna's cues into guide and session together; verify left-side history still means the same thing. Integrate Sol's grip modes and timing without duplicate transforms or timers. Keep files under one owner; Sol supplies changes needed in `Figure.tsx` to the integrator.

Suggested commits: (A) side cues and E42 correction; (B) press grip and timing; (C) three front views; (D) verified audit update. Each commit contains its relevant tests. Deployment follows explicit implementation authorization; this document itself only plans the work.

## Acceptance gates

1. Full-loop evidence: capture start, several intermediate phases, end, return and seam using the actual `movementPose`/cycle path. Include E04/E10, E27/E39/E40, E42, each timing change and all three angle pilots; both sides and every distinct equipment setup. Existing contact sheets alone are insufficient.
2. Semantic tests: selected arm is paired with opposite leg; standing/moving-foot labels match geometry; E42 return instruction agrees with a fixed raised hip. Include overlay on/off and reduced motion.
3. Grip geometry: one bell, hand through handle, bell alongside the forearm, no apparent dangling grip in a press, stable wrist, no floor/head penetration or detached equipment throughout motion. Preserve E40's existing close-up.
4. Timing tests: demonstration holds match the agreed table; reduced motion schedules no animation; pause/resume and view switches preserve progress. Session logging remains once per completed set, unaffected by demonstration cycles.
5. One batched mobile/desktop visual review (360/390 px and desktop), light/dark, normal/reduced motion, long Swedish cues, 200% text and keyboard. Check that movement, instructions and timer remain accessible. One correction batch and at most one confirmation round under Impeccable.
6. Beginner comprehension check: ask a person unfamiliar with the exercise which limb moves, which supports, how to hold the weight and what counts as one repetition. If unavailable, record that usability validation is still outstanding; do not claim the drawings are proven self-explanatory.
7. Run relevant geometry/content/session regressions, static checks and production build; measure initial JS against the existing 150 KB target. Update the audit with actual evidence, remaining limitations and sources.

## Source rationale

- [ACE Bird dog](https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/) describes opposite arm and leg with a controlled trunk. Supports explicit paired-limb labels.
- [StrongFirst floor press](https://www.strongfirst.com/using-the-floor-to-strengthen-your-press/) describes rolling towards the bell for setup, inserting the hand through the handle and aligning the load over the forearm/elbow. Supports reviewing the grip and load alignment; it does not prescribe the app's dose.
- E42's supplied sheet explicitly describes a held plank with repeated lower-leg lifts. The existing [Copenhagen study](https://bmjopensem.bmj.com/content/5/1/e000570) covers related variants; direct retrieval returned 403 during this review. Do not claim it independently validates this exact variant or copy its dosage. Retain the existing qualified source note.

Remaining front-view candidates after the pilot: E06/E24/E25/E28/E47 for knee direction, E18 for bilateral carrying, E42 for pelvis rotation. These are subsequent scope, not prerequisites for the concrete P1 corrections.
