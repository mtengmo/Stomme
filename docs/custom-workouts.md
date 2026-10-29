# Browse and build a workout

The exercise library shows a static SVG thumbnail for each exercise. A tap plays one preview at a time; leaving the viewport stops it. Reduced motion remains still. The Granska route uses the same animation and pause control as the full guide, without frame-selection controls.

## Pick, create, adjust

1. Filter the library (search, region, muscle, type, execution, one side, equipment, level, favourites) and tap **Välj** on up to 12 exercises. The toggle reads **Vald** while picked (`aria-pressed`, accent colour). The selection survives guide visits and reloads in the current browser tab, and selecting never moves focus.
2. The sticky bar above the bottom navigation shows "3 valda · ca 18 min". **Visa valda** lists the picks in order with **Flytta upp/ned** and **Ta bort** per exercise. At 12, the other **Välj** buttons are disabled and "Högst 12 övningar." is announced. One `role="status"` announces count changes and moves.
3. **Skapa pass** saves the workout with an automatic name ("Eget pass 29 okt"), a dose from `customWorkoutPlan()` and clears the selection. It opens `/traning/A?workout=<id>` in edit mode, which is the dose editor: order, variant, sides, sets, repetitions or duration, weight and rest. Rename it in **Namn på passet** and save with **Spara ändringar i eget pass**, or start directly.
4. **Lägg till fler från biblioteket** opens `/ovningar?till=<id>`. There the bar button reads **Lägg till i passet**, exercises already in the workout are disabled ("Redan i passet"), and the picks are appended (also to the unsaved draft of the preview) before returning to the preview.

Up to 30 named workouts are stored in IndexedDB and included in JSON backup/restore. No data-model change: a workout is `{ id, name, exerciseIds, plan? }`.

## Skapa eget pass (start flow and `/nytt-pass`)

- First run: goal **Skapa eget pass** (`'build'`), steps goal, equipment, level, **pick** ("Steg 4 av 4"). Knee, physio and custom rehab never reach the pick step.
- The pick step reuses the library filters and builder (`CustomPicker`): equipment "available" from the draft, "Bara övningar som passar min vana" on by default, body-region chips as a filter, a live summary at the top (count, per region, "ca X min" from the draft setup) and the builder bar with **Skapa pass**. Filters live in the draft as a query string (`pickFilters`), the picks under `stomme.quickstart.selection`; both are cleared when the setup is saved or another goal is chosen.
- Nothing is written before **Skapa pass**; then setup and one workout are saved in one transaction (`saveStartWithCustomWorkout`) and the preview opens in edit mode with the name field ("Eget pass <d mmm>") at the top. No session is created.
- Returning users: Home "Mina pass" is always shown ("Inga egna pass än." when empty) with the link **Skapa eget pass** to `/nytt-pass`. It uses the saved setup unchanged and shows "Utrustning: ... · Träningsvana: ..." with **Ändra utrustning eller vana** (`/?andra=utrustning&tillbaka=nytt-pass`; only `nytt-pass` is accepted as return target). Rehab setups keep 0/0 dose, "Ingår inte i knäprogrammet" and no time estimate.

## Mina pass

`CustomWorkoutList` shows name, number of exercises, "ca X min" (not for rehab), a link to the preview and **Ta bort**. It appears on Home after the weekly plan (always, with an empty text) and at the top of the library (only when there are passes). Deleting asks "Ta bort passet? Sparade pass i historiken finns kvar." and is also available in the preview ("Ta bort passet"). Recorded sessions keep their name snapshots.

## Safety and limits

- Dose, start weight and sets follow `customWorkoutPlan()`: experience-based start, limited exercises never on the heaviest weight, pain on record means lightest, rehab starts at 0/0, symptoms block increases.
- Rows that lack equipment stay selectable and are labelled "Saknar utrustning: ..."; starting is still blocked until the equipment is available or a temporary equipment set is chosen.
- In knee rehab (AAOS) rows outside the programme show "Ingår inte i knäprogrammet" and cannot be selected. No time estimate is shown in rehab.
- Without a training setup the bar links to Home ("Välj träningsinriktning för att skapa pass"). At 30 saved workouts **Skapa pass** is disabled with an explanation.
- Custom workouts retain the current training direction, equipment checks, readiness and symptom questions. The default A/B workouts remain available.

## Weekly plan

A completed custom workout counts as that day's training in the weekly plan (so the planned day is not shown as missed and the next planned date moves on). It does not advance the A/B sequence or progression: `nextTemplateId` and `completedTrainingDates` in `src/rules` lock this with unit tests. Short workouts do not count.
