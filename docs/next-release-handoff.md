# Next release: reliable updates, one exercise guide, knee content

Date: 2026-10-20. Baseline: 0.1.74 / 96f2913.
Status: implementation-ready planning handoff for Sol and Luna. No runtime changes in this planning pass.

This supplements `general-strength-plan.md`. Deliver update reliability and the simpler guide first; then expand the library. History work remains deferred. The existing programme and saved sessions must survive each release.

## 1. Unified how-to guide — Luna

### Impeccable brief

Job: a person pauses during exercise to understand the movement, working side, selected weight and muscles. Success is understanding those together without switching views. Preserve the existing notebook design, typography, contrast and touch targets. Treat this as a reader inside a workout, not a three-page mini-application.

Replace Rörelse / Muskler / Så gör du tabs with one continuous guide:

1. Fixed header: close/back, exercise name and stable reference.
2. Selected equipment/load and working side, followed by the movement demonstration and its pause control.
3. A compact, always-visible muscle summary: “Tränar främst” and “Hjälper till”. Show the reviewed muscle overlay directly on the movement where available.
4. Three numbered instructions immediately after the demonstration; desktop places these beside the movement.
5. Common mistake and easier option below. Place the full front/back body map and source details farther down in the same document, with a compact optional “Visa muskelkarta” disclosure if space warrants it. Essential instructions and muscle names must never require that disclosure.

Mobile: one internal scroll container for the guide below the fixed header. Start with a compact but readable demonstration so instructions follow naturally; do not pin so many controls that they consume the viewport. Desktop: movement on the left, muscle summary/instructions on the right, within one bounded reader. Short landscape screens and text zoom may scroll inside that reader. Avoid separately scrolling columns. Keep the underlying browser page still and preserve its scroll position on close.

Movement overlays remain approximate anatomy hints with a concise legend. Where none is reviewed, retain the text summary and in-document map; do not fabricate overlays. Reduced motion shows labelled static positions with the same instructions. The exercise review route keeps previous/next exercise and Start/Mitt/Slut controls, using this unified content layout.

### Ownership and boundaries

Luna owns `ExerciseCard.tsx`, guide-related `ExerciseReview.tsx` changes, scoped guide CSS, exercise component tests and guide/review browser tests. Read the Impeccable skill and applicable project context; do not repeat its context launcher if already run in the same agent session. Follow its bounded desktop/mobile visual inspection process.

Keep the current props contract (`exercise`, `side`, `loadIndex`, `review`) so the session can supply its actual selection. Keep focus trapping, Escape/Back closing, focus restoration, body scroll lock, selected-weight instructions and reference links. Do not change exercise prescriptions, PWA lifecycle code or shared content taxonomy in this task.

Acceptance: all three numbered instructions and primary/supporting muscle text exist in the default guide, without clicking a view tab. On 360×800, 1280×900, short landscape and 200% zoom, all content and controls remain reachable. Closing restores the set, amounts, selected load, focus and underlying page position. No document scrolling behind the modal; no horizontal overflow. Test normal/reduced motion and light/dark themes.

## 2. Reliable update discovery — Sol (first priority)

### Evidence and remaining uncertainty

The user sees the latest deployment in incognito but an older app in their regular browser. A fresh-browser deployment smoke test does not test an installed app upgrading.

Confirmed in the current code:

- `src/lib/update.ts` registers the service worker with `immediate: true`; it has no explicit foreground, online-return or periodic update check and no visible registration-error state.
- `App.tsx` limits the prompt to the week, history and Settings routes. Library/review users can miss a pending update.
- Hook tests mock the waiting-update flag; browser tests do not publish a second build to an origin already controlled by the first build.

These are gaps to fix, not a proven diagnosis of the user's browser. Reproduce the lifecycle before attributing the incident to caching or browser behaviour. Inspect response headers and registration state for the current origin, scope and service-worker URL.

### Implementation contract

Use the registration provided by `onRegisteredSW` and the installed plugin's supported API. Explicitly check at startup after registration, on returning to a visible tab, and on reconnecting. Propose a five-minute visible/online interval, with a one-minute throttle for automatic event bursts, deduplication and cleanup. A manual Settings action may bypass the time throttle but must share the in-flight request. Skip offline checks and report failures without breaking offline use.

Settings keeps the installed version and commit visible at all times and adds “Sök efter uppdatering”. Model states separately: checking, installing, ready to apply, no update found after a completed check, offline, and failed/retry. `registration.update()` resolving is not proof that a newly found worker has finished installing. Only offer activation when the waiting worker is ready. Never claim “latest version” after an unsuccessful check.

Keep prompt-based activation. Show a compact pending-update affordance on browsing screens and defer disruptive UI during a workout or exercise-help modal. Let the user apply the update explicitly. Coordinate banner placement with bounded guide heights so a new banner does not reintroduce document overflow. Version numbers remain in Settings only.

Handle an update accepted in a second tab: do not unexpectedly reload a tab with an active session or discard unsaved values. Check the installed plugin's `onNeedReload` behaviour; if necessary defer reload until a safe boundary and show a pending state. Test this instead of assuming route-based banner suppression covers it.

Do not clear IndexedDB, unregister all workers, or erase all caches as a repair strategy. Existing installed clients need a normal upgrade path. A future update-check fix cannot run until an old client receives it; document a data-preserving recovery path for an old stuck version and test old-to-new bootstrap explicitly.

### Ownership and proof

Sol owns `src/lib/update.ts`, `updateContext.ts`, update-related `Settings.tsx` and `App.tsx`, PWA configuration if required, hook tests and a new real-upgrade browser test. Luna owns the guide: coordinate only the banner/height boundary.

Create an isolated test server whose served production build can switch from A to B on the same origin while preserving one browser profile/context. Build assets must genuinely differ, and old hashed assets must remain available during the test. Wait for worker lifecycle events rather than assuming a fresh browser or adding an arbitrary sleep.

Required cases:

1. Load A and save sample workout data; switch the server to B; keep the tab open; trigger a foreground check; wait for installation and prompt; accept; assert B and unchanged saved data.
2. Repeat across an offline interval, including a failed update check and successful retry.
3. Detect B during an active session: no interruption; complete/leave the session safely, then update and retain its logs.
4. Reopen a client with an already-waiting worker; manual Settings check must report the correct state.
5. Two tabs, including one with an active workout: applying in one must not silently lose work in the other.
6. Verify the installed A build's bootstrap path, not just a new test build that already contains the fix.

Reference: [Vite PWA update-check guidance](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates) and [React integration](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/frameworks/react.md). Use these with the installed package source, since lifecycle details can differ between versions.

## 3. AAOS knee collection — content by Luna, integration by Sol

The [AAOS Knee Conditioning Program](https://orthoinfo.aaos.org/globalassets/pdfs/2017-rehab_knee.pdf) lists the following movements. Its programme calls for clinician-guided selection and advises discussing exercise pain with the clinician. Treat it as an attributed educational source, not an endorsement of Stomme or a personalised prescription.

| Source movement | Proposed catalogue action |
|---|---|
| Half squat | E28: separate from chair squat and planned free goblet squat |
| Standing hamstring curl | E29: new |
| Calf raise | Review existing E08 for correspondence; preserve its ID/history |
| Seated knee extension | E30: new |
| Straight-leg raise | E31: new |
| Prone straight-leg raise | E32: new |
| Side-lying hip abduction | E33: new |
| Side-lying hip adduction | E34: new |
| Calf/heel-cord stretch | E35: new mobility entry |
| Standing quadriceps stretch | E36: new mobility entry |
| Supine hamstring stretch | E37: new mobility entry |
| Band leg press | E38: new, requires resistance-band equipment support |

Source positions: PDF pages 2–3 for stretches; 4–8 for strength movements, counting the cover as page 1. Validate movements individually, not merely their names. Source numbering is not the app reference numbering. E12–E27 remain reserved by the general-strength plan.

### Content delivery and model requirements

Luna first writes a source-to-content matrix with Swedish names, reviewed instructions in original wording, exact source/page links, equipment, muscles, side handling and differences from existing entries. Do not copy the PDF illustrations or imply blanket clinical approval. The table above reserves candidate IDs; registration in the runtime catalogue happens only after content and poses are complete.

Stage the additions: strength entries E28–E34 first, with E08 reviewed; stretches E35–E37 and band press E38 after their interaction/equipment support exists. This creates up to 38 total entries when combined with the prior general-strength plan, not 12 duplicate additions.

Do not present the existing 0–3 pain threshold as sourced from AAOS. Keep source-specific clinical advice distinguishable from the app's existing policy. Resolve programme policy before making an AAOS-derived session runnable; library browsing alone must not silently change current treatment or training rules.

Add structured exercise kind (strength/mobility), equipment requirements and source metadata. Mobility holds and pauses within repetitions are not equivalent to a single whole-set countdown. Affected-side guidance also differs from the current universal right-then-left sequence; support clinician-selected side/both explicitly before a rehab template uses those entries.

Bodyweight-only initial variants are acceptable where accurate, but label supported variants honestly. Never substitute a handheld dumbbell for an ankle weight, or pretend a band exercise is equipment-free. No automatic import of source doses into the user's current programme.

Sol integrates approved content with types, validators, backup compatibility, filtering and new poses, or assigns pose work to Luna after the guide task. The coordinator owns final shared-file merges. Keep `Knäfokus`, `Löpstyrka`, `Mitt program`, and source attribution as separate metadata. Source membership must not automatically grant a running tag or an allowed programme substitution.

Acceptance: each released candidate has attributed reviewed instructions and correct equipment/side visuals; the source collection is discoverable through knee filters; old references and workout history remain valid; missing variants are not offered. Tests cover metadata completeness, filter membership, units, side selection and backup round-trips. Clinical content uncertainty is recorded rather than filled with invented dosing.

## 4. Training-direction setup and feeling questions — Luna + Sol

User-approved addition, 2026-10-20. The full behaviour contract is in `general-strength-plan.md`, “Training-direction setup and feeling questions”.

- **Luna:** design and implement first-use “Vad vill du träna?”, equipment selection, general-strength experience selection, the remembered programme overview and “Byt träningsinriktning”. Design concise before/after questions and separate exercise-effort and symptom controls. Implement against an agreed policy/data interface; no clinical thresholds in UI components.
- **Sol:** define programme identity, question policy, feedback persistence and progression integration before Luna wires the screens. Preserve old knee-pain/effort data, active sessions and backups. Keep readiness, effort, overall feeling and symptoms separate; record programme/policy version with answers. Add conditional follow-up scheduling and explicit reasons for future workout suggestions.
- **Coordinator:** settle exact answer choices, follow-up triggers and reviewed programme limits before enabling automatic adjustments. Review shared domain/backup changes centrally. Choosing rehab must not automatically prescribe a programme.

Acceptance includes all three directions (`Allmän styrka`, `Styrka för löpning`, `Mitt rehabprogram`), remembered setup, unchanged active sessions, programme-specific checks and visible explanations. Test easy effort with pain separately from hard effort without pain; unanswered checks must not become “no pain”. Verify conditional next-day prompts, resume, programme switching and old-backup migration. History redesign and push notifications remain deferred.

## Scheduling and integration

1. Start Sol on update reproduction/fix and Luna on the combined guide concurrently in separate branches/worktrees, with the file ownership above.
2. Coordinator reviews both, reconciles banner placement, runs required checks and merges the small reliability/guide release. Verify a real existing-client upgrade on deployment. Automatic Settings version increments with commits.
3. Luna prepares the AAOS content matrix while Sol implements the broader-library filter/variant foundation from `general-strength-plan.md`.
4. Integrate reviewed general-strength and knee content in small batches. Register IDs centrally to prevent collisions. Any database or backup changes must include migrations and regression tests before merging.
5. Sol establishes programme/feedback contracts; Luna implements training-direction setup and feeling-question screens against them. Integrate this with the general-programme milestone, after content/policy review, without delaying the update/guide fix.
6. Run static checks, affected unit tests, full browser release flows, light/dark accessibility checks and bounded visual inspection. Preserve the existing first-load JS target and offline behaviour.

Definition of done for the first release: regular installed clients discover and apply updates without incognito; movement, muscles and instructions are in one guide; selected weight/side and saved workout state remain correct. The content expansion follows as separate reviewed releases rather than delaying the reliability fix.
