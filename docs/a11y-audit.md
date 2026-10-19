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
