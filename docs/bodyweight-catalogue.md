# Bodyweight catalogue additions

2026-10-24. Comparison with [the supplied article](https://privatetrainingonline.se/kroppsviktsovningar/).

| Article family | Stomme |
| --- | --- |
| Knäböj | Existing E12 bodyweight variant |
| Armhävningar | New E54 |
| Chins / Pull ups | New E55 overhand, E56 underhand |
| Utfall | Existing E24/E25; article heading says walking but its written return describes a stationary forward lunge |
| Rygglyft | New E57, arms along sides |
| Jägarvila | Existing E11; searchable alias added |
| Dips | New E58, parallel bars |
| Höftlyft | Existing E23 |
| Benlyft | New E59, both legs together; separate from E31 |
| Burpees | New E60, push-up and jump |
| Plankan | New E61 |
| Jumping Squats | New E62 |
| Utfall med hopp | New E63 |
| Sidoplankan | Existing E05 |
| Mountain Climber | New E64, controlled alternating timed movement |
| Armhävning på knä | New E65, easier step before E54 (not in the article) |
| Armhävning mot vägg | New E66, easiest push-up step, library only |
| Tåhävning på två ben | New E67, easier step before E08 |
| Magcrunch | New E68, library only; bicycle crunch left out |
| Bird Dog | Existing E10; basic opposite-limb extension, without the article's additional elbow/knee crunch |

Eleven entries cover ten missing families, expanding 53 to 64 exercises. Existing IDs, E-numbers, programme rosters, prescriptions and history stay intact. These additions appear in the library and custom-workout picker; no automatic rehab assignments or new progression rules.

## Content decisions

Original Swedish setup/move/return instructions, muscle tags, technical difficulty, editable doses and source notes accompany every addition. The article is the inclusion checklist. Instructions are independently checked against NASM, ACE and Muscle & Strength's authored exercise demonstrations, linked per entry. No article images or prose are copied. Claims of guaranteed fat loss, universally low injury risk or general rehab suitability are omitted.

- E55/E56 require a purpose-built fixed bar; E58 requires stable parallel bars. These are new equipment preferences and backup values, not aliases for an ordinary chair or wall. No improvised furniture dips.
- E57 follows ACE's small back extension with arms by the hips and feet down, rather than placing hands behind the head. It is a generic strength entry, not a new back rehabilitation programme.
- E59 identifies hip flexion and trunk control, rather than claiming isolated lower-abdominal training.
- E60 animates the ordered whole sequence once, then loops from the same standing pose. Reduced motion shows four labelled key positions. No reversed burpee loop.
- E63 alternates legs inside one set. Each jump/landing counts once in total; it is not logged as two unilateral sets.
- E64 uses one timed block for both legs, with the existing moving-exercise timer copy rather than a static-hold label. Its controlled stepping variant differs from ACE's rapid simultaneous foot switch and is disclosed in the source note.
- Easier options are written coaching alternatives. They are not silently animated or recorded as the main variant.

## Verification

New geometry checks sample all eleven movement paths: finite coordinates, floor clearance, fixed hand/bar contacts, rigid push-up trunk, continuous constant-length jumping-lunge legs, burpee phase order/loop seam and alternating climber knees. A database test round-trips new equipment and all new exercise IDs in a saved workout. Existing catalogue integrity tests now verify 64 unique references and keep E49–E53 fixed in place.

Visual evidence uses the DEV catalogue's real movement path and sequence strips. Software and visual checks are not clinical validation or beginner comprehension testing.

## Easier push-up and calf steps (E65–E68)

2026-10-28. Four more entries expand 64 to 68 exercises. The easier chain is E54 to E65 to E66, and E08 to E67. E65 is a basic horizontal press and the first pick for new or some users with no weights; E66 and E68 are library only and never enter a roster. E67 replaces a lost calf exercise for lower-level running users. Sources: NASM modified push-up (E65), NASM incline push-up, which names a wall (E66), ACE standing calf raises at a wall (E67), ACE crunch (E68). Each URL was opened on 2026-10-28.

## Harder variants and optional progression (E69–E71)

2026-10-28. The catalogue now has 71 entries; earlier IDs and references are unchanged.

| Reference | Exercise | Technique level | Checked source |
| --- | --- | --- | --- |
| E69 | Armhävning med fötterna upphöjda | technical | [NASM decline push-up](https://www.nasm.org/resource-center/exercise-library/decline-push-up) |
| E70 | Smala armhävningar | technical | [PureGym diamond press-ups](https://www.puregym.com/exercises/chest/press-up/diamond-press-ups/) |
| E71 | Planka med armlyft | practiced | [University of Calgary front plank with arm lifts](https://www.ucalgary.ca/shred-injuries/all-sports/soccer/front-plank-arm-lifts) |

All three source URLs were opened before implementation on 2026-10-28. Swedish instructions are original summaries; doses are editable app proposals. E69 uses a low, stable chair; E70 has close hand placement. These are upper-body/core exercises, not knee-dominant loading, and have `kneeLoaded: false`. None enters a rehab roster automatically. No weighted push-up or calf hold was added.

E71 alternates arms. Each lift and return counts once in total, rather than the source's per-arm count. It uses manual rep counting because its demonstration cycle shows both arms. Reduced motion includes a raised-arm frame. All three new movement paths have sampled contact and geometry tests and were visually checked in `/dev/figurer`.

The harder links are wall → knee → push-up → decline, and two-leg → single-leg calf raise. Diamond is offered alongside decline after push-ups, including when no chair is available. Both harder push-ups link back to push-up. General rosters retain a same-slot knee/push-up fallback for lower experience levels; registered weighted presses retain priority over unweighted variants.

“Prova nästa nivå” is an optional preview/summary suggestion. It requires the latest two attempts in the same programme to be completed, every planned set/side at the catalogue maximum, effort easy, an after-check of good, and no symptoms since the older attempt. Aborted/skipped attempts, early-ended sets, extra weight, missing results and mismatched variants block it. Rehab is excluded. Equipment must fit. A preview switch requires an explicit tap and uses the new exercise's start dose; it never edits saved workouts or completed history automatically.
