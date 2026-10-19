# Muscle labels and exercise choices

Content desk review, 2026-10-19. The original programme in `docs/spec.md` and `src/content/exercises.ts` remains the prescription source. Muscle categories are simplified body regions for explanation and filtering. “Primary” and “supporting” are editorial roles for this app, not measured activation rankings or an exhaustive anatomy list.

## Mapping review

| Existing exercise | Primary display groups | Supporting display groups | Basis and limits |
| --- | --- | --- | --- |
| Chair/goblet squat | Front thigh, seat | Trunk | Existing programme plus [ACE goblet squat](https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/), which identifies hips and thighs. Chair depth/support remains the programme's variant. |
| Step-up | Front thigh, seat | — | Existing programme plus [ACE step-up](https://www.acefitness.org/resources/everyone/exercise-library/28/step-up/), which identifies hips and thighs. |
| Single-leg RDL | Back thigh, seat | Trunk | Original programme names hamstrings and seat; [ACE single-leg RDL](https://www.acefitness.org/resources/everyone/exercise-library/329/single-leg-romanian-deadlift/) describes the hip hinge, straight back and glute-driven return. Balance is a quality, not a muscle. |
| Dead bug | Trunk | — | Original programme and [Newcastle Hospitals' runner exercises](https://www.newcastle-hospitals.nhs.uk/services/injury-prevention-advice-for-runners/) include this controlled opposite-arm/leg core exercise. Do not draw the moving limbs as the primary muscle targets. |
| Side plank | Trunk | Outer hip | Existing programme's obliques/side of hip grouping is consistent with [ACE side plank](https://www.acefitness.org/resources/everyone/exercise-library/101/side-plank-with-straight-leg/), which identifies abs and hips. The outer-hip subregion is a simplified interpretation of the original programme. |
| Supported split squat | Front thigh, seat | — | Retains the original programme's two groups. Both are also included in the [ACE glute-training overview](https://www.acefitness.org/resources/pros/expert-articles/8807/strength-training-the-glutes-an-evidence-based-approach/). The article discusses a different split-squat variant; it does not establish a knee-rehabilitation substitution. |
| Single-leg hip lift | Seat | Back thigh | Original programme's seat/hamstring grouping; [ACE single-leg glute bridge](https://www.acefitness.org/resources/everyone/exercise-library/145/glute-bridge-single-leg-progression/) describes glute contraction and controlled hip extension. |
| Single-leg calf raise | Calves | — | Existing programme; [NHS strength exercises](https://www.nhs.uk/live-well/exercise/strength-exercises/) includes supported calf raises. Single-leg and load progression remain the app's existing variant. |
| Suitcase carry | Trunk | — | Existing programme plus [ACE unilateral training](https://www.acefitness.org/continuing-education/certified/may-2020/7543/the-benefits-of-unilateral-training/) explains trunk stabilisation in unilateral carries; [ACE suitcase carry](https://www.acefitness.org/resources/everyone/exercise-library/358/suitcase-carry/) describes a firm grip and upright carry. Grip is a quality. Omit ambiguous “hip” muscle highlighting. |
| Bird dog | Back, trunk | Seat | Original programme and [ACE bird dog](https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/) identify back, abs and hips and describe opposite arm/leg movement. Supporting seat vs primary trunk/back is editorial emphasis. |
| Optional wall sit | Front thigh | — | Original programme; [Leeds Community Healthcare patella information](https://leedscommunityhealthcare.nhs.uk/our-services-a-z/musculoskeletal-msk/knee-problems/known-diagnosed-knee-problems/patella-tendonopathy/) includes isometric wall sits in its quadriceps context. The source does not establish suitability for the app user's particular knee. |

Source pages were checked during implementation; related exercise variants support broad region explanations, not exact dose, activation intensity or individual suitability. No source text or illustrations are copied into the app.

## Choice policy

The app offers a small set of explicit programme adaptations, using only exercises already present. Knee-dominant slots can offer chair squat, step-up or supported split squat; the dead-bug/bird-dog slots can offer either of those trunk-control exercises. No automatic pairing is inferred from muscle tags.

These options preserve a broad programme focus and use the selected exercise's own starting amount, load ladder, sides, progression history and pain classification. They are product choices, not a clinical declaration that the movements are equivalent or interchangeable for every knee condition. The programme's existing physiotherapy prompts remain in force, including the step-height/depth notes.

Base alternative prescriptions are explicit (two sets, sixty-second rest); programme-week and progression rules then apply normally. The original A/B defaults are always available. Duplicate exercise IDs within a session are rejected. Other slots retain their existing exercise until a specific alternative is defined.

## Illustration policy

The front/back map highlights broad regions, with solid and patterned appearances plus text labels. It represents intended training focus across the exercise, not activation measured in the user's body. A simplified side-view overlay is used only where the segment geometry can explain the region clearly. It does not animate activation intensity, diagnose technique or suggest that every visible moving segment is a primary target.
