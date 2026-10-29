# Plan: more dumbbell and kettlebell exercises

Written 2026-10-28 for Codex. Add the exercises below after the thruster pair (E73/E74) is merged. Next free IDs start at E75.

## How to add one exercise

Copy the wiring of `squat-curl` (E72): run `git show 5c253d1`. It touches the id union in `src/domain/types.ts`, `lateAdditionalExercises` in `src/content/additionalExercises.ts`, `src/content/exercises.ts`, `exerciseMetadata.ts` (technicalLevel, easier/harder links, reference), `exerciseAliases.ts`, `exerciseReferences.ts`, `muscles.ts`, `src/rules/levelPolicy.ts` (slot and `limitedExercises`), `src/figures/additionalPoses.ts` and the three count assertions (content.test.ts, exerciseMetadata.test.ts, ExerciseLibrary.test.tsx).

Rules for every exercise:

- Swedish, short, plain tips. No new motion beyond the existing figure system.
- Weights come from the user's registered equipment. Catalogue kilograms are samples only. One-sided, overhead or awkward loads go in `limitedExercises` so they never start on the heaviest weight.
- Technique level: basic / practiced / technical. Not in any knee-rehab roster.
- Reuse an existing reference URL if there is no better source; open the URL before using it.
- Verify the figure in the browser (open `#/ovning/<id>` after clicking past the welcome screen, 390 px wide, several frames). Arms must stay attached and the weight must move believably.
- Check: `npx tsc --noEmit -p .`, `npx biome check src` (5 old warnings allowed), `npx vitest run`.

## First four (priority)

| ID | Name | Equipment | Level | Slot / notes |
|---|---|---|---|---|
| E75 `bent-over-row` | Hantelrodd, böjd framåt | 2 dumbbells | practiced | `row` slot (heavy allowed). Hinge forward, flat back, pull both to the hips. Harder than `supported-row`; add as its harder link. |
| E76 `sumo-squat` | Sumoknäböj med hantel | 1 dumbbell, both hands | basic | `squat` slot. Wide stance, toes out. Easier link: `goblet-squat` sibling, not a replacement. |
| E77 `weighted-glute-bridge` | Bäckenlyft med hantel | 1 dumbbell on the hips | basic | New hinge-type slot or reuse the bridge slot. Harder link from `glute-bridge` (both legs). |
| E78 `overhead-triceps-extension` | Triceps över huvudet | 1 dumbbell, both hands | basic | Arms only, light. In `limitedExercises` (overhead). Harder than `triceps-kickback`. |

## The rest (also in scope, build after the first four)

| ID | Name | Equipment | Level | Notes |
|---|---|---|---|---|
| E79 `dumbbell-pullover` | Hantel-pullover | 1 dumbbell, lying on the floor | practiced | Chest and back; limited (overhead). |
| E80 `side-lunge` | Sidoutfall | 1 dumbbell optional | practiced | Sideways; per side. Easier link: `reverse-lunge`. |
| E81 `walking-lunge` | Utfallsgång | 2 dumbbells | practiced | Needs floor space; count steps, not reps if the counter allows. Harder than `forward-lunge`. |
| E82 `kettlebell-goblet-squat` | Gobletknäböj med kettlebell | 1 kettlebell, horn grip | basic | Same slot as `goblet-squat`; kettlebell variant. |
| E83 `one-arm-kettlebell-swing` | Enarms kettlebellsving | 1 kettlebell | technical | Per side; harder than the two-hand swing. Limited. |
| E84 `kettlebell-halo` | Kettlebell halo | 1 kettlebell | practiced | Shoulders and core, slow circle round the head; limited. |
| E85 `turkish-get-up` | Turkish get-up | 1 kettlebell or dumbbell | technical | Multi-step, slow and per side. Write safe cues first; practise with no weight (start light). |
| E86 `kettlebell-clean-press` | Clean och press med kettlebell | 1 kettlebell | technical | Per side; limited. Cues for the clean must be unambiguous. |

| E87 `russian-twist` | Russian twist | 1 dumbbell or kettlebell, both hands | practiced | Seated, torso leaned back, rotate side to side; count one side-to-side as one rep. Easier step: feet on the floor; harder: feet lifted. Slow cues, stop if the back hurts. Limited. |
| E88 `woodchop` | Woodchop | 1 dumbbell or kettlebell, both hands | practiced | Standing, diagonal from one hip up over the other shoulder; per side (two sides). Pivot the back foot. Limited. |
| E89 `kettlebell-figure-eight` | Kettlebell-åtta | 1 kettlebell | technical | Figure-8 round and between the legs, hinged stance. Do last, needs careful cues. Limited. |

Rotation under load: write cues that keep the movement small and controlled, and keep these out of rehab rosters.

Order of work: first four, then E79–E82, then E87–E88, then E83–E86 and E89 last because they need the most careful cues and figures.

## Workflow (owner's instructions, 2026-10-28)

1. **Plan first with Sol and Luna.** Have them refine this plan (IDs, slots, levels, cues, figure approach) before any code.
2. **Commit between the steps.** One commit per exercise, or per small batch, each with check, tests and a figure screenshot passing. Do not push in between.
3. **Deploy only at the end.** After all exercises are in, run the full checks (`npm run check`, unit tests, build, relevant e2e) and push `main` once. The app is deployed from `main`; reload the installed app twice to see it.
4. **Verify last with Opus.** A separate Opus review of (a) every new animation in the browser at 320/390 px, several frames (arms attached, weight moves believably, side handling for per-side exercises) and (b) the muscle groups, primary and secondary, against how each exercise is really performed. Fix its findings, commit, then deploy.

## Open questions

- Is a bridge or hinge slot needed for E77, or does an existing slot fit?
- Does the library list need grouping changes when the exercise count passes 76?

## Execution refinements (2026-10-29)

- Sol owns catalogue, equipment, source, muscle and rule wiring; Luna owns figures and geometry checks. Each exercise is verified and committed before the next begins.
- E73/E74 were present as uncommitted prerequisite work. Verify and commit them first, with a staged rack-to-press path.
- E77 reuses `bridge`. E78 is `practiced`, matching the intermediate source rather than the initial basic estimate. E81 uses reps: one forward step is one rep, alternating sides.
- E85 needs an explicit unloaded practice option. E85/E86/E89 must pass a genuine multi-stage motion feasibility check; do not substitute a misleading simple interpolation.
- The owner approved Astra in place of unavailable Opus for independent animation and muscle review.
- Hard stop: 07:10 Europe/Stockholm. Freeze new exercise work by 07:04 for checks and a handoff. Do not deploy an incomplete or unreviewed set.
- The owner explicitly resumed work at 12:54 Europe/Stockholm on 2026-10-29, after the earlier stop. Continue from E79 with the same commit and review boundaries; no new stop time was specified.
