# Exercise ideas (not built)

Ideas collected from videos and requests. None of these is in the app or in `docs/exercise-audit-log.json`; building one means a new figure, Swedish text, tests and an `unreviewed` audit entry in the same commit (see `AGENTS.md`).

## Somersault squat (noted 2026-11-10, not built)

- What it is: a quad-focused squat with the heels raised (plates, wedge or slant board), a kettlebell or dumbbell held against the thighs just above the knees, torso leaning forward, deep range. Not a roll. Sources: Men's Health via AOL, BusinessDay (2026-01-19), MuscleWiki dumbbell and kettlebell pages.
- Not a duplicate: no heel-elevated squat exists; `kettlebell-goblet-squat` holds the weight at the chest.
- Risk: knee-dominant with depth and raised heels. Skip with knee surgery or recurring knee problems. Keep out of every programme, the beginner set and the wide pool; a selectable exercise with a knee warning and a light start only.
- Cost: medium (side-view figure with raised heels and the load against the thighs, text, tests) and one more high-risk audit entry for a cross-vendor reviewer.
- Decision: noted only, 2026-11-10.

## Runner video candidates, checked and not built (2026-11-10)

Reviewed by `architect-einstein` against the existing catalogue:

- Single-leg chair squat: already exists as `single-leg-chair-squat` (E47, rehab addition).
- Elevated glute bridge: sideways step on the existing bridge ladder (`glute-bridge`, `weighted-glute-bridge`, `single-leg-hip-thrust`).
- Elevated glute bridge march: covered by `single-leg-floor-bridge` (E48).
- Split squat with rotation: knee load plus torso rotation, hard to draw and not safe for beginners.
- Dead bug on a foam roller with a weight: a harder step on `dead-bug`; needs a new equipment type (foam roller) and a timed dose.

Wiring worth doing once Astra has reviewed the two exercises: add `single-leg-chair-squat` to the running squat slot and `single-leg-floor-bridge` to the hip-extension slot, after merging `weighted-glute-bridge` into `glute-bridge`. Neither goes in the beginner set.
