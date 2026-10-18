---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: Stomme app shell, week view, onboarding (Operate)

Scope and mode: Operate. Mobile-first Android PWA (360-430 px), Swedish UI. Surfaces: design tokens, app shell + bottom nav, primitives (Button, Ring, Banner), week view, onboarding/disclaimer. Later: session mode, exercise cards, history.

Audience and job: owner now, public later; runner doing two short strength sessions, one-handed on the floor, glancing from arm's length. Constraints: targets >= 48 px, text >= 16 px, light and dark follow the system, colour never the only signal, reduced motion respected, no medical advice beyond rules.

Chosen direction: Rutat skrivbok (squared school notebook). Memorable moment: completed sets are ticked in red pencil. Unresolved: font choice (system stack vs one self-hosted hyperlegible face), dark-theme rendition of the paper.

## Direction contract
THESIS: A training diary on faint squared paper where every set is ticked in pencil; refuses the dark neon fitness-dashboard arrangement and any clinical or spreadsheet look.
OWN-WORLD: Pale green-grey squared paper (#eef3f0 with faint #cfdcd6 24 px grid), graphite ink (#23292b), red pencil (#d6382f) for done/ticks, blue ink (#2b4fa0) for the working side and links; dark theme is a deep graphite sheet with the same grid at low contrast, chalk text, softened red and blue. Workhorse system sans for UI, one condensed heavy numeral style for counts; fixed-width tabular numerals everywhere. Amber for "today" as fill with dark text, grey for upcoming; always paired with icon and word.
STORY: User sees at once which pass is next and what is done, taps one big button, and every set felt like ticking a box.
FIRST VIEWPORT: Week view at 390x844: top bar with week label, a Monday-first seven-day strip as squares on the grid, below it two large pass cards (Pass A, Pass B) each with a set-circle tally ring and state label (Klar / Idag / Kommande), the next pass marked, one full-width dark primary button "Starta pass" in the bottom third above a three-tab bottom nav (Vecka, Historik, Inställningar).
FORM: Rutat skrivbok, assigned (position 7 of grounded list). seed:87bef74920f1e343
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
