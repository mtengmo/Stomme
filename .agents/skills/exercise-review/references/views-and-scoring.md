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
- Not measured: variants other than the default, and the left side. Check them by eye.

Rule of thumb (not a repo rule; say in `notes` what you saw):

| Metric | Usually | Score at most |
|---|---|---|
| drift or asym up to about 2 units | invisible | 3 |
| 2 to 5 units | check closely in that view | 2 if visible |
| more than about 5 units (about 15 % of a thigh) | visible | 2; 1 if a limb visibly grows or shrinks |
| any `count:*` row | contact error | 1 |

## 3. Measuring contacts

Floor `FLOOR_Y` = 178 (`src/figures/props.tsx`). Props and the floor line are drawn with stroke 3
(half 1.5), so the floor line's top edge is 176.5 and a `mat` (rect from `FLOOR_Y - 1`) shows its
top edge at 175.5. Body lines use `W` = 6 in `Figure.tsx` (half 3): a joint at y reaches y + 3.
Measure gaps between stroke edges, not centre points, and give the gap in units. Whether a gap is
a 1 or a 2 depends on whether it is visible at 390 px and 1280 px.

## 4. Viewing tools

- **`npm run shots:exercises`**: `#/dev/figurer` with reduced motion; contact sheets of Start,
  Mitt, Slut (H and V), default view only, in `.impeccable/review/exercises/E01-E09.png` etc. The
  numbers are catalogue positions in batches of 9, not E-numbers (they differ from position 71):
  find each exercise by its heading.
- **`npx tsx scripts/animation-fix-shots.ts <id> ...`**: phases 0, .25, .5, .75, 1 and back to 0,
  H and V, to `.impeccable/review/animation-fixes/390-<id>.png` (dark) and `1280-<id>.png`
  (light). No ids = 8 defaults. It switches to Framifrån only for `step-up`,
  `rear-foot-split-squat` and `suitcase-carry`; check other views by hand. Ignore `*-guide.png`.
- **By hand** (needed for views and variants): `npm run dev`, open `http://localhost:5173`, click
  "Jag förstår, fortsätt"; open `#/ovning/<id>?phase=0.5` (`?phase=0..1` works in DEV only); use
  "Från sidan", "Framifrån", "Sned vinkel", "Byt sida" and the equipment controls; also watch the
  live loop without `phase` and the reduced-motion stills (OS setting or browser emulation).
  `#/granska?ovning=E01` is the read-only guide with previous/next; `#/dev/figurer` shows all
  stills; `#/dev/figurer-jamforelse` is the comparison page.
- **Evidence:** `.impeccable/review/` is gitignored. Put a path in `evidence` only when the file is
  committed; otherwise describe in `notes` what you looked at.
