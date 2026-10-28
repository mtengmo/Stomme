# Stomme

A small, offline-first strength app for general training, running support and individually
selected rehab workouts, built as an installable PWA (Android Chrome first). The UI is in
Swedish; code, identifiers and comments are in English.

The app is not medical advice. Stop on sharp pain, swelling or locking, and show the
programme to a physiotherapist.

## Stack

Vite, React 19, TypeScript (strict), Tailwind CSS v4, Biome, Vitest. See `docs/plan.md`
for the full build plan and `docs/spec.md` for the specification.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Biome lint/format check and `tsc --noEmit` |
| `npm test` | Run the Vitest test suite once |
| `npm run test:upgrade` | Test real production service-worker upgrades, offline retry, old clients and two tabs |
| `npm run e2e` | Build and run the production Playwright browser tests |
| `npm run audit:a11y` | Check contrast and audit mobile screens in light and dark themes |
| `npm run shots` | Build and capture mobile screenshots in light and dark themes |
| `npm run shots:muscles` | Capture muscle-library, exercise-choice and anatomy review screens |

Requires Node 24 and npm. Install with `npm ci`.

## Exercise review

Open [Granska övningar](https://stomme.tengmo.com/#/granska) from Settings or the exercise library. All 71 exercises have fixed references E01–E71, independent of workout order. The read-only view includes names, IDs, muscles, instructions, source attribution and static start/mid/end frames for each side. A particular exercise can be linked directly, for example `#/granska?ovning=E03`.

The reader combines movement, muscle information and instructions in one internally scrolling view. Review one large pose using Start/Mitt/Slut and switch sides as needed. Selecting a weight changes the equipment diagram and handling instructions. Session help uses the variant and actual total weight currently selected in that set.

Workout screens distinguish holding time from rest time and explain when to switch sides. A countdown never logs a set or starts the next set automatically; use Klar set / Nästa set to continue.

## Training directions and feedback

First-use setup offers Allmän styrka, Styrka för löpning and Mitt rehabprogram, equipment and training experience. Existing users keep their original programme until they choose another direction. New programme sessions store their identity, selected variant, side and actual weight; rehab exercises and dosage are explicitly chosen by the user rather than generated as a treatment plan.

Readiness, exercise effort and symptoms are separate answers. Report symptoms with body area/side, including during an exercise. General/running suggestions use only that direction's completed history; symptoms block automatic increases and rehab never progresses automatically. Conditional next-day questions appear inside the app. See the policy in [the implementation plan](docs/general-strength-plan.md).

The library combines purpose, muscle, equipment and technical-level filters, supports name/reference search and links to the AAOS-derived knee collection. Source content and differences are documented in [the source review](docs/exercise-source-review.md), with the E01–E53 text/pose findings in [the animation audit](docs/exercise-animation-audit.md). Historical sessions and schema-1 backups remain supported; new exports use schema 2.

Settings always shows the installed version/commit and offers Sök efter uppdatering. Update checks run on registration, foreground return, reconnect and periodically while visible/online. Applying an update requires consent and defers reload during active workout/input routes, including when another tab accepts an update. See [update recovery](docs/update-recovery.md) for an old client that has not yet received this mechanism.

## Deployment

Deployed by `.github/workflows/deploy.yml` to GitHub Pages at `https://stomme.tengmo.com`.

- Pushes and pull requests run check, test and build.
- Pushes to `main` also upload the build and deploy it to Pages.
- Settings shows `major.minor.<Git commit count>` and the short commit hash. Each new commit advances the build version automatically; full Git history is required in CI. Uncommitted local builds carry a `-dev` suffix.
- `VITE_BASE` sets the base path. It defaults to `/`. Set `VITE_BASE=/Stomme/` only if the
  `github.io` URL is needed before the custom domain works.
- Do not add a `CNAME` file. With a GitHub Actions deploy it is ignored; the custom domain is
  set in the repository settings instead.

### One-time setup (manual)

1. DNS for `tengmo.com`: add `stomme  CNAME  mtengmo.github.io.`
2. Repository Settings, Pages: set Source to "GitHub Actions" and Custom domain to
   `stomme.tengmo.com`.
3. After the certificate is issued, tick "Enforce HTTPS". The service worker, install and
   wake lock all require HTTPS.
4. Recommended: verify the `tengmo.com` domain under the account's Settings, Pages (TXT record)
   to prevent subdomain takeover.

Browser storage is per origin. Data entered on `github.io` does not appear on
`stomme.tengmo.com`, so use the app for real data only on the final domain.

### Knee rehabilitation and history

Choose **Mitt rehabprogram → Allmän knäträning – färdigt AAOS-baserat pass** to select from the 12 attributed knee-conditioning exercises. Choose working sides, enter an agreed dose and explicitly save the reusable programme without starting a workout. Knee and custom rehab selections are saved separately, included in JSON backup, and never automatically progressed. AAOS recommends selecting exercises with a doctor or physiotherapist; the collection is not a personalised prescription.

History lists sessions before charts and filters by programme, status and period. It shows complete planned sets (all selected sides required), partial sessions and missing symptom answers. Session details separate readiness, effort and symptoms, and retain the actual equipment, weight, amount and side of every logged set. Exercise comparisons filter by equipment and side rather than combining equal weights from different implements. Four-week frequency and recent before/after/next-day reports remain descriptive; missing answers are not zero symptoms. Legacy right-knee charts remain separate from new check-ins.

The general knee option now starts with six equipment-compatible exercises and editable AAOS-based doses. Existing saved plans and drafts take priority; **Återställ till färdigt knäpass** loads the template explicitly. New custom rehab plans still begin empty.

### Getting started

New users answer one question per screen: goal (**Bli starkare**, **Styrka för löpning** or **Knärehab**), then equipment, then (general and running only) training experience, then (general only) body-part focus. **Egenvikt** is the default equipment choice and means the body, a chair and a wall; **Utrustning** shows the dumbbell, kettlebell, band and other options and opens the weights panel when dumbbells or kettlebells are ticked. Experience drives the first workout: new gets basic exercises, 2 sets and the lightest owned weights; some adds practised exercises, 3 sets and middle weights; regular uses all exercises, 3-4 sets and heavier starting weights for two-footed squat, hinge, row and floor press (never for overhead or one-legged work, and always lightest when symptoms are on record). Rehab always saves experience as new. The working side for rehab is chosen on the equipment screen. Custom rehab remains available through **Jag har ett eget rehabprogram**.

**Anpassa passet** opens the full exercise editor; the default view shows exercise names, amounts, equipment and working sides with one **Börja passet** action. Readiness and symptom questions still precede exercise. When **Börja passet** is disabled, the reason is shown above it. Only the physiotherapist's knee programme asks for a tick that the plan matches the paper; AAOS and custom rehab do not. Returning users see the next A/B session (based on completed sessions in their programme) or resume their active workout. Profile changes are under **Ändra**. Existing legacy sessions keep the original week view.

### Remembered workouts, short sessions and weekly planning

For **Allmän styrka** and **Styrka för löpning**, edits to the ordinary A/B workout apply to today by default. Open **Behålla ändringar till nästa gång? → Behåll som mitt pass A/B** to remember exercises, order, sets, rest, equipment and working sides. Reps and weight can still be suggested from compatible full-session history. **Återställ appens förslag** removes only that saved programme/template. Named custom workouts and rehab plans keep their own save actions.

**Passlängd** offers a shorter version when it can reduce the planned duration: up to four exercises, at most two sets each, preserving rest, tempo and weight. Durations are rough estimates with rest and transitions; warm-up is additional. Switch back to **Helt pass** to restore the full draft. Short sessions are marked **Kortpass**, retain their full-plan snapshot, and count as activity in history. They do not advance the ordinary A/B sequence or establish progression; symptom reports still affect later suggestions. Rehab and named custom workouts are not shortened.

**Veckoplan** on the training home screen stores one to three preferred weekdays and lets you move one occurrence to another local date. Completed ordinary workouts fulfil planned dates; short and custom workouts still count toward weekly activity. The 48-hour rest information is advisory. These settings and saved routines are included in JSON backup. See [the implementation plan](docs/training-continuity-plan.md) for behavior and verification.

## License

Stomme is free software under the [GNU Affero General Public License v3.0 or later](LICENSE)
(AGPL-3.0-or-later). Copyright (C) 2026 mtengmo and Stomme contributors.

You may use, study, change and share it, including commercially. If you run a modified version
as a service for others, you must make your modified source code available under the same
license. There is no warranty, and the app is not medical advice.

Exercise descriptions and technique guidance that are derived from third-party sources keep
their own attribution and terms; see [the source review](docs/exercise-source-review.md).
