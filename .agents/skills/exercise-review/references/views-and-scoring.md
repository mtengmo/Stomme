# Views, geometry and viewing tools

Read for `animation` and `all` reviews. The scoring rubric and result mapping are in `SKILL.md`.

## 1. Views: list them, check each one

- `supportedViewsFor(id)` (`src/figures/frontViews.tsx`) returns exactly one of: `['side']` (no
  toggle); `['front']` (`FRONT_ONLY`, e.g. lateral-shuffle); `['side', 'front']` (ids in
  `supportedFrontViews`); `['side', 'oblique']` (ids in `supportedObliqueViews`).
  `defaultViewFor(id)` is the view that opens first (e.g. side-lunge, woodchop and
  kettlebell-goblet-squat open front; russian-twist oblique). Buttons "Från sidan", "Framifrån",
  "Sned vinkel" appear only with more than one view. `inspect.ts` prints all of this.
- In each view, for each side (H/V when `perSide`) and each variant in
  `exerciseMetadata[id].variants`: phases 0, .25, .5, .75, 1 and back, the live loop and the
  reduced-motion stills (`?phase=` works in every view); contacts; limb lengths; left/right;
  equipment in the hand with the right grip and axis.
- **Projection.** In front and oblique views a segment is a projection: shorter than its profile
  length is expected, longer is a defect. Thigh limit 36 units (`FRONT_THIGH_MAX` in
  `figureGeometry.test.ts`; `frontViews.test.tsx` also asserts `toBeLessThanOrEqual(36)` for some
  thighs). Report numbers against the profile length `inspect.ts` prints ("lår 38.2 vs profil 30.0
  vid fas 0"), not "thighs shorten". A segment collapsing toward zero is also a defect.
- **Left/right.** The side view mirrors the whole figure for V. The front view is not mirrored:
  the figure faces you, so its right is on your left. The selected side is the blue limb and the
  H/V letter is anatomical (`frontViews.test.tsx`, "marks anatomical H/V sides").
- **The view must fit the movement.** Front or oblique is needed for knee tracking, foot width,
  side bend, pelvic or shoulder rotation, lateral hops or weight shifts, one-sided carries, and
  any movement along the viewing axis (a hip sagging or shifting back, knees caving). A hinge,
  lunge depth or row reads best from the side. A view that shows a *different* movement from the
  profile is an animation error. A needed view that is missing is a finding (AF 1 "saknas");
  adding a view is a fix, not part of the review.

## 2. Objective inputs (read before you look; cite them)

- **Geometry ratchet** (`src/figures/figureGeometry.test.ts` + `figureGeometry.baseline.json`):
  101 phases of the default equipment (`applyEquipmentPose(id, pose, undefined)`), right side
  only, every existing view; a `hold` figure is measured on its `end` pose only. Keys are
  `<id>|<view>|<metric>` in figure units (a thigh is about 30).
  - `drift:<a>-<b>`: max minus min length of one segment over the loop (head-neck, neck-hip,
    neck-eR/eL upper arm, eR-hR/eL-hL forearm, hip-kR/kL thigh, kR-aR/kL-aL shin, aR-tR/aL-tL
    foot). Front-view thighs store their excess over 36 instead.
  - `asym:<a>-<b>` (side and oblique only): the largest right-left length difference in a frame.
  - `count:below-floor`, `count:foot-in-prop`, `count:head-clearance` (side only): frames that
    break the floor (y 178), prop or head-clearance rules (`checkPoseGeometry` in
    `src/figures/keyframes.ts`).
  - Rows exist only above tolerance (0.5 units, 0 for counts). The test only stops a figure
    getting worse, so a row is a *known, accepted* imperfection, not a pass.
- **Other figure tests:** `framing.test.ts` (joints in view, margins around feet and hands),
  `timedHolds.test.ts` (timed holds use `motion: 'hold'`), `frontViews.test.tsx` (front and
  oblique contacts, railings, H/V), `catalogue.test.tsx` (equipment and contacts for specific
  exercises), and each family's pose test (e.g. `squatFamilyKeyframes.test.ts`). Run
  `npx vitest run src/figures`.
- Not in the ratchet: other variants and the left side. `inspect.ts` (tables, stills) and
  `inspect.ts --scan` measure them; still check them by eye.

Rule of thumb (not a repo rule; say in `notes` what you saw):

| Metric | Usually | Score at most |
|---|---|---|
| drift or asym up to about 2 units | invisible | 3 |
| 2 to 5 units | check closely in that view | 2 if visible |
| more than about 5 units (about 15 % of a thigh) | visible | 2; 1 if a limb visibly grows or shrinks, or a static mismatch (below) |
| any `count:*` row | contact error | 1 |

Static left/right mismatch (an `asym` where both sides keep their length in the `inspect.ts`
table, not drift): more than about 5 units: AS at most 2; also more than about 20 % of the
shorter segment (shin 29 -> 6) and visible at 390 px: AS 1. *Maintainer policy default; the user
may change it.* A baseline `asym:*` row does not excuse it (accepted, not a pass).

## 3. Measuring contacts

Floor `FLOOR_Y` = 178 (`src/figures/props.tsx`). Props and the floor line are drawn with stroke 3
(half 1.5), so the floor line's top edge is 176.5 and a `mat` (rect from `FLOOR_Y - 1`) shows its
top edge at 175.5. Body lines use `W` = 6 in `Figure.tsx` (half 3): a joint at y reaches y + 3.
Measure gaps between stroke edges, not centre points, and give the gap in units. Whether a gap is
a 1 or a 2 depends on whether it is visible at 390 px and 1280 px.

## 4. Viewing tools

`inspect.ts` already compares every still with the live loop (numbers, not a look). Images:

- **`npx tsx .agents/skills/exercise-review/scripts/capture.ts <id|E-ref> ...`** starts and stops
  its own Vite (port 5304) and writes `.impeccable/review/<id>/<390-dark|1280-light>-<view>.png`:
  per view x weight tool x H/V the `?phase=` sweep out and back (not for `hold`), the
  reduced-motion stills and one live cycle (fake clock). About 25 s per exercise.
- Catalogue overview: `npm run shots:exercises` (reduced-motion stills, default view only).

- **By hand:** `npm run dev`, `http://localhost:5173`, "Jag förstår, fortsätt", then
  `#/ovning/<id>` (live loop) or `?phase=0.5`; buttons "Från sidan", "Framifrån", "Sned vinkel",
  "Byt sida", the "Vikt" select; reduced motion via the OS or browser emulation.
  `#/granska?ovning=E01` (guide with previous/next), `#/dev/figurer` (all stills),
  `#/dev/figurer-jamforelse` (comparison).
- **Evidence:** `.impeccable/review/` is gitignored. Put a path in `evidence` only when the file is
  committed; otherwise describe in `notes` what you looked at.
