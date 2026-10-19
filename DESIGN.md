---
name: Stomme
description: A training diary on faint squared paper where every set is ticked in red pencil.
colors:
  paper: "#eef3f0"
  grid-line: "#d6e2dc"
  graphite-ink: "#23292b"
  graphite-soft: "#4a5659"
  edge-grey: "#66766f"
  upcoming-fill: "#dde6e2"
  upcoming-ink: "#3d484b"
  red-pencil: "#c22f27"
  blue-ink: "#2b4fa0"
  today-amber: "#f0b13a"
  today-amber-ink: "#23292b"
  paper-dark: "#1a1f21"
  grid-line-dark: "#242b2e"
  chalk-ink: "#e8eeea"
  chalk-soft: "#a9b6b2"
  edge-grey-dark: "#7f8f8a"
  upcoming-fill-dark: "#2a3134"
  upcoming-ink-dark: "#c3cecb"
  red-pencil-dark: "#ff7d70"
  blue-ink-dark: "#93b2ff"
  today-amber-dark: "#e6aa35"
  today-amber-ink-dark: "#1a1f21"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif-condensed, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: "Barlow Condensed, sans-serif-condensed, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  count:
    fontFamily: "Barlow Condensed, sans-serif-condensed, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  count-rest:
    fontFamily: "Barlow Condensed, sans-serif-condensed, sans-serif"
    fontSize: "6rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  full: "9999px"
spacing:
  grid: "24px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.graphite-ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "64px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "56px"
  pass-card-lead:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "20px"
  pass-card-receding:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip-today:
    backgroundColor: "{colors.today-amber}"
    textColor: "{colors.today-amber-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  chip-upcoming:
    backgroundColor: "{colors.upcoming-fill}"
    textColor: "{colors.upcoming-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  chip-done:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.red-pencil}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  day-square:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.sm}"
    size: "44px"
  day-square-today:
    backgroundColor: "{colors.today-amber}"
    textColor: "{colors.today-amber-ink}"
    rounded: "{rounded.sm}"
    size: "44px"
  set-circle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.full}"
    size: "48px"
  banner:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  nav-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-soft}"
    typography: "{typography.label}"
    height: "64px"
  nav-tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.label}"
    height: "64px"
---

# Design System: Stomme

## Overview

**Creative North Star: "The Squared Notebook"**

Stomme is a training diary written on pale green-grey squared paper. Graphite ink carries the content, blue ink marks the working side (focus, selection, the next pass, info), and red pencil is reserved for one meaning: done. The page itself is the surface; there is no card shadow, no glass, no gradient. The 24 px grid is printed on the body and everything sits on it.

The system is built for a phone held at arm's length on the floor: heavy 3 px graphite outlines, text never below 16 px, targets 44 px and up (primary actions 56-64 px), counts set in a tall condensed heavy face so the number reads from across a room. State is always word plus icon plus colour, never colour alone. Light and dark both follow the system; dark is a deep graphite sheet with the same grid at low contrast and softened red and blue.

**Key Characteristics:**
- Squared paper background (24 px grid, 1 px lines) in both themes.
- Thick graphite outlines (3 px) instead of shadows; hierarchy by size and outline weight.
- Red is spent only on completion (pencil ticks, done chip, stop-list dashes, warning banner).
- Condensed heavy numerals for headings and counts; plain platform sans for everything else.
- Flat, no elevation; one authored motion (a tick drawing on).

## Colors

Cool green-grey paper, graphite and chalk text, with two pen colours (red pencil, blue ink) and one highlighter (amber). Light values are the `:root` set; dark values swap under `prefers-color-scheme: dark` and are named with the `-dark` suffix.

### Primary
- **Red Pencil** (`red-pencil`; dark: `red-pencil-dark`): completion only. Pencil tick fill, the "Klar" chip outline and text, the warning banner border and icon, the short dashes in the onboarding stop list.
- **Blue Ink** (`blue-ink`; dark: `blue-ink-dark`): the working side. Focus ring (3 px), text selection, caret, the "Nästa pass" marker, info banner border, rule lines in the onboarding stop list.

### Secondary
- **Today Amber** (`today-amber`, text `today-amber-ink`; dark variants suffixed): the "today" fill, always with dark text and always paired with the sun icon and the word "Idag" or the day square being outlined in graphite.

### Neutral
- **Paper** (`paper`; dark: `paper-dark`): page and every surface; surfaces are not tinted differently from the page.
- **Grid Line** (`grid-line`; dark: `grid-line-dark`): the printed 24 px squares only. Never used for borders or text.
- **Graphite Ink** (`graphite-ink`; dark: `chalk-ink`): body text, lead outlines, primary button fill.
- **Graphite Soft** (`graphite-soft`; dark: `chalk-soft`): secondary text, inactive tabs, date ranges, rest note.
- **Edge Grey** (`edge-grey`; dark: `edge-grey-dark`): outlines of receding things (upcoming pass card, day squares, its tally circles).
- **Upcoming Fill / Ink** (`upcoming-fill`, `upcoming-ink`; dark variants suffixed): the "Kommande" chip.

### Named Rules
**The Red Means Done Rule.** Red pencil marks completion or a hard stop. It is never decoration, never a primary button, never a link.

**The Paper Is The Surface Rule.** Cards, banners, nav and chips sit on `paper` with an outline; depth is never made with a different fill or a shadow.

**The Word And Icon Rule.** Every state colour travels with an icon and a word (Klar, Idag, Kommande).

## Typography

**Display Font:** Barlow Condensed (self-hosted via @fontsource, weights 700/800, `font-display: swap`, fallback `sans-serif-condensed`, `sans-serif`)
**Body Font:** platform sans (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`)

**Character:** A tall condensed heavy face for headings and counts against the neutral system sans. Tabular numerals are set on `html`, so figures never shift width.

### Hierarchy
- **Display** (800, 3rem to 3.75rem, line-height 1): screen titles ("Vecka 42", "Välkommen till Stomme"), lead pass name (3.75rem).
- **Headline** (700, 2.25rem and 1.875rem, line-height 1): receding pass name, onboarding section heading.
- **Count** (800, 4.5rem / 1.25rem / set-circle digits at half circle size, line-height 1, letter-spacing -0.01em): the `.count` style for set tallies, day numbers and the lead "done / total" figure.
- **Count, rest** (800, 6rem, line-height 1): the rest countdown inside its ring; the one step above Count, set so the time reads from across the room.
- **Body** (400, 1.25rem, line-height 1.4): onboarding paragraphs, list items, button text (weight 700).
- **Label** (700, 1rem, line-height 1.4): chips, nav tab labels, banner text, secondary notes (regular weight). 16 px is the floor.

### Named Rules
**The Hundred-Percent Tabular Rule.** Tabular numerals everywhere; any number that changes (sets, dates, weights) uses them.

**The Floor Rule.** No text under 1rem.

## Layout

Mobile-first single column, centred, max width 28rem (`max-w-md`), 20 px horizontal padding, 20 px vertical rhythm between blocks (gap 20 px; 16 px between cards). Content is laid out for 360-430 px. A fixed bottom nav (64 px tabs plus the device safe-area inset) occupies the bottom; the screen reserves 7 rem of bottom padding and the primary action sticks 5.25 rem above the viewport bottom, in thumb reach. The week strip is seven 44 px squares justified across the width, Monday first. Spacing steps in use: 8, 12, 16, 20, 24 px; the printed grid is 24 px with a 11 px offset.

## Elevation & Depth

Flat. There are no shadows. Depth and priority come from outline weight and size: the lead (next) pass card has a graphite 3 px outline, larger padding and a larger title; the receding card has an edge-grey outline, smaller title and smaller circles. The tick overlapping a day square corner is the only deliberate overlap.

### Named Rules
**The Outline Not Shadow Rule.** Priority is shown by outline colour, outline weight and size.

## Shapes

Squared like graph paper: 6 px corners on buttons, cards and banners; 4 px on chips and day squares; full circles only for set counters. Outlines are 3 px for cards, nav top edge, secondary button and circles; 2 px for banners, day squares, the "Klar" chip and the stop-list frame. Pencil ticks are hand-drawn tapered SVG strokes (three variants, rotated -3 to 2 degrees) rather than the UI check glyph. Icons are 24 px outline SVG, 2.25 stroke, round caps.

## Components

### Buttons
- **Shape:** 6 px corners, full width, 24 px side padding, 20 px bold text, centred with icon gap 8 px.
- **Primary:** graphite fill with paper text, 64 px minimum height. One per screen ("Starta pass", "Jag förstår, fortsätt").
- **Secondary:** paper fill, 3 px graphite outline, 56 px minimum height.
- **Press / Disabled:** scales to 0.98 on press (150 ms ease-out); 50% opacity when disabled. Links that navigate use the same class.

### Chips
- **Style:** 4 px corners, 16 px bold text, 18 px icon plus word. Done: 2 px red outline and red text, check icon. Today: amber fill, dark text, sun icon. Upcoming: upcoming-fill with upcoming-ink, clock icon.

### Cards / Containers
- **Pass card:** paper fill, 6 px corners, 3 px outline. Lead: graphite outline, 20 px padding, 4rem-class title, "Nästa pass" in blue ink, large count. Receding: edge-grey outline, 16 px padding.
- **Banner:** paper fill, 2 px outline (blue info, red warn), icon plus text, 16 px padding.

### Tally (signature)
A row of set circles per pass: one circle per exercise, 3 px outline (graphite on the lead card, edge-grey otherwise), 48 px lead and 36 px receding, 6 px gap. A circle shows the sets left as a condensed digit; when finished it holds a red pencil tick. A newly completed set draws its tick on (480 ms, clip-path wipe, `cubic-bezier(0.16, 1, 0.3, 1)`); under reduced motion it appears without animation. Exposed to assistive tech as one image with a text label.

### Week strip
Seven 44 px squares with 2 px outlines (edge grey) holding day abbreviation and count-style number; today is amber with a graphite outline; a completed day carries a pencil tick offset at its top-right corner.

### Navigation
Fixed bottom bar, paper fill, 3 px graphite top rule, three equal tabs (Vecka, Historik, Inställningar), each 64 px tall with a 24 px icon above a 16 px label. Active: bold graphite text and a 4 px graphite (ink) underline, since red means done only; inactive: graphite-soft with transparent underline. Current page is flagged with `aria-current`.

### Inputs / Fields
Not yet built. Focus treatment is global: 3 px blue outline, 3 px offset, 4 px radius.

## Do's and Don'ts

### Do:
- **Do** keep the 24 px squared grid on the body in light and dark.
- **Do** use 3 px outlines for primary containers and the graphite or edge-grey pair to separate lead from receding.
- **Do** use red pencil only for done, stop and warning, and blue ink for focus, selection, next and info.
- **Do** pair every state colour with an icon and a Swedish word.
- **Do** keep text at 1rem or larger and primary targets at 56-64 px.
- **Do** use `.count` (Barlow Condensed 800, tabular) for any number that is a quantity.
- **Do** honour `prefers-reduced-motion` for any new animation; the tick draw-on is the single authored motion.

### Don't:
- **Don't** add shadows, gradients, glass or tinted card fills; depth is outline and size.
- **Don't** use the red pencil for buttons, links or decoration.
- **Don't** use a different fill for surfaces than `paper`.
- **Don't** replace pencil ticks with a standard check glyph in set or day marks.
- **Don't** use colour as the only carrier of state.
- **Don't** let the grid line colour be used for borders or text.

## Not canonized

Recorded here as build facts, not rules for future surfaces: the "Nästa pass" blue text label above the lead card's count is an incidental state marker, not a kicker pattern to repeat; routes for session, history and settings are stubs and have no visual system yet.
