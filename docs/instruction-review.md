# Instruction clarity review

Reviewed 20 October 2026 against commit `b1c36f6` (0.1.82).

## Verdict

The instructions are useful reminders, but not consistently sufficient for a complete beginner. The newer exercises generally explain the movement better than the original eleven. Shared problems remain around starting positions, selected sides, repetition counting, and timed holds.

This is a review of Swedish copy and how it is assembled in the interface, covering all 38 exercises and the principal onboarding, workout, check-in, history and settings instructions. It is not a clinical validation or a frame-by-frame review of the animations. The findings below describe the reviewed baseline; subsequent implementation is recorded separately below.

## Implementation follow-up

Sol and Luna implemented the copy improvements following this review. All 38 exercises now describe starting position, movement and completion/counting. The selected-side wording for dead bug and bird dog follows the selected arm in the existing poses. The single-leg deadlift retains the animation's same-side carrying hand, and its source note explicitly distinguishes that variant from ACE's opposite-hand example.

The workout and full guide share the movement steps. Per-repetition holds are included in those steps, and completion guidance distinguishes repetitions, timed holds and distance. Surrounding copy clarifies effort versus symptoms, removes the promise of automatic workout adaptation, explains sets/per-side prescriptions, and uses browser-specific storage and consistent training-navigation wording.

Exercise IDs, prescribed doses, progression rules and animation poses are unchanged. This implementation does not establish individual rehabilitation suitability or validate every animation frame.

Validation: formatting/lint and TypeScript checks passed (existing configuration/CSS warnings remain), production build passed, and unit tests passed after correcting an expectation for changed progression wording. The final content/guide/session rerun passed 107 tests, including the new timing and variant regression checks. All 12 guide/training browser scenarios passed, covering mobile, desktop, landscape and enlarged text; three required selector updates because the equipment cue now belongs to the setup step.

## Fix first

1. **Make every exercise self-contained.** Start with body position and equipment placement, then describe the movement and return. Dead bug, side plank, bird dog and single-leg calf raise currently omit essential setup or movement details. “Hela rörelsen upp och ner” does not explain that the user should raise and lower the heel.
2. **Define what the selected side means.** “Höger sida” is insufficient for opposite-arm/leg exercises and side planks. Specify the working leg, moving arm or supporting side. Confirm those choices against the animation before changing the text. Reverse lunge already provides a useful example: the selected leg stays in front.
3. **Explain what completes one repetition or set.** Include per-repetition holds in the numbered movement sequence. The active screen displays hold information separately, while the full guide integrates additional timing text. The inline guide also says “Räkna repetitionerna själv” for timed and distance exercises. Use one consistent source of instructions, with wording appropriate to repetitions, seconds or metres.
4. **Remove contradictions between equipment variants.** Variant setup is generated from the original first tip. For bodyweight goblet squat, this can reintroduce an instruction about holding a weight even though the displayed tips have been adapted. The supported split-squat name also persists when both hands hold dumbbells. Single-leg hip thrust needs its raised-back-support setup in every variant.
5. **Separate effort from symptoms.** Replace “Hur kändes det?” above Lätt/Lagom/Tungt with “Hur ansträngande var övningen?” and explain “Bedöm ansträngningen, inte smärtan.” The check-in checkbox promises an “anpassat pass” even though that warning does not itself adapt the workout; describe the actual choice instead.
6. **Explain advanced movements without shorthand.** “Rackposition”, “höftfällning” and “parkera” need concrete explanations where used. Kettlebell swing and press need clearer setup and ending instructions. Floor press needs guidance for getting into and out of position with the weights.

Relevant implementation locations:

- `src/content/exerciseMetadata.ts:540`: generated variant setup.
- `src/content/exerciseMetadata.ts:556`: per-repetition hold metadata.
- `src/features/session/SetScreen.tsx:214`: separate hold guidance.
- `src/features/session/SetScreen.tsx:319`: generic repetition-counting instruction.
- `src/features/exercise/ExerciseCard.tsx:271`: full-guide timing guidance.
- `src/features/session/EffortScreen.tsx:34`: effort question.
- `src/features/training/Checkin.tsx:259`: adapted-workout wording.

## Consistent instruction format

Use the same short sequence in the library and active workout:

1. **Start:** body position, support and equipment; identify the selected side.
2. **Move:** one concrete action per sentence.
3. **Return:** explain the return and what counts as one repetition.
4. **Timing:** state any hold within each repetition; distinguish it from a timed set.
5. **Finish/change side:** state when to press Klar set and how the app handles the next side.

Keep optional technique detail below this sequence. Avoid adding a long paragraph above the animation or timer.

Example rewrite for single-leg calf raise:

> Stå på benet som visas och håll lätt i en vägg eller stol för balans. Lyft den andra foten från golvet. Lyft hälen på stödbenet så att du kommer upp på tå. Sänk hälen långsamt tillbaka till golvet. En höjning och sänkning räknas som en repetition.

Explain “set” once as an “omgång”, and explain whether a prescription applies to each side. Use “repetitioner” in guidance rather than alternating between “reps”, “rep.” and “repetitioner”.

## Complete exercise review

“Clear” means the basic written movement sequence is understandable, not that its animation or medical suitability has been verified. Shared counting and timing improvements still apply.

| ID | Exercise | Assessment | Required clarification |
| --- | --- | --- | --- |
| E01 | Chair squat / sit-to-stand | Clarify | State the starting position, stable chair placement and complete down/up cycle; align arm-position variants. |
| E02 | Step-up | Rewrite | Explain selected foot placement, rising, free-leg behavior and controlled return in order. Distinguish suggested step height from easier options. |
| E03 | Single-leg Romanian deadlift | Rewrite | Identify supporting leg and weight hand, then explain the return. Check hand/leg pairing against the animation. |
| E04 | Dead bug | Rewrite | Add lying setup, initial arm/leg positions, exact opposite-limb pairing and repetition rule. |
| E05 | Side plank | Rewrite | Explain starting on the selected supporting side, raising the hips, holding and lowering. |
| E06 | Split squat | Rewrite | Explain staggered stance and stationary feet. Align the supported name with variants that occupy both hands. |
| E07 | Single-leg hip thrust | Rewrite | Preserve raised-back-support setup in all variants, identify the planted foot, and replace “klacken” with “hälen”. Distinguish it from a floor bridge. |
| E08 | Single-leg calf raise | Rewrite | Explicitly say to lift and lower the heel of the selected supporting leg. |
| E09 | Suitcase carry | Clarify | Add pickup/set-down guidance and explain how distance and turns count. Selected carrying hand is clear. |
| E10 | Bird dog | Rewrite | Put the hands-and-knees setup first, identify the opposite arm/leg and describe returning/counting. |
| E11 | Wall sit | Clarify | Explain sliding down and standing back up. Review the absolute knees-in-front-of-toes mistake cue against the intended technique. |
| E12 | Goblet squat | Clarify | Fix inherited weighted setup in the bodyweight variant. Basic movement sequence is otherwise understandable. |
| E13 | Kettlebell deadlift | Clear | Setup, lift and return are described; explain hip-hinge terminology if retained. |
| E14 | Dumbbell Romanian deadlift | Clear | Make “mjuka knän” and “lång rygg” concrete where possible. |
| E15 | Supported row | Clear | Explicitly connect the selected side to the rowing arm and require stable support. |
| E16 | Floor press | Clarify | Explain getting into and out of the starting position with the weights. |
| E17 | Shoulder press | Clear | Add shared guidance for positioning and setting down weights. |
| E18 | Farmer carry | Clear | Pickup and ending are included; clarify distance counting and turns. |
| E19 | Biceps curl | Clear | State whether both arms move together and count as one repetition. |
| E20 | Hammer curl | Clear | State whether both arms move together and count as one repetition. |
| E21 | Lateral raise | Clear | Define one raise and return as one repetition. |
| E22 | Triceps kickback | Clear | Clarify selected arm and initial elbow position. |
| E23 | Glute bridge | Clear | Floor setup and movement are understandable; keep the distinction from elevated hip thrust. |
| E24 | Reverse lunge | Clear | Retain the explicit explanation that the selected leg stays in front. |
| E25 | Forward lunge | Clear | Selected leg steps forward and returns; retain this explicit side cue. |
| E26 | Kettlebell swing | Rewrite | Add floor setup and a clear ending. Replace unexplained “parkera”; do not assume prior hinge knowledge. |
| E27 | Kettlebell press | Rewrite | Explain shoulder/rack position and getting the weight into and out of that position. |
| E28 | Half squat | Clarify | Put the five-second hold inside the repetition sequence. |
| E29 | Hamstring curl | Clarify | Name the selected leg and integrate the five-second hold and return. |
| E30 | Seated knee extension | Clarify | Replace vague holding language with the prescribed five-second hold in the steps. |
| E31 | Straight-leg raise | Clarify | Make the other leg's setup explicit and integrate lift height, five-second hold and return. |
| E32 | Prone leg raise | Clarify | Integrate five-second hold and two-second relaxation into the steps. |
| E33 | Side-lying hip abduction | Clarify | Upper-leg selection is useful. Clarify “snett uppåt” and integrate hold/relaxation timing. |
| E34 | Side-lying hip adduction | Clarify | Lower-leg selection is useful. Integrate hold/relaxation timing. |
| E35 | Calf stretch | Clear | Explain that the prescribed seconds are a continuous hold, not repetitions. |
| E36 | Quadriceps stretch | Clear | Explain continuous hold and completion behavior. |
| E37 | Hamstring stretch | Clear | Explain continuous hold, release and completion behavior. |
| E38 | Band leg press | Clarify | Integrate the two-second hold, return and repetition count; clarify secure band placement. |

## Other app instructions

- **Workout start:** define sets/repetitions and “per side” once before relying on compact notation such as 3 × 10.
- **Technical difficulty:** label “Grundläggande” as technical difficulty, so it is not mistaken for low effort or individual rehabilitation suitability.
- **Knee conditioning:** consistently distinguish the app's selection of exercises, source-based prescriptions and app defaults. Library defaults and the prepared knee programme should not make apparently conflicting claims about whether source doses are used.
- **Symptoms:** describe the practical consequence of a report. “Rapporten ger ingen automatisk ökning nästa gång” reads like internal progression logic.
- **Settings:** replace “den här telefonen” with “den här webbläsaren”. The latter already appears in the privacy notice and works on desktop too.
- **Navigation:** review “Till veckan” where the destination is now the training overview.
- **Progression:** expand terse phrases such as “Lätt på toppnivån: nästa vikt” and “Högsta nivån. Behåll.” into a clear next action.
- **Terminology:** standardize repetitions, seconds, symptoms/pain and browser-local data wording.

## Selected source checks

The [AAOS knee-conditioning guide](https://orthoinfo.aaos.org/globalassets/pdfs/2017-rehab_knee.pdf) specifies holds within repetitions for several exercises, including five seconds for half squats and two seconds for band leg press. Those details should be visible within the movement sequence, not depend on the user finding a separate note. The source also frames exercise selection as something to discuss with a doctor or physical therapist; the app should clearly identify its own general template.

The app's [ACE single-arm/single-leg Romanian deadlift reference](https://www.acefitness.org/resources/everyone/exercise-library/127/single-arm-single-leg-romanian-dead-lift/) specifies opposite weight-hand and supporting-leg pairing. The app's written instruction should make its intended pairing equally explicit and match its animation.

The [ACE kettlebell introduction](https://www.acefitness.org/resources/pros/expert-articles/5269/how-to-get-started-with-kettlebells/) gives a floor starting position and preparatory hinge for swings. The app's shorter instruction should not assume the beginner already knows that setup.

## Recommended implementation order

1. Correct contradictory variant setup, generic counting copy and effort/symptom wording.
2. Rewrite the original eleven exercises and the two advanced kettlebell exercises.
3. Integrate holds, side definitions and counting rules across all exercises using shared presentation data.
4. Check the instructions beside each animation, including both sides and equipment variants, on a narrow mobile viewport.
5. Polish the remaining onboarding, settings and progression terminology.
