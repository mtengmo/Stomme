# Exercise text and animation audit

Reviewed 2026-10-23 against the current E01–E53 catalogue.

## Method

- Compared every instruction's setup, moving limb, direction, return, support contact and equipment with the authored start, midpoint and end poses.
- Reviewed right and left versions for every unilateral exercise. The side button mirrors the same reviewed geometry and changes the H/V marker; it is not a second camera angle.
- Rendered the full catalogue in repeatable contact sheets with `npm run shots:exercises`. The development sheet now uses the real constrained midpoint instead of a simple coordinate average.
- Checked all equipment/count variants through the catalogue render tests and reviewed the main written guidance against the sources already attributed in the guide. Important anchors include AAOS knee conditioning, ACE exercise guidance, NASM's exercise library and HSS mobility guidance.

## Result by catalogue group

| Exercises | Text–movement result | View and remaining limitation |
| --- | --- | --- |
| E01–E03 chair squat, step-up, single-leg RDL | Setup, support leg, direction and return agree. E03 keeps its authored same-side hand variant and states this transparently in its source note. | Profile is useful for depth and hinge. A future front view would add knee-tracking information for E01–E02; it is not needed to understand the basic movement. |
| E04 and E10 Dead bug/Bird dog | Opposite arm and leg move as the text says. Fixed the colour model so the selected arm and opposite leg are blue together, including when the muscle overlay is visible. | Profile clearly separates the paired limbs. H/V switches the selected arm and its opposite leg. |
| E05–E08 side plank, split squat, supported hip thrust, calf raise | Hold or repetition, support contact and working side agree. | Profile is the clearest primary view. E06 would benefit from an optional front knee-tracking view later. |
| E09 and E18 carries | The stepping loop, hand count and load placement agree with the text. | A front view would make unwanted side lean easier to judge. Text currently carries that cue. |
| E11–E17 wall sit through shoulder press | Movement and equipment agree. E12 and E14 already have separately authored front views. | E17 is drawn front-on because that makes two-arm symmetry clearer. |
| E19–E23 curls, lateral raise, kickback and bridge | Elbow/shoulder direction, support and bridge movement agree. | E19–E21 are already front-oriented drawings, despite most leg movements using profile. |
| E24–E28 lunges, swing, press and half squat | Step direction, planted foot, bell path and squat depth agree. The swing is deliberately faster than controlled strength movements. | Optional front views would help knee direction for E24, E25 and E28. E27's rack position is simplified; E40 remains the detailed grip reference. |
| E29–E38 AAOS-style knee movements and stretches | Working leg, hold direction and support agree. E29 and E30 use constrained knee motion so the lower leg does not shrink or reverse during the loop. | Profile is the useful angle for flexion, extension and floor raises. Band placement is orange and separate from the body. |
| E39–E40 kettlebell floor press and rack carry | Press path and rack carry agree. E40 includes a front view and a close-up of hand, wrist and bell position. | E39's safe roll-in/roll-out setup is explained in text; the repeating animation shows the exercise repetition itself. |
| E41–E43 Bulgarian split squat, bench side plank leg lift, hip-flexor stretch | Bench contact, working limb and movement direction agree with the supplied movement descriptions. | E41 could use an optional front knee-tracking view. E42 is a specific lower-leg-lift variant and remains labelled as such. |
| E44 prone on forearms | The figure intentionally stays in the held position instead of looping like repeated press-ups. The text now explicitly says to hold for the displayed time, breathe, then lower. | A static hold is less visually active but avoids teaching the wrong repeated movement. Reduced motion still presents the position. |
| E45–E48 heel slide, balance pendulum, chair squat, floor bridge | Alternation, hinge-to-knee-drive cycle, chair contact and raised-leg direction agree. The E48 free foot now follows the raised lower leg. | E45 alternates hands-free. E47 would benefit from a future front knee-tracking view. |
| E49–E52 quad set, seated flexion, band knee extension, band hip extension | The subtle knee press, foot slide and band anchors agree with the instructions. Sequence frames confirm fixed contacts and continuous limb lengths. | E49 includes a small press cue because the contraction itself cannot be shown literally. |
| E53 balance clock | The profile shows the standing-leg bend and forward/back reaches; the separate overhead clock diagram shows all five permitted directions and the active foot. | The two diagrams are complementary. A second body camera would not replace the overhead direction diagram. |

## Angle policy

Most lower-body movements use a profile because the key information is depth, hinge, step direction or joint flexion. Automatically adding a front animation to every exercise would add controls and drawing weight without adding useful instruction. The highest-value next batch is:

1. E02 step-up, E06 split squat, E24/E25 lunges, E28 half squat, E41 Bulgarian split squat and E47 chair squat for knee/foot alignment.
2. E09 suitcase carry and E18 farmer carry for side lean and shoulder height.
3. E42 bench side plank leg lift for pelvis rotation.

Keep E12, E14 and E40 as the reviewed two-view pilot. Keep E17–E21 front-oriented. Profile remains sufficient for floor raises, curls, extensions and stretches.

## Accuracy boundary

The generic instructions are suitable as movement explanations, not as a diagnosis or individual prescription. E42's exact repeated lower-leg variant has related research rather than a source that defines this exact drawing. E49–E53 preserve a supplied physiotherapy programme with editorial Swedish wording. The guide already exposes these source notes instead of presenting them as universal recommendations.

Sources used in the review:

- [AAOS Knee Conditioning Program](https://orthoinfo.aaos.org/globalassets/pdfs/2023-rehab_knee.pdf)
- [ACE Step-up](https://www.acefitness.org/resources/everyone/exercise-library/28/step-up/)
- [ACE Bird dog](https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/)
- [NASM Bulgarian Split Squat](https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat)
- [NASM Exercise Library](https://www.nasm.org/workout-exercise-guidance)
- [HSS knee strengthening and mobility guidance](https://www.hss.edu/health-library/move-better/exercises-strengthen-knees)
