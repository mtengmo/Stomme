# Remaining workout features

Requested scope: build the four remaining features, with an independent commit after each. All work stays on `feature/training-continuity`; no merge or push is included.

1. **Exercise picker**: replace the add dropdown with searchable static previews, body/muscle/advanced filters, favourites, same-movement replacement alternatives and explicit broader browsing. Reuse catalogue/library filtering. Equipment, rehab collection and duplicate constraints remain hard limits. Guide visits preserve the chooser state; selection/cancel returns focus to the edited row or add action.
2. **Flexible equipment**: explicit adjustable settings and physical implement count, plus an isolated per-workout equipment snapshot. Preserve existing fixed weights, home inventory, saved routines and old backups. Never combine unequal implements or increase loads silently.
3. **Front-view demonstrations**: extend the established SVG system to the seven candidates in the animation handoff (E06/E24/E25/E28/E47/E18/E42), preserving contacts, working-side semantics and reduced motion. Add geometry and browser evidence; do not invent new doses or claim clinical validation.
4. **Readable physiotherapist summary**: a local, print-friendly report for a chosen date range/programme, showing actual exercises/doses/sides/equipment, symptoms and missing answers. Share/print is an explicit user action; no diagnosis, causal interpretation or automatic sending.

Each feature is checked before its own commit: types/lint, relevant logic/database/component tests, production build and mobile browser checks. New rules retain 100% branch coverage. UI review uses real 320/360/412 px light/dark captures; final regression checks cover the combined result.

## Progress

- Exercise picker: complete. Types/lint, production build, 20 component tests and 17 browser scenarios passed, including 320/360/412 px light/dark checks. Visual review and interface detection passed.
- Flexible equipment: complete. Explicit adjustable settings, physical counts and per-workout snapshots preserve home settings and old backups. All 1,389 tests passed with 100% rules branch coverage; types/lint, production build and nine browser scenarios passed. Mobile light/dark captures and interface detection reviewed.
- Front views: pending.
- Physiotherapist report: pending.
