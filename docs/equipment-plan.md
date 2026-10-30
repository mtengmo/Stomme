# Plan: one equipment step, "Vilka vikter har du?"

Planned 2026-10-29 (architect-einstein). Problem: equipment is asked twice. The start flow asks Hantlar/Kettlebell + Antal (1/Två) → `equipment` gets `dumbbell-1|2`, `kettlebell-1|2`, and then asks weights with count per weight again. `TrainingSetup` (Home) and `WorkoutEquipmentControls` ask it too. Two gates check the same thing: `equipmentFits` (coarse count in `equipment`) and `variantUsable`/`availableWeights` (the weights), so "2 hantlar" with no kg entered passes one and fails the other.

## Model (breaking change; no users with old data, no migration)

- Narrow `EquipmentChoice` (`src/domain/types.ts`) to support items: bodyweight, chair, support, step, band, pull-up-bar, dip-bars. Unique, ≤ 7, bodyweight always included.
- `weights` `{type,kg,count:1|2}` and `adjustableWeights` become the ONLY record of dumbbells/kettlebells (count 2 = a pair of the same weight).
- New in `src/rules/equipment.ts`: `Inventory`, `capabilities(inv)` (dumbbell/kettlebell 0|1|2 = highest count among fixed weights with kg>0 and adjustable items with ≥ 1 setting), `equipmentFits(reqs, inv)`, `missingRequirements(reqs, inv)` (e.g. "2 hantlar i samma vikt"), `inventorySummary(inv)` ("hantlar 5 och 10 kg (par), stol, vägg" / "Bara kroppsvikt"). Call sites (`favouriteSuggestions`, `exerciseProgression`, `training`, `levelPolicy`, `libraryFilters`, `defaultPlan`, `startReadiness`, `TrainingPreview`, `ExercisePicker`, `RehabCollection`, `kneeRehab`, `physioKneeProgramme`, `db/training`, `db/backup`) pass the whole preferences/override instead of `.equipment`. Delete the four count entries from `equipmentChoices` and `defaultEquipment`.
- Backup: narrow the zod enum, `.max(7)`; schema version stays 2.

## Start step UX

Heading "Vilka vikter har du?" (general, running, build, custom); knee/physio: "Vad har du hemma?" with no weights section. Remove `mode` (Egenvikt/Utrustning). Default `equipment = ['chair','support']`.
- List "Mina vikter" (read-only lines with "Ta bort <vikt>"), empty = "Bara kroppsvikt – passet byggs utan vikter."
- Buttons "Lägg till hantel" / "Lägg till kettlebell" → inline form: kg (0,5–100, comma or dot), Antal (• 1 hantel / par), "Lägg till"/"Avbryt". Same kg added again merges (1+1 = par). Max 20. "Justerbara vikter" in a details block.
- Support checkboxes (stol, vägg/stöd, steg, band, chinsstång, dipsställning). Hint: "Du kan ändra det här senare i Inställningar › Min utrustning."
- Shared `src/features/training/EquipmentInventory.tsx` (props value/onChange/onValidityChange/supportItems/showWeights/idPrefix); replaces `WeightInventoryFields`, reuses `AdjustableWeightFields`. Used in QuickStart, Settings › Min utrustning, and "Annan utrustning för detta pass".
- A11y: `<ul>`, labelled remove buttons, fieldset "Ny hantel", errors `role=alert`, focus returns to the add button after add; 48 px targets, 320 px single column, no new motion.

## Safety

Starting-weight rules unchanged (limited exercises never heaviest, experience-based, pain → lightest). If an exercise needs 2 and only 1 is owned the variant doesn't fit: `chooseVariant` picks a single/bodyweight variant, library shows "Saknar utrustning: 2 hantlar i samma vikt", `startProblems` blocks a saved routine with a specific reason. Two weights of different kg never count as a pair; nothing is converted or raised silently. Knee/physio behaviour unchanged (signature changes only).

## One place to edit

Settings › Min utrustning (`/installningar/utrustning`) uses the shared component with one "Spara min utrustning". Home "Ändra": "Byt inriktning" (no equipment fieldset any more) + separate link "Min utrustning" → `/installningar/utrustning?tillbaka=traning`. Whitelisted `?tillbaka=nytt-pass|traning`. Repoint `/?andra=utrustning` links (`NewWorkout`, `ReadyWorkout`, physio flow, `TrainingPreview.tsx:~1313`, `ExerciseLibrary.tsx:~152`, `RehabCollection.tsx`).

## Milestones

1. M1 Model + rules + all call sites, interim UI (count controls removed, weights fields always shown). L, Sonnet then reviewer. Test helper `inventory({dumbbells:[[5,2]]})`; ~28 test files use `'dumbbell-[12]'`/`'kettlebell-[12]'` (Haiku fixture swap).
2. M2 `EquipmentInventory` + new start step; Settings and workout override use it. M, Sonnet.
3. M3 Links, return targets, copy, docs. S/M, Haiku.
4. M4 e2e: `tests/e2e/flow.ts` (`addWeight` for the new buttons, remove the "Utrustning" radio), specs exercise-development, first-run-nav, owned-weights, kettlebells, library-workouts, custom-programme, physio-knee, training, workout-equipment, training-preparation, quick-start-custom, next-plan, settings-menu; new `equipment-step.spec.ts` at 320/360/412 × light/dark. M, Sonnet.

Prerequisite: merge `feature/settings-drilldown` first (shared `Settings.tsx`).

## Decisions (recommended defaults)

1. No quick-add chips (plain kg field). 2. Same type and kg again merges into a pair. 3. Weights section stays visible in Settings for rehab users. 4. No cleanup of old local prefs (delete data if the dev browser breaks). 5. Home: "Byt inriktning" + separate "Min utrustning". 6. Backup version stays 2.

## Status

Implemented on branch feature/equipment-step (M1 model and rules, M2 EquipmentInventory and start step, M3 links and docs, M4 e2e). `?tillbaka=traning` returns to `/traning/A`.

Update: the start step is now "Vad tränar du med?" with a checklist (Bara kroppsvikt, Hantlar, Kettlebell, support items), kg quick-pick chips (dumbbell chip = pair, kettlebell chip = 1) and an "Annan vikt" form whose add action lives on the fixed bottom button (`onPendingChange`), so Nästa cannot drop an unsaved weight. Decision 1 above (no chips) is superseded.
