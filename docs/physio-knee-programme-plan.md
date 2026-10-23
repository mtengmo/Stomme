# Plan: "Fysioterapeutens knäprogram" (second rehab group)

Status: approved by the owner on 2026-10-23 with the default answers below. Privacy rule: this repository is public. No patient or clinician name, no dates from the source paper, no image of it, and no third-party drawings or texts appear anywhere (code, tests, docs, commit messages). The group is generic. Exercise text is written from scratch; figures are our own parametric drawings.

## What

A second rehab sub-group beside the AAOS "knee conditioning" group (`rehabFocus: 'knee'`), for users who have a physiotherapist's paper with nine knee exercises. New start = prefilled, editable doses behind an explicit confirmation. Progression pairs ("stegring av föregående övning") are shown as informational notes only. Rehab is never progressed automatically.

## The nine exercises

| # | Exercise | Prefilled dose | Catalogue id | Decision |
|---|---|---|---|---|
| 1 | Ryggliggande lårmuskelspänning | 1 x 10 | **E49 `quad-set`** "Lårmuskelspänning i ryggläge" | New. reps, perSide (ben), strength, no equipment, no hold time encoded |
| 2 | Bäckenlyft | 2 x 10 | E23 `glute-bridge`, bodyweight | Reuse. Both legs together |
| 3 | Sittande knäböjning | 1 x 10 | **E50 `seated-knee-flexion`** "Sittande knäböjning med fotglidning" | New. reps, perSide, mobility, chair |
| 4 | Sittande knästräckning | 2 x 10 | E30 `seated-knee-extension`, bodyweight + chair | Reuse |
| 5 | Knästräckning med gummiband | 2 x 10 | **E51 `band-knee-extension`** "Sittande knästräckning med gummiband" | New. Band + chair; progression of 4 |
| 6 | Stående knäböjning | 2 x 10 | E29 `hamstring-curl`, bodyweight + support | Reuse (same movement) |
| 7 | Höftextension med gummiband | 2 x 10 | **E52 `band-hip-extension`** "Stående höftsträckning med gummiband" | New. Band + support; the moving leg is the chosen side; progression of 6 |
| 8 | Knäböj vid stol | 2 x 10 | E01 `goblet-chair-squat`, existing bodyweight + chair variant | Reuse. Add "ta stöd mot armstöden vid behov" to its easier option |
| 9 | Balansklockan | 1 x 5 varv | **E53 `balance-clock`** "Balansklocka på ett ben" | New. Unit laps, perSide (the MOVING foot) |

New entries E49-E53 are appended in E-number order. Item 5 is a separate exercise (not a variant of E30), because E30's source is AAOS and band history must not mix with bodyweight history.

## Codebase facts the plan depends on

- The AAOS group is `rehabFocus: 'knee'`; its exercises are the ones whose metadata source URL contains `orthoinfo.aaos.org` (`src/content/kneeRehab.ts`). New exercises with a non-AAOS source stay out of it automatically.
- `defaultPlan` in `TrainingPreview.tsx` chooses: saved `rehabPlans[focus]`, then the last session for that focus, then the group's starter plan. That already gives "prefill only on a new start".
- Many checks are written as `rehabFocus !== 'knee'` (meaning "custom"); a third value would silently fall into custom behaviour (TrainingPreview, History, ReadyWorkout, TrainingHome). Replace them with a helper.
- Every `Record<ExerciseId, ...>` refuses to compile until it has the new ids (exerciseReferences, exerciseAliases, variantSeeds, exerciseMuscles, figures): a useful completeness check.
- Every source currently needs an `https://` URL (exerciseMetadata.test.ts, rehabAdditions.test.ts).
- **Bug to fix:** the E-number shown in `TrainingPreview.tsx` is computed from the position in `exerciseList`, not from `exerciseReferences`.
- E29/E30 instructions include the AAOS 5-second hold; SetScreen shows "Håll varje repetition i 5 sekunder".

## Catalogue changes

- Units: add `Unit 'laps'` with `UNIT_WORD` = "varv", `AMOUNT_LABEL` = "Varv" (`Record<Unit>` makes the compiler show every place). Check every unit ternary by hand: SetScreen (~212, ~331: otherwise "gått hela sträckan"), TrainingPreview (~743), ReadyWorkout (~75), stats.ts (~44: laps stay out of rep totals), ProgressOverview, StepLineChart. Backups are unaffected (`amount` has no unit).
- Catalogue ranges stay generic (reps start 8, max 12; laps start 3, max 6). The doses live only in the group.
- Muscles: E49 quads; E50 none (mobility, like E44); E51 quads; E52 glutes (secondary hamstrings, core; quality balance); E53 glutes + quads (secondary hip abductors, core; quality balance).
- Aliases: each sheet name plus "Quad set" and "Clock reach".
- Sources: make `ExerciseSource.url` optional; add an editorial source `{title:'Fysioterapeutens knäprogram (Stommes egen beskrivning)', publisher:'Stomme', note:'Egen svensk beskrivning utifrån allmänna rörelseprinciper. Ingen klinisk källa; följ ditt papper.'}`; ExerciseCard shows it without a link; use `?.` in kneeRehab.ts and libraryFilters.ts; tests accept "https URL or publisher Stomme". Do not invent a clinical citation.

## Figures (own parametric drawings; side view facing right; near side = working/blue side; left sets mirror)

Extend `FigureSpec` with `band?: { from: PoseKey | Pt; to: PoseKey }`; Figure draws it instead of the default hand-ankle-hand band (`data-equipment="band"`).

- E49 quad set: lying on the back, legs straight; the knee presses about 5 px down, toes pull up; heel and hip fixed; slow cycle; muscle overlay. Risk: looks static.
- E50 seated knee bend: chair prop, hip fixed on the seat; the ankle slides along the floor from in front of the knee to under the seat edge; solve the knee with `joint()` so bone lengths stay constant; foot on the floor. Risk: foot passing through chair legs.
- E51 band knee extension: reuse `seatedKneeExtensionPose`; the band runs from a fixed point at the bottom of the rear chair leg to `aR`; same 5000 ms cycle.
- E52 band hip extension: standing with a hand on wall/chair; the near leg extends about 20 degrees back with a straight knee; the trunk stays vertical (`neck.x` within 2 of `hip.x`); short dashed band loop from `aL` to `aR`.
- E53 balance-clock: near blue leg moves, far leg stands, hands on a wall in every frame; the top-view diagram is the main teaching element: five dots on the moving foot's half of the clock (right: 12, 1.30, 3, 4.30, 6; left: 12, 10.30, 9, 7.30, 6) highlighted in order, still numbered when paused or in reduced motion.
- Review: a full animation cycle (not only start/end); contact points stay fixed; standing vs moving leg clear; band attached in every phase; reduced-motion start/end frames; colours in every theme; nothing traced from any third-party drawing.

## Group model and flow

- `RehabFocus = 'custom' | 'knee' | 'knee-physio'` (types.ts for `TrainingPreferences` and `Session`). One helper `rehabGroup(prefs)` returning `'custom' | 'aaos' | 'physio'` replaces every raw `!== 'knee'` check (the Ländrygg section must test `=== 'custom'`).
- New `src/content/physioKneeProgramme.ts`: `physioKneeItems: { sheetNo, sheetLabel, exerciseId, variantId, sets, target, progressionOf? }[]` and `physioKneePlan(preferences)` modelled on `kneeConditioningPlan`; drops items whose equipment is missing and reports "7 av 9 passar din utrustning"; rest 60 s labelled as the app default; `explanation` per item: "Förifyllt från fysioterapeutens knäprogram: 2 x 10 per vald sida. Kontrollera mot ditt papper och ändra vid behov."; sides follow the existing `rehabSide` handling.
- The group is not restricted to its nine exercises (unlike AAOS); catalogue additions get 0/0 doses the user must fill in.
- "New start" = no saved plan and no earlier session in this focus; keep the order saved plan > last session > prefill; add "Återställ till programmets startvärden".
- **Policy** (earlier rule: rehab doses are entered by the user): the prefill is an owner-approved exception for THIS group only; custom still requires entering a dose. The preview opens in overview; a required confirm box "Jag har jämfört övningar, sida och antal med mitt papper från fysioterapeuten." (any edit via `updatePlan` clears it); every field stays editable; no "rekommenderad" wording; banner: "Gäller bara om ditt papper innehåller just de här övningarna. Appen ökar aldrig rehab automatiskt. Fråga fysioterapeuten vid osäkerhet." Record as decision 20 in docs/plan.md section 12 and a note in docs/exercise-clarity-plan.md.
- UI: QuickStart secondary link "Jag har fysioterapeutens knäprogram (9 övningar)" (chair/support/band checkboxes and "Arbetande sida"); TrainingSetup option in the rehab focus select; `trainingName` "Knärehab · Fysioterapeutens program"; History filter option; generalise KneeCollection into `RehabCollection`, listing items in paper order ("Papperets övning N: <sheetLabel>"); its "Lägg till" uses the paper dose.
- Progression notes derive from `progressionOf` at draw time (nothing stored, no automatic swap): on items 5 and 7 "Stegring av övning 4 (E30 Sittande knästräckning)."; on items 4 and 6 "Nästa steg på papperet: övning 5 (E51 ...). Byt när du och din fysioterapeut kommit överens." Shown in the collection, the expanded preview row and ReadyWorkout. Items 4 and 6 also note that the hold time comes from AAOS: "följ ditt papper om det skiljer sig".
- Backups (`src/db/backup.ts`) additive only: `'knee-physio'` in the session and training `rehabFocus` enums; `rehabPlans['knee-physio']` optional; schema version stays 2, no Dexie change; old backups import unchanged.

## Rules

Rehab is never increased automatically (the existing `previous.programId === 'rehab'` branch and the reps-only +1 rule apply; laps are never progressed). Symptom checks unchanged (before check-in for all rehab, day-after prompt, "Fråga fysioterapeuten"). History and progress stay per exercise id; sides never summed; laps kept out of rep totals; E51/E52 have their own histories.

## Tests, privacy, risks

Unit: ids E49-E53 unique and in order; the group has 9 items with the right doses, valid under `validateTrainingPlan` for every side setting and with/without band; every `progressionOf` points to an earlier item; `isTrainingPreferences`, `trainingName`, `rehabGroup` cover all branches; `saveRehabPlan`/`startTrainingSession` work for `'knee-physio'`; backups v1/v2 fixtures still import, new data round-trips, unknown focus values are rejected; copy and stats handle laps; figures: bone lengths constant, contacts fixed, trunk upright on E52, band attached. E2E: QuickStart link -> 9 or 7 rows with prefilled doses; start blocked until confirmed; editing a dose clears the confirmation; reload keeps state; a saved plan wins over the prefill; progression notes visible; set screen says "varv"; axe a11y on preview and collection; themes and reduced motion for the 5 figures. Privacy: no names, dates, clinic or images anywhere; generic commit messages; `scripts/privacy-check` reads a gitignored local denylist (never committed). Risks: other users may adopt the doses without having the paper (mitigated by banner wording and no "recommended"); the paper's interpretation is uncertain; E53's figure may be unclear; the `!== 'knee'` checks may regress.

## Owner answers (defaults, approved)

1. Prefill all nine, including progressions 5 and 7 alongside 4 and 6: yes; notes mark them as progressions.
2. Doses are per chosen side (existing "Arbetande sida"; "both" gives each side the full dose); for the balance clock the chosen side is the standing leg. (superseded for E53 by decision 21: the chosen side is the moving foot; one varv = five taps)
3. No hold number for E49; E29/E30 keep the AAOS 5-second text plus "följ ditt papper om det skiljer sig".
4. "10 x 2" = 2 sets of 10; one "varv" = a touch at 12, 3, 6 and 9 and back to start. (superseded for E53 by decision 21: the chosen side is the moving foot; one varv = five taps)
5. Offered as a secondary QuickStart link and a TrainingSetup option, not a main goal button.

## Tasks and order

1 policy text in docs (Sonnet) > 2 `RehabFocus` + `rehabGroup` + replace checks (Sonnet) and 3 `laps` unit (Sonnet) > 4 Swedish content for E49-E53 (Sonnet, then Opus review), 5 references/aliases/muscles/variant seeds/editorial source (Haiku, after 4), 6 E-number display fix (Haiku) > 7 group module + prefill (Sonnet), 8 backup changes + tests (Sonnet) > 9 UI flow (Sonnet). 10 figures: E49, E51, E52 (Sonnet); E50 and E53 with the clock diagram (Sonnet, Opus review of poses), alongside from task 5. 11 E2E, a11y, theme tests (Sonnet/Haiku) > 12 safety, privacy and copy review (Opus).

## As implemented (supersedes the wording above where it differs)

- Progression notes are short: the earlier row says "Nästa steg på papperet: övning 5.", the later row "Stegring av övning 4." One footer under the overview list says "Övning 5 och 7 är stegringar av 4 och 6. Gör dem bara om de står på ditt papper; ta annars bort dem." and, when item 4 or 6 is present, that the 5-second hold comes from AAOS.
- The overview shows the "Förifyllt…" note once, and only while the plan equals the untouched prefill. The per-row explanation is not shown for this group.
- Rows are numbered by paper number. The technique level is not shown for this group. The collection shows exercises already in the pass as compact "Ingår i passet" rows.
- The confirm box sits in the sticky bar next to the start button; its label ends with "(krävs för att börja)." and the disabled button points to it with aria-describedby. A tick without a valid saved draft is cleared on load.
- The QuickStart link reads "Jag har fysioterapeutens knäprogram (9 övningar)" with the hint "Annat papper? Välj eget rehabprogram ovan."
- E53 requires holding on to a wall or chair in every text, and E51 describes the band anchored low at the front chair leg. The set screen says which leg moves (E52 and E53); for E53 the other leg stands.
- The E53 set screen reads 'Den valda sidan är foten som nuddar. Du står på det andra benet.'
- `npm run privacy:check` runs `scripts/privacy-check.ts` against the local gitignored `.privacy-denylist`.
