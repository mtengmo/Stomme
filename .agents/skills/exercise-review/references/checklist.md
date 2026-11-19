# Checklist per scope

Expands "Granskningschecklista" in `docs/exercise-audit-log.md`. `all` = TEXT + VOICE + ANIMATION +
SAFETY. Tick only what you saw; list in `notes` what you could not check. Items are generic hints,
not facts about any exercise.

## TEXT (T)

Read the Swedish as a beginner would.

- [ ] Tips follow the animation in order: start position, direction, turning point, return. Every body part a tip names ("sträckta armar", "andra foten lyft") is drawn so in that phase.
- [ ] Every number of seconds in the text equals `repTempo(id)`, `demonstrationTiming(id)` and `holdSeconds` (compare with `inspect.ts`; do not assume).
- [ ] Phase 0 is the text's start position (seated or standing, on the floor or a step). The first moving phase is the one the tips name first. Counter order (up, hold, down, relax), demo loop, reduced-motion Start/Slut and rep boundary (a rep counts when progress returns to 0; `counter.progress` drives the figure in `SetScreen.tsx`) describe the same movement. Fault goes to the channel that contradicts the text; T if the text is wrong.
- [ ] Unit fits: `reps` counted ("upprepningar"); `seconds` a static hold or continuous movement; `meters` a distance ("sträcka"); `laps` ("varv"). A timed carry is `seconds`, not `meters`. `range` (start, max, step) is plausible.
- [ ] `easierVariant` / `easierOption` match the unit ("kortare tid", "färre upprepningar", "kortare sträcka" only for meters) and are a real regression, not the same movement.
- [ ] `commonMistake` is a mistake the figure can show, and the figure does not make it.
- [ ] Side: `perSide` and `sideKind` (`ben` / `sida` / `hand`) match what moves; the `exerciseSideCues.ts` label and explanation name the right limb (moving, standing, or holding); the blue limb is the cued one; "Byt sida" mirrors.
- [ ] Each variant's `label`, `setup`, `cue`, `easierOption` fits its implement (dumbbell, kettlebell, band, chair, step, bench, wall); `loadLadder` labels and grip words (goblet, horns, rack, hammer, suitcase) match the grip drawn in every phase and view.
- [ ] Natural Swedish, consistent terms, no medical or treatment claims (`CONTRIBUTING.md`).

## VOICE (R, recorded under `text`)

`inspect.ts` prints the strings; sources and tests are in `voice-crosscheck.md`.

- [ ] Hold wording ("Börja hålla.", "Klart. Släpp positionen.", "Hålltid") only for static holds; movement wording ("Börja rörelsen." or the exercise's `startVoice`, "Klart. Vila.", "Övningstid") only for timed exercises that keep moving.
- [ ] Count words fit: "Gör dig redo. Fem sekunder."; "Börja." or "Börja. Upp."; rep numbers with "Upp" / "Håll" / "Ner" when the tempo has a hold; "Fortsätt om tre. Två. Ett."; "Klart."; "Vila. N sekunder." only when rest continues automatically.
- [ ] Status and hint say "per ben / per hand / båda tillsammans" in line with `perSide`; the movement they name (walk, swap legs, hop) is the one the tips and figure show.
- [ ] The spoken `<Side>` label names the blue limb and the tips' limb. A hold inside a rep (`holdSeconds`, "Håll") is a visible pause in the figure.

## ANIMATION (AS, AF, U)

The `capture.ts` sheets (phases out and back, live loop, stills); stills alone are not enough.
Views, measurement and scoring: `views-and-scoring.md`.

- [ ] Source comparison: the defining setup, support location (behind/in front/beside), working limb and movement plane remain recognisable in each view at start, middle and end. A correct profile or plausible segment lengths do not excuse a misleading front/oblique setup; explain accepted depth simplifications.
- [ ] Motion type: a static hold (`unit: "seconds"`, not in `timedMovementCue`) is `motion: 'hold'`, all frames identical, stills Start/Håll (`HOLD_STILLS`; `src/figures/timedHolds.test.ts`). A moving exercise is `controlled`, `ballistic` or `sequence` and visibly moves.
- [ ] Thigh, shin, upper arm and forearm keep their length in every phase, view and variant (`inspect.ts` table; compare knee and elbow at Start and End).
- [ ] Contacts: planted feet stay planted (no sliding); stepping or walking feet lift and swing; a lunge's rear foot touches the floor; nothing goes through the floor; back on the wall in a wall-sit; hips reach the seat; hands and knees are on the railing, bench, bar, floor, mat or thigh where the text says, through the lowering and the return.
- [ ] Equipment: the weight is in the hand (no gap, no floating kettlebell); the dumbbell axis follows the grip (hammer curl: along the forearm, not locked upright); the grip matches the text (horns, goblet at the chest, rack at the shoulder); two weights in profile do not read as one wide bar; axis and grip agree across views and with the wording ("längs sidorna", "mot bröstet"); every variant, including front views.
- [ ] Range: the drawn lift height, depth or angle fits the tip words ("en liten bit", "halv") and the cited source (`source:` in `inspect.ts`, from `exerciseMetadata` `sources`); a clear overshoot is a minor (2) point in `notes`.
- [ ] Joints bend the right way within a plausible range; arms described as straight are straight (a pull-up starts from a straight hang); no elbow or knee flips direction.
- [ ] Every view from `supportedViewsFor(id)` x side x variant, over several phases; all views show the same movement; the default view shows the defining part; every view the movement needs exists (`views-and-scoring.md` §1).
- [ ] Baseline rows (`drift:*`, `asym:*`, `count:*`) confirmed by eye (`views-and-scoring.md` §2).
- [ ] H and V mirror; the selected limb is the one in the text and side cue; a lifted free foot is clear of the support foot from Start.
- [ ] Loop: no jump at the seam, plausible pauses, hold times as in the text, pace roughly `repTempo`.
- [ ] Reduced-motion Start and End stills show the start and end positions the tips describe, not a mid-movement frame.
- [ ] Framing: the whole figure, including rounded toe ends and equipment, has a margin in every phase, on both sides, at 390 px and 1280 px.

## SAFETY (S)

- [ ] `risk` is `high` for rehab, AAOS, physio, knee, loaded or ballistic exercises (see the audit doc). Report a wrong risk; do not change it.
- [ ] Cautions present where relevant: steady support (stable chair, railing or wall in reach), range limits, knee over foot and no inward collapse, neutral back under load, controlled lowering, a pain limit.
- [ ] A realistic regression: `easierVariant`, `easierOption`, or an existing, actually easier `easierExerciseId`.
- [ ] Knee-loaded, impact and ballistic moments carry suitable wording with no treatment promises; under load the figure shows no unsafe form (rounded back, knee collapse).
- [ ] In `beginnerExerciseIds` (`src/content/beginnerSet.ts`): `beginnerSet.test.ts` allows high risk only from load or knee load (not ballistics), needs `ok` text and animation reviews on or after the last fix, a controlled tempo and no `needs-fix`. Say if the exercise looks unsuitable for beginners.
