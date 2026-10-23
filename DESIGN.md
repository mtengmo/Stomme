---
name: Stomme
description: A training diary on faint squared paper where every set is ticked in the theme's one done colour (red pencil by default).
colors:
  paper: "#eef3f0"
  surface: "#eef3f0"
  surface-tint: "#eef3f0"
  line: "#d6e2dc"
  grid-line: "#d6e2dc"
  ink: "#23292b"
  ink-soft: "#4a5659"
  edge: "#66766f"
  action: "#23292b"
  action-ink: "#eef3f0"
  done: "#b52a23"
  done-fill: "transparent"
  done-fill-ink: "#b52a23"
  done-mark: "#b52a23"
  accent: "#2b4fa0"
  focus: "#2b4fa0"
  info: "#2b4fa0"
  today: "#f0b13a"
  today-ink: "#23292b"
  upcoming: "#dde6e2"
  upcoming-ink: "#3d484b"
  care: "#23292b"
  care-ink: "#eef3f0"
  equipment: "#9a4b12"
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
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "64px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "56px"
  button-care:
    backgroundColor: "{colors.care}"
    textColor: "{colors.care-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "64px"
  pass-card-lead:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  pass-card-receding:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip-today:
    backgroundColor: "{colors.today}"
    textColor: "{colors.today-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  chip-upcoming:
    backgroundColor: "{colors.upcoming}"
    textColor: "{colors.upcoming-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  chip-done:
    backgroundColor: "{colors.done-fill}"
    textColor: "{colors.done-fill-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  day-square:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    size: "44px"
  day-square-today:
    backgroundColor: "{colors.today}"
    textColor: "{colors.today-ink}"
    rounded: "{rounded.sm}"
    size: "44px"
  set-circle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "48px"
  banner:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  nav-tab:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    height: "64px"
  nav-tab-active:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "64px"
  theme-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "56px"
---

# Design System: Stomme

## Overview

**Creative North Star: "The Squared Notebook"**

Stomme is a training diary written on squared paper. Ink carries the content, the accent colour marks the working side (focus, selection, the next pass, info), and each theme spends exactly one colour on one meaning: done. The default theme, Rutat, is pale green-grey paper with graphite ink and a red pencil. The page itself is the surface; there is no card shadow, no glass, no gradient. The 24 px grid is printed on the body and everything sits on it, except in Hög kontrast, where the grid is switched off.

The system is built for a phone held at arm's length on the floor: heavy 3 px outlines, text never below 16 px, targets 44 px and up (primary actions 56-64 px), counts set in a tall condensed heavy face so the number reads from across a room. State is always word plus icon plus colour, never colour alone. The pencil-tick shape is the same in every theme; only its colour changes.

Four themes ship, each in a light and a dark scheme, chosen on the device (see Colors, Themes): Rutat (default, Restrained), Hav "Lagun" (Committed, teal paper with coral), Kvällssol "Skymning" (Full palette, warm dusk with pine green), Hög kontrast "Vitt" (Restrained, 7:1 text, white or black paper, no grid).

**Key Characteristics:**
- Squared paper background (24 px grid, 1 px `--grid-line`) in every theme except Hög kontrast.
- Thick outlines (3 px) instead of shadows; hierarchy by size and outline weight.
- One done colour per theme, used for nothing else; the pencil-tick shape is constant.
- Care screens (pain, stop) are a heavy `--care` frame plus warning icon plus a bold word.
- Condensed heavy numerals for headings and counts; plain platform sans for everything else.
- Flat, no elevation; one authored motion (a tick drawing on).

## Colors

Every colour in the UI is a semantic token declared per theme and scheme in `src/styles/themes/<id>.css` and mirrored in `<id>.ts`; components never use raw hex. The frontmatter lists the Rutat light set, which is also the `:root` fallback. Other themes redefine the same names (full values in the registered theme files and the sidecar `colorMeta`).

### Primary
- **Done** (`done`): completion only: pencil tick, "Klar" chip, tick on a finished day square, tally ticks. Per theme: Rutat red pencil (light #b52a23, dark #ff7d70), Hav coral red (light #b1340e, dark coral #ff9b73), Kvällssol pine green (light #135c43, dark #4fbf8f), Hög kontrast blue (light #003cb8, dark #8fb0ff).
- **Done fill / ink / mark** (`done-fill`, `done-fill-ink`, `done-mark`): optional chip and non-text tick tokens. Default: transparent fill, ink = `done`, mark = `done`. Hav light overrides them: the Klar chip is a solid coral fill (#ec6b50) with ink text (#0e2a2d) and an ink pencil tick, and the non-text tick mark is a separate coral (#d1502f), because coral cannot be readable text on the tinted surfaces. Hav dark returns to the outline chip in `done`.
- **Accent** (`accent`, also `focus`, `info`): the working side. Text selection, caret, the "Nästa pass" marker, info banner border, selected controls. Rutat blue ink, Hav blue, Kvällssol indigo, Hög kontrast teal (light) and green (dark).
- **Action** (`action`, `action-ink`): the primary button fill and text.

### Secondary
- **Today** (`today`, text `today-ink`): the "today" fill, always with dark text, the sun icon and the word "Idag", or a day square outlined in ink.
- **Upcoming** (`upcoming`, `upcoming-ink`): the "Kommande" chip.
- **Care** (`care`, `care-ink`): pain, stop and warn. The extreme colour of the theme, darkest in light schemes and lightest in dark, so it separates from `done` and `accent` in greyscale and under red-green colour blindness. Rutat: graphite / chalk (same as `action`). Hav: plum #4b1d48 / pale #f6e1f0. Kvällssol: night #1b1630 / cream #fff4e6. Hög kontrast: oxblood #5e0012 (light), pale pink #ffe6e3 (dark).
- **Equipment** (`equipment`): the equipment marker, a warm brown in light and amber in dark.

### Neutral
- **Paper** (`paper`): the page. **Surface** (`surface`): cards, fields, banners. **Surface tint** (`surface-tint`): bottom bar, menus, the lead pass card; in Rutat all three are identical.
- **Line / Grid line** (`line`, `grid-line`): the printed squares only (`grid-line` defaults to `line`, transparent in Hög kontrast). Never borders or text.
- **Ink** (`ink`): body text, outlines, nav underline. **Ink soft** (`ink-soft`): secondary text, inactive tabs. **Edge** (`edge`): outlines of receding things.
- **Focus parts** (`focus-outline`, `focus-ring`, `focus-ring-inset`): the focus ring. Default: 3 px `--focus` outline offset 3 px, no extra ring. Hög kontrast light: ink outline plus a 3 px #ffd500 ring (double ring); Hög kontrast dark: #ffd500 outline.

### Themes (loading, persistence, picker)
- **Strategy per theme.** Rutat Restrained, Hav Committed, Kvällssol Full palette, Hög kontrast Restrained.
- **Applied by** `data-theme` and `data-scheme` on `<html>`. `public/theme-boot.js` (blocking classic script in `<head>`) sets them before first paint from localStorage `stomme.appearance` = `{ theme, scheme: 'system' | 'light' | 'dark' }`; `src/lib/appearance.ts` is the runtime get/set/subscribe. The CSS has no `prefers-color-scheme` swap; the scheme is the attribute, and `system` is resolved in script.
- **theme-color meta** is set from the computed `--paper` of the active theme and scheme.
- **Device-local.** The choice is not in backups (backup schema stays 2) and is cleared by "Radera all data".
- **Picker.** Settings, "Utseende": a "Färgtema" radio list whose rows show a swatch and are at least 56 px tall, then "Ljust eller mörkt" with Ljust / Mörkt / Följ telefonen. Onboarding has a collapsed "Välj färger (kan ändras senare)".
- **Contrast gate.** `src/styles/themes.test.ts` (run by `npm test`) checks every registered theme and scheme with `src/styles/contrast.ts`; `npx tsx scripts/contrast.ts` prints the numbers. Text pairs 4.5:1 (7:1 in Hög kontrast), UI pairs 3:1, focus against paper, surface and surface-tint, `done` / `care` / `accent` pairwise deltaE2000 at least 20, and CSS must equal the registry. Observed at tip: `care` on paper 11.2:1 or better in the 4.5 themes and 14.1:1 or better in Hög kontrast; done-vs-care deltaE 27.4 to 37.8; Hav light `done-fill-ink` on `done-fill` 4.89:1 and `done-mark` on paper 3.59:1.
- **Adding a theme:** follow "Adding a colour theme" in CONTRIBUTING.md (CSS file, registry `ThemeDef`, `theme-boot.js` id list, gate, screenshots).

### Named Rules
**The One Done Colour Rule.** Each theme declares one `--done` and spends it only on completion. It is never a button, a link or decoration, and never close to `accent` or `care` (deltaE2000 at least 20). The pencil-tick shape is identical in every theme.

**The Care Is Extreme Rule.** `--care` is the outermost lightness of its theme and is the only colour for pain, stop and warn. It is distinct from `done` and `accent`, and always arrives with an icon and a word.

**The Colour Is Never Alone Rule.** Every state colour travels with an icon and a word (Klar, Idag, Kommande, Stopp) or a shape (the tick).

**The Tinted Not Shadowed Rule.** Surfaces may use `surface` and `surface-tint` as well as `paper`; depth is still never made with a shadow, glass, gradient or coloured side-stripe.

## Typography

**Display Font:** Barlow Condensed (self-hosted via @fontsource, weights 700/800, `font-display: swap`, fallback `sans-serif-condensed`, `sans-serif`)
**Body Font:** platform sans (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`)

**Character:** A tall condensed heavy face for headings and counts against the neutral system sans. Tabular numerals are set on `html`, so figures never shift width.

### Hierarchy
- **Display** (800, 3rem to 3.75rem, line-height 1): screen titles ("Vecka 42", "Välkommen till Stomme"), lead pass name (3.75rem).
- **Headline** (700, 2.25rem and 1.875rem, line-height 1): receding pass name, onboarding section heading.
- **Count** (800, 4.5rem / 1.25rem / set-circle digits at half circle size, line-height 1, letter-spacing -0.01em): the `.count` style for set tallies, day numbers and the lead "done / total" figure.
- **Count, rest** (800, 6rem, line-height 1): the rest countdown inside its ring.
- **Body** (400, 1.25rem, line-height 1.4): onboarding paragraphs, list items, button text (weight 700).
- **Label** (700, 1rem, line-height 1.4): chips, nav tab labels, banner text, secondary notes (regular weight). 16 px is the floor.

### Named Rules
**The Hundred-Percent Tabular Rule.** Tabular numerals everywhere; any number that changes (sets, dates, weights) uses them.

**The Floor Rule.** No text under 1rem.

## Layout

Mobile-first single column, centred, max width 28rem (`max-w-md`), 20 px horizontal padding, 20 px vertical rhythm between blocks (gap 20 px; 16 px between cards). Content is laid out for 360-430 px. A fixed bottom nav (64 px tabs plus the device safe-area inset) occupies the bottom; the screen reserves 7 rem of bottom padding and the primary action sticks 5.25 rem above the viewport bottom, in thumb reach. `html` has `scroll-padding-bottom` of 5rem plus the inset so focused controls clear the nav. The week strip is seven 44 px squares justified across the width, Monday first. Spacing steps in use: 8, 12, 16, 20, 24 px; the printed grid is 24 px with an 11 px offset.

## Elevation & Depth

Flat in every theme. There are no shadows (the only `box-shadow` is the Hög kontrast light focus ring). Depth and priority come from outline weight, size and, where a theme defines it, the step from `surface` to `surface-tint`: the lead pass card has an ink 3 px outline, `surface-tint` fill, larger padding and a larger title; the receding card has an edge outline, `surface` fill, smaller title and smaller circles. The tick overlapping a day square corner is the only deliberate overlap.

### Named Rules
**The Outline Not Shadow Rule.** Priority is shown by outline colour, outline weight, size and tint step, never by shadow.

## Shapes

Squared like graph paper: 6 px corners on buttons, cards and banners; 4 px on chips and day squares; full circles only for set counters. Outlines are 3 px for cards, nav top edge, secondary button, theme options and circles; 2 px for banners, day squares, the "Klar" chip and the stop-list frame; the stop screen carries a 6 px `--care` frame. Pencil ticks are hand-drawn tapered SVG strokes (three variants, rotated -3 to 2 degrees) rather than the UI check glyph. Icons are 24 px outline SVG, 2.25 stroke, round caps.

## Components

### Buttons
- **Shape:** 6 px corners, full width, 24 px side padding, 20 px bold text, centred with icon gap 8 px.
- **Primary:** `action` fill with `action-ink` text, 64 px minimum height. One per screen ("Starta pass", "Jag förstår, fortsätt").
- **Secondary:** surface fill, 3 px ink outline, 56 px minimum height.
- **Care:** `care` fill with `care-ink` text, 64 px, with the warning icon and the word ("Stopp", "Avbryt") on care screens.
- **Press / Disabled:** scales to 0.98 on press (150 ms ease-out); 50% opacity when disabled. Links that navigate use the same class.

### Chips
- **Style:** 4 px corners, 16 px bold text, 18 px icon plus word. Done ("Klar"): 2 px outline in `done` with `done` text and the pencil tick; in Hav light a solid `done-fill` with `done-fill-ink` text and ink tick. Today: `today` fill, `today-ink` text, sun icon. Upcoming: `upcoming` with `upcoming-ink`, clock icon.

### Cards / Containers
- **Pass card:** 6 px corners, 3 px outline. Lead: ink outline, `surface-tint` fill, 20 px padding, 4rem-class title, "Nästa pass" in accent, large count. Receding: edge outline, `surface` fill, 16 px padding.
- **Banner:** `surface` fill, 2 px outline (accent for info, ink for warn, `care` for care tone), icon plus text, 16 px padding.

### Tally (signature)
A row of set circles per pass: one circle per exercise, 3 px outline (ink on the lead card, edge otherwise), 48 px lead and 36 px receding, 6 px gap. A circle shows the sets left as a condensed digit; when finished it holds a pencil tick in `done-mark`. A newly completed set draws its tick on (480 ms, clip-path wipe, `cubic-bezier(0.16, 1, 0.3, 1)`); under reduced motion it appears without animation. Exposed to assistive tech as one image with a text label.

### Week strip
Seven 44 px squares with 2 px edge outlines holding day abbreviation and count-style number; today is `today` with an ink outline; a completed day carries a pencil tick offset at its top-right corner.

### Navigation
Fixed bottom bar, `surface-tint` fill, 3 px ink top rule, three equal tabs (Vecka, Historik, Inställningar), each 64 px tall with a 24 px icon above a 16 px label. Active: bold ink text and a 4 px ink underline, since the done colour means done only; inactive: `ink-soft` with transparent underline. Current page is flagged with `aria-current`. Its focus ring uses `--focus-ring-inset`.

### Stop frame (care screen)
The stop screen is paper inside a 6 px `--care` frame, with the 56 px warning icon, the bold word "Stopp", and a sticky bottom bar (`surface-tint`, 3 px `--care` top rule) holding a `--care` button. In Rutat care is graphite, so this replaces the older graphite-filled screen. The pain scale marks the chosen level with a 3 px `--care` outline and bold text.

### Theme picker
"Färgtema" is a radio list, each row at least 56 px tall with a 3 px outline, a swatch row of that theme's colours, its Swedish name and variant. Below, "Ljust eller mörkt": three equal buttons Ljust, Mörkt, Följ telefonen. Changes apply immediately.

### Settings blocks
Settings is plain ruled paper, not cards: each section opens with a 3 px ink rule and a 1.875rem condensed heading, with text and full-width secondary buttons below. Confirmations (replace data, delete all) take over the screen with a heading, one plain sentence, a safe secondary button first (Behåll min data) and the destructive action as the heavier primary button; never in the done or care colour. Status lines pair an icon with bold text. Update and backup-reminder banners are the info banner with a bold sentence and a 48 px action.

### Inputs / Fields
Fields sit on `surface`. Focus treatment is global: `:focus-visible` 3 px outline in `--focus-outline`, 3 px offset, 4 px radius, plus `--focus-ring`.

## Do's and Don'ts

### Do:
- **Do** read every colour from a semantic token (`bg-paper`, `text-ink`, `text-done`, `border-care`); never hard-code hex in components.
- **Do** keep the 24 px squared grid on the body in light and dark, via `--grid-line`.
- **Do** use 3 px outlines for primary containers and the ink or edge pair to separate lead from receding.
- **Do** spend `--done` only on completion, and `--accent` on focus, selection, next and info.
- **Do** build care screens as a 6 px `--care` frame or heavy outline, the warning icon and a bold Swedish word.
- **Do** pair every state colour with an icon and a Swedish word, or the pencil-tick shape.
- **Do** keep text at 1rem or larger and primary targets at 56-64 px.
- **Do** use `.count` (Barlow Condensed 800, tabular) for any number that is a quantity.
- **Do** honour `prefers-reduced-motion` for any new animation; the tick draw-on is the single authored motion.
- **Do** run `npm test` (the contrast and deltaE gate) after touching `src/styles/themes/`.

### Don't:
- **Don't** add shadows, gradients, glass, gradient text or coloured side-stripes; depth is outline, size and tint step.
- **Don't** use `--done` for buttons, links or decoration, or give it a second meaning.
- **Don't** let `--care` be close to `--done` or `--accent` (deltaE2000 under 20).
- **Don't** replace pencil ticks with a standard check glyph in set or day marks.
- **Don't** use colour as the only carrier of state.
- **Don't** use `grid-line` for borders or text.
- **Don't** put the theme choice in backups or IndexedDB, or swap themes with `prefers-color-scheme` in CSS.

## Known limits

- The PWA manifest `theme_color` and splash stay Rutat (#eef3f0); only the runtime `theme-color` meta follows the chosen theme.
- Hög kontrast light: `care` and `done` have a greyscale gap of 17.4; the care screens are carried by the icon and the word, not by colour.
- Hög kontrast dark: the pale-pink stop button (#ffe6e3) and the white start button never share a screen.
- Rutat care equals `action` (graphite), so care is told apart by frame, icon and word.

## Not canonized

Recorded as build facts, not rules for future surfaces: the "Nästa pass" accent text label above the lead card's count is an incidental state marker, not a kicker pattern to repeat. `CONTRIBUTING.md` line 68 still says "red is reserved for done"; that is stale against the One Done Colour Rule and is outside this write boundary.

## Muscle guidance and exercise choice

Exercise discovery and details keep the notebook surfaces, outlined controls and Swedish copy. The library uses wrapping, labelled filters with a check and pressed state. Primary matches and supporting matches have separate text headings. A/B preview changes use an inline native select, with duplicate choices disabled, an explicit reset and the existing bottom action.

The accent colour (`--accent`) identifies selected controls, the H/V side marker and anatomy regions. The meaning is explained in each context: movement mode can highlight the working side; anatomy overlay mode keeps limb strokes neutral and marks broad training regions. Primary regions are solid, supporting regions hatched; both have text labels. The done colour keeps its completion meaning and `--care` its stop meaning, in every theme. Maps have front/back labels and muscle links large enough to tap.

Looping exercise demonstrations can be paused and resumed. Reduced motion uses static start/end frames and the same muscle map. Detailed anatomy appears in exercise details and the session's help sheet; compact set figures keep their existing movement/side behaviour.

Week tallies follow the stored session roster, count both sides as one set, and wrap when the optional sixth exercise is present. Active workouts show “Pågår” even after the same pass was completed earlier in the week.
