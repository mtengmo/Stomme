# Accessibility and dark theme audit (M6.7)

Scope: onboarding, week, pass preview, pain screens (before, after, stop), session set, rest, effort, summary, exercise card and sheet, history, session detail, settings (main and delete confirm), stale session actions, and the root error screen. Light and dark, 360x800. Data was synthetic; no personal data is recorded here. The import confirmation flow is covered separately by Playwright.

Re-run:

- `npx tsx scripts/contrast.ts` computes contrast numerically from the tokens in `src/styles/index.css` (exit code 1 on failure).
- `npx tsx scripts/a11y-audit.ts` drives the dev server through all screens in both themes and reports targets under 48 px, text under 16 px, unnamed controls, missing focus rings on the first Tab stops, running animations under reduced motion, and dialog keyboard behaviour (38 screen audits). Findings produce a failing exit code.
- `npm run audit:a11y` runs both checks.

## Results

| Check | Result |
| --- | --- |
| Contrast, body text 4.5:1 (ink, ink-soft, red, blue, button text, chips; also over a printed grid line) | Pass in light and dark. Lowest: red on grid line, light, 4.75:1 |
| Contrast, UI and large text 3:1 (outlines, focus ring, tick) | Pass in light and dark. Lowest: edge grey on grid line, light, 3.60:1 |
| Touch targets 48 px | Pass on all 34 screen audits. Fixed: exercise links in session detail were 28 px tall |
| Text 16 px minimum | Pass on all audited screens |
| Focus ring visible on keyboard focus | Pass (global 3 px blue outline, 3 px offset); hidden radio and file inputs delegate to their label or button |
| Colour never the only signal | Pass by review: state chips carry icon and word (Klar, Idag, Kommande); notices carry an icon and text; links are underlined; the update and reminder banners have text; set completion is a tick shape plus a text label on the tally; destructive actions are the heavier filled button, not a colour |
| Reduced motion | Pass: no running animations on the week view; global rule now zeroes transition and animation durations and the press scale; the tick draw-on is already disabled |
| Dialogs and confirmations, keyboard | Fixed: the exercise sheet now closes with Escape from anywhere and keeps Tab inside (document-level handler; covered by e2e). Settings confirmations take focus on their heading, and Escape returns without changes |
| Names for controls | Pass: no unnamed buttons, links or inputs |

## Fixes made

- Light `red` darkened from #c22f27 to #b52a23 so red text keeps 4.5:1 over a grid line (was 4.23:1). Updated in `src/styles/index.css` and `DESIGN.md`.
- Exercise links in session detail: 48 px minimum height and underlined.
- Exercise sheet: focus trap and document-level Escape.
- Global reduced-motion rule.

## Not machine-checked or accepted

- The amber "today" fill against paper is 1.69:1 in light. It is never the only signal: today also has a 2 px ink outline (13:1), bold text and `aria-current="date"`, and the week card chip adds the sun icon and the word Idag.
- Day squares (44 px) and tally circles are not interactive, so the 48 px target rule does not apply to them.
- Screen reader behaviour (TalkBack) was reviewed through roles and names only, not on a device.
- Resolved: the `warn` tone of `Banner` is now an ink outline and ink icon (no red), so red means done only.

## Re-run (2026-10-19, after the review fixes)

`scripts/contrast.ts`: all pairs pass in light and dark. `scripts/a11y-audit.ts`: 34 screen audits, no findings (targets, text size, names, focus rings, reduced motion, dialog keyboard).

## Final merged release verification (2026-10-19)

Updated the session walk to expect the summary immediately after saving the after-pain reading. Added stale-session and error-boundary checks, an explicit failure if the walk never reaches the summary, and a failing exit code for findings. Vite is launched directly with the current Node executable so cleanup terminates the server without a shell intermediary.

On Node 24: all contrast pairs pass and all 38 screen audits report no findings. All 391 unit tests and 14 production Playwright tests pass; type-check, lint check (with existing reduced-motion CSS warnings), and production build pass. Initial JavaScript is approximately 131 KB gzipped including the service-worker registration helper, below the 150 KB target.

Captured the final pain-stop, week warning, stale-session and error-boundary screens at 360×800 and 412×915 in both themes. Visual spot checks found no clipping or unreadable controls. Physical Android/TalkBack testing remains a manual check.

## Muscle guidance feature (2026-10-19)

The audit now additionally covers the filtered exercise library, muscle-overlay movement view, front/back map and inline exercise choices in both themes: 46 screen audits, no findings. Contrast checks pass with the existing tokens. Each run reserves its own server port and closes its browsers on failure, avoiding accidental checks against another worktree's server.

Production browser checks also verify filter/Back restoration, invalid filters, choices surviving detail inspection/pain replanning/reload, reduced motion, real animation pause/resume, and the optional sixth exercise fitting inside a 360 px week card. All 18 browser tests pass. The front/back region diagrams have matching text labels and solid/patterned distinctions; the maps explain broad training focus, not precise activation.

## Numbered exercise review (2026-10-19)

The read-only `#/granska` page adds fixed E01–E11 references, a desktop catalogue/mobile picker, previous/next navigation, stable per-exercise links and both-side start/mid/end frames. References also appear in the library and exercise cards. This metadata does not change stored workout IDs or backup schemas.

All 50 screen audits report no findings, including the review page and its muscle-frame mode in both themes. Mobile-dark and desktop-light browser checks cover all eleven references, direct links, Back/reload restoration, narrow layout and offline review. All 20 production browser tests and 415 unit tests pass; type/lint check and production build pass with the existing CSS warnings. The review route is loaded on demand; initial JavaScript remains about 136.7 KB gzipped. Impeccable's detector reports no findings on the changed surfaces.

## 2026-10-21: workout workflow branch

Result: 90 screen audits (360x800, light and dark), no findings; contrast pairs pass; `impeccable detect` returns no findings.

Two findings were investigated:
- `unnamed control summary ""` on session set, timed hold and general training set. Cause: a false positive in the audit script. The summary "Visa muskelkarta" sits inside the closed "Hur gör man?" details; its `innerText` is empty because the outer details is closed, yet the script only checked the nearest closed details. It reproduced identically at ab01d14 (audited in a separate worktree), so it predates the workout workflow work. The script now treats a summary nested in any closed details as hidden. The control itself has a real visible name.
- A 14 px note on the history overview ("Saknade pass betyder saknade mätningar"), also present at ab01d14, is now 16 px.

The training walk now follows the compact editor (rows opened through "Ändra"), the optional pre-check, effort inside the rest screen and the final effort screen.
