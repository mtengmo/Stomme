# Theme decisions (owner, approved 2026-10-22)

Source plan: `docs/plan-testing-and-themes.md`, Part 2. Palettes: `.impeccable/mocks/themes-palettes.md` (local, gitignored).
DESIGN.md is not rewritten yet; phase C (documenter) records the rule changes below.

## Decisions

- **Themes shipped:** Rutat (default), Hav A "Lagun", Kvällssol B "Skymning", Hög kontrast A "Vitt". The B variants of Hav and Hög kontrast and Kvällssol A are dropped.
- **One done colour per theme.** Rutat stays red pencil. The pencil-tick shape is identical in every theme.
- **Focus ring** is drawn 3 px outside the element (`outline-offset`) and is measured against `paper` and the surfaces only. Hög kontrast light uses a double ring (yellow on the edge plus an outer ring in the ink colour). The plan's "focus against action 3:1" check is replaced by this.
- **Stop screen** gets a 6 px `--care` frame (phase B).
- **The pencil tick** is used on every "Klar" chip (phase B).
- **Hög kontrast dark** keeps the pale pink stop button.
- **Theme choice is not in backups.** It is device-local: `localStorage['stomme.appearance'] = { theme, scheme: 'system' | 'light' | 'dark' }`. "Radera all data" clears it. Old backups import unchanged (backup schema stays 2).
- **Onboarding** gets a collapsed "Välj färger" (phase B).

## Rule changes for DESIGN.md (phase C)

1. **"Red Means Done" becomes the "One Done Colour Rule".** Each theme declares one `--done`, used for nothing else (pencil tick, "Klar" chip, tick on the day square). Rutat's is red; the other themes declare their own (Hav coral red, Kvällssol pine green, Hög kontrast blue).
2. **"Paper Is The Surface" is relaxed.** Surfaces may use `--surface-tint` (bottom bar, menu, cards) in addition to `--paper` and `--surface`. Still no shadows, no glass, no gradient text, no coloured side-stripes.
3. **Care screens** (pain, stop, warn) use a warning icon, a bold Swedish word ("Avbryt", "Stopp"), a heavy outline and `--care`. `--care` reaches 4.5:1 (7:1 in Hög kontrast) on paper and surface and differs from `--done` and `--accent` by deltaE2000 >= 20 (checked in `npm test`). `--care` is the outermost lightness (darkest in light, lightest in dark) so it separates in greyscale and under red-green colour blindness.
4. **Tokens.** `paper, surface, surface-tint, line, ink, ink-soft, edge, action, action-ink, done, accent, focus, info, today, today-ink, upcoming, upcoming-ink, care, care-ink, equipment`. `--red` is now `--done`, `--blue` is `--accent`, `--amber` is `--today`.

## Where things live

- `src/styles/themes/<id>.css` (light block, dark block), `src/styles/themes/registry.ts` (registered themes), `src/styles/themes/<id>.palette.ts` (decided, not yet registered: hav, kvallssol, hog-kontrast).
- `src/styles/contrast.ts` (pure WCAG and CIEDE2000, `evaluateTheme`), `src/styles/themes.test.ts` (gate for every registered theme and scheme, and for the pending palettes).
- `public/theme-boot.js` (blocking boot script), `src/lib/appearance.ts` (runtime get/set/subscribe).
