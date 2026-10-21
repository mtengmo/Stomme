# Plan: faster testing and selectable colour themes

Status: proposed, 2026-10-21 (architect plan, not yet approved by the owner). Planning only.

## Summary and recommended order

Do Part 1 (testing) first, about 3 days. Part 2 (themes) multiplies the test matrix, so the cheaper test tiers should exist before themes land. The Part 2 direction round (T11) needs only the owner and Opus, so it can run in parallel with Part 1. Part 2 takes about 7-8 days.

Order: T1 measure; T2 close the coverage gap; T3-T4 faster vitest and inner loop; T5-T7 faster Playwright; T8-T10 CI and hooks; T11 theme direction round (parallel); T12-T14 theme plumbing with no visual change; T15 picker; T16-T17 themes and the theme test gate; T18-T19 review and docs.

Findings in the code that the plan relies on:

- The 100% branch rule on `src/rules` is not enforced: `vitest.config.ts` has no coverage block and CI runs plain `vitest run`.
- CI queues runs: the concurrency group `pages` (`cancel-in-progress: false`) applies to the whole workflow, so every PR run waits behind every other run and behind deploys.
- Every e2e test installs the service worker (`serviceWorkers: 'allow'` globally), so each test downloads the full precache.
- An inline boot script would be blocked in production: the CSP is `default-src 'self'` with no inline scripts, so a theme boot script must be an external file.
- The backup schema rejects unknown meta keys (`metaSchema` in `src/db/backup.ts` is a strict discriminated union). Putting the theme in backed-up meta would make older app versions reject newer backups.
- Figures and the muscle map already use tokens only (`var(--...)`); no hex values in `src/` outside `index.css`. One leak: `tests/e2e/figure-colours.spec.ts` hard-codes the `--equipment` hex values.
- 18 of the 58 vitest files are jsdom; 40 run in node, and `src/rules`, `src/content` and most of `src/figures` are pure.

Measured baseline (merged main, Windows, local): check 6 s; vitest 58 files / 754 tests 45 s; build 9 s; Playwright e2e 55 tests 86 s. Plus `test:upgrade` and `audit:a11y` (90 screen audits).

## Part 1: reduce testing time

### T1 Measure first
Take 3 runs of each, keep the median (PowerShell `Measure-Command`). Vitest: `npx vitest run --reporter=default --reporter=json --outputFile=test-results/vitest.json`, record phase breakdown and the 10 slowest files and tests. Playwright: `--reporter=list,json` with `PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/pw.json`, record worker count and the 10 slowest tests; re-run once with `serviceWorkers: 'block'` to size that saving. CI: per-step durations and queue time from the last 10 Actions runs. Output: baseline table in `docs/test-timings.md`; every later task reports its delta.

### T3 Vitest projects
Split the config into three `test.projects`:

| Project | Files | Environment | Pool / isolate |
|---|---|---|---|
| `unit` | `src/rules`, `src/content`, `src/charts`, `src/figures/*.test.ts`, pure `src/lib`, `src/features/**/*.test.ts`, `src/ui/*.test.ts` | node | threads, `isolate: false` |
| `db` | `src/db/**/*.test.ts`, `src/lib/storage.test.ts`, `src/lib/share.test.ts` (use the `getDb()` singleton, fake-indexeddb or `stubGlobal`) | node | threads, `isolate: true` |
| `dom` | every `*.test.tsx` with the jsdom docblock | jsdom | forks, `isolate: true`, `maxWorkers: 4` |

Gate for `isolate: false`: the `unit` project passes 5 consecutive `--sequence.shuffle` runs; any file that fails moves to `db`. Expected: 45 s down to about 22-28 s. Every file still runs.

### T2 Coverage gate
Add `coverage: { provider: 'v8', include: ['src/rules/**'], thresholds: { 'src/rules/**': { branches: 100 } } }`, a `test:cov` script, and run it in CI and pre-push. If coverage is below 100% today, fix the tests first. Non-negotiable.

### T4 Inner loop under 15 s
`test:watch` = `vitest --project unit --project db`; `test:changed` = `vitest run --changed`; `test:related`; `check:fast` = `biome check --changed && tsc --noEmit`. Contrast becomes a vitest test (T13).

### T5-T7 Playwright
- `fullyParallel: true`; `workers` '75%' locally, 2 per CI shard.
- Service worker blocked by default; `pwa.spec.ts` and the offline test opt in with `test.use({ serviceWorkers: 'allow' })`.
- Shared onboarded state (T6): a `globalSetup` clicks "Jag förstår" once and saves `storageState({ indexedDB: true })` to `test-results/.auth/onboarded.json` (regenerated every run, never committed). Specs testing onboarding or training setup keep fresh state.
- Tags: `@smoke` on the Pass A full flow, the offline test, all of `pain.spec.ts` (pain gate), `pwa.spec.ts`, the settings import/delete tests, the main `training.spec.ts` flow (about 12-15 tests). `e2e:smoke` = `--grep @smoke`.
- `scripts/ensure-build.ts` (T7): rebuild only when the newest mtime in `src/`, `public/`, `index.html`, `vite.config.ts` or `package-lock.json` is newer than `dist/index.html`. CI always builds.
- Expected: local full e2e 86 s down to about 40-50 s; smoke about 15 s.

### T8-T9 CI
- Workflow-level concurrency `group: ci-${{ github.ref }}`, `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`; the `pages` group moves to the deploy job only.
- Jobs: `verify` (biome ci, tsc, `vitest run --coverage`); `build` (vite build, uploads `dist`); `e2e` (needs build, `matrix.shard: [1, 2]`, Playwright browsers cached keyed on the lockfile version); `deploy` (needs verify, build, e2e; main only).
- PR wall time rises slightly (about 3-4 min) because e2e is added; queue time goes to zero.
- `quality.yml`: nightly, `workflow_dispatch`, and on PRs touching `src/styles/**`, `src/ui/**`, `index.html`, `vite.config.ts` or `scripts/a11y-audit.ts`. Runs `audit:a11y` (light and dark in parallel), `test:upgrade`, theme e2e, theme screenshots as an artifact.

### T10 Pre-push hook
Lefthook via `prepare`: check and `test:cov` in parallel, then `e2e:smoke`, target <= 60 s. Bypass `git push --no-verify` or `LEFTHOOK=0`. Document the tiers in CONTRIBUTING.md: inner loop (watch/changed), pre-push (verify + smoke), CI (everything except quality), nightly (quality).

## Part 2: selectable, more colourful themes

### Tokens (T12)
Semantic tokens per theme and scheme: `--paper`, `--surface`, `--surface-tint`, `--line`, `--ink`, `--ink-soft`, `--edge`, `--action`, `--action-ink`, `--done` (replaces `--red`; the only completion colour), `--accent` (replaces `--blue`: working side, links, selection, muscle map), `--focus`, `--info`, `--today`, `--today-ink`, `--upcoming`, `--upcoming-ink`, `--care`, `--care-ink`, `--equipment`. Tailwind `@theme inline` exposes them. Step 1 adds new names and keeps `--red`, `--blue`, `--amber` as aliases with Rutat unchanged (screenshots pixel-identical); step 2 is a mechanical rename (about 48 uses in 22 files), then aliases are removed. Files: `src/styles/themes/<id>.css` (each with `:root[data-theme=id]` and `...[data-scheme=dark]`) and `src/styles/themes/registry.ts` (id, Swedish name, colour strategy, done-colour statement). `:root` keeps Rutat light as the fallback.

### Light/dark and persistence (T14)
- `localStorage['stomme.appearance'] = {theme, scheme: 'system'|'light'|'dark'}`, read synchronously (no flash).
- `public/theme-boot.js`, a blocking classic `<script src>` in `<head>` (allowed by CSP): sets `data-theme` and the resolved `data-scheme`; listens to `matchMedia` under "Följ telefonen"; unknown id falls back to `rutat`.
- Not in IndexedDB or the backup (device preference; avoids the strict backup-schema break). "Radera all data" also clears it.
- Replace the two media-scoped `theme-color` metas with one; `applyThemeColor()` sets it from the computed `--paper`. Update `pwa.spec.ts`.
- The manifest `theme_color` stays Rutat (static manifest; CSP `manifest-src 'self'` blocks blob manifests). Known limitation: splash screen colour.

### Themes to ship first (T16)
1. **Rutat** (default, Restrained): current values, red pencil as the done colour.
2. **Hav** (Committed): blue-green tinted surfaces, deep teal action, coral-red done colour.
3. **Kvällssol** (Full palette): apricot paper, plum action, a warm today colour, deep green done colour.
4. **Hög kontrast** (Restrained): near-black on white, no grid, 7:1 text, yellow focus, blue done colour.

Four themes x 2 schemes = 8 palettes (audits in under 1 s). Drenched is rejected: set and rest screens are read at arm's length. A fifth theme (Skog) only after the picker is proven. Colour comes from tinted surfaces, coloured primary actions, filled today/done chips (always icon plus word) and the nav active indicator; not from gradient text, glass, coloured side-stripes, offset shadows, identical card grids or kickers.

### Rules re-decided (to be recorded in DESIGN.md)
- "Red Means Done" becomes "One Done Colour Rule": each theme declares one `--done`, used for nothing else; the pencil-tick shape is constant across themes.
- "Paper Is The Surface": surfaces may use `--surface-tint`, still no shadows.
- Care screens (pain, stop, warn): warning icon, a bold Swedish word ("Avbryt", "Stopp"), heavy outline and `--care`; `--care` must reach 4.5:1 on paper and surface and be perceptually distinct from `--done` and `--accent` (deltaE2000 >= 20, checked by script).

### Contrast across all themes (T13)
Move the logic to `src/styles/contrast.ts` (pure); `scripts/contrast.ts` wraps it and `src/styles/themes.test.ts` runs it in `npm test`. For every theme and scheme: all required tokens present; text pairs 4.5:1 (action-ink on action, done/accent/care on paper and surface, today-ink on today); UI pairs 3:1 (edge, focus against paper and action, equipment, muscle accent); deltaE distinctness for done/care/accent and accent/ink/equipment. `figure-colours.spec.ts` reads the expected `--equipment` from the registry.

### Picker (T15)
Settings section "Utseende": a vertical radio list "Färgtema" (not a card grid), rows >= 56 px with name plus a live swatch strip (paper, action, a done tick with "Klar", today with "Idag"); applies immediately. Scheme radio group "Ljust / Mörkt / Följ telefonen" (default Följ telefonen). Onboarding: a collapsed `<details>` "Välj färger (kan ändras senare)" with the same list; the single primary action is unchanged.

### Test matrix (T17)
Numeric contrast for every theme on every run; structural `a11y-audit` (90 screens) on Rutat light/dark only; `themes.spec.ts` (`@themes`) parametrised over the registry loading week, set and stop screens (asserts `data-theme`, theme-color equals `--paper`, primary button and done chip compute to their tokens; about 2 s per combination, sharded in CI); `shots:themes` 6 screens (week, set, rest, pain, stop, muscle map) at 360 px x themes x 2 schemes, nightly or on demand.

### Impeccable workflow
1. Direction round (T11): `/impeccable shape` as a concept-seed round: 2-3 palette seeds per theme on week, set and stop at 360 light and dark, plus a decision page for the owner.
2. Code-led build (T12-T16): tokens first, then each theme in its own PR.
3. Finish review (T18): `impeccable-finish-reviewer` on each theme's screenshots.
4. Documentation (T19): documenter updates DESIGN.md (one section per theme: strategy, done colour, care treatment) and `colorMeta` in `.impeccable/design.json`.

### Adding a theme later (goes into CONTRIBUTING.md)
Add `src/styles/themes/<id>.css` with both scheme blocks; register it in `registry.ts`; add its DESIGN.md section. Gate: `npm test` (completeness, contrast, deltaE) passes; `e2e --grep @themes` passes; 360 px light and dark shots of the 6 screens attached; maintainer approval through CODEOWNERS on `src/styles/themes/`.

## Task breakdown

| # | Task (effort) | Model | Acceptance |
|---|---|---|---|
| T1 | Baseline timings (0.5 d) | Haiku | `docs/test-timings.md` has medians and the 10 slowest vitest and Playwright items |
| T2 | Rules coverage gate (0.5 d) | Sonnet | `test:cov` fails below 100% branches in `src/rules`; passes on main |
| T3 | Vitest projects (0.5 d) | Sonnet | Same 754 tests pass; 5 shuffled `unit` runs green; full run <= 28 s |
| T4 | Inner-loop scripts and docs (0.25 d) | Haiku | `test:watch` rerun after one edit <= 5 s; CONTRIBUTING lists the tiers |
| T5 | Playwright config and tags (0.5 d) | Sonnet | Same tests pass; SW tests opt in; `e2e:smoke` <= 20 s |
| T6 | storageState fixture (0.5 d) | Sonnet | Full e2e local <= 50 s; no flakes in 3 consecutive runs |
| T7 | ensure-build (0.25 d) | Haiku | No rebuild when unchanged; rebuilds after touching any `src` file |
| T8 | CI restructure (0.5 d) | Sonnet, reviewed by Opus | PR runs verify, build and 2 e2e shards; no `pages` queueing; deploy needs all |
| T9 | quality.yml (0.25 d) | Sonnet | Nightly runs a11y, upgrade and theme shots; path-filtered on PRs |
| T10 | Lefthook pre-push (0.25 d) | Haiku | Push runs verify plus smoke in <= 60 s; bypass documented |
| T11 | Direction round (1 d) | Opus and owner | Decision page approved; palettes recorded |
| T12 | Semantic tokens and rename (1 d) | Sonnet; rename by Haiku | Rutat screenshots pixel-identical; no `--red`/`--blue` left |
| T13 | Contrast engine and themes test (0.5 d) | Sonnet | Every theme and scheme checked in `npm test`; a missing token fails |
| T14 | Boot, persistence, theme-color (0.75 d) | Sonnet | No flash with CSP in preview; meta follows the theme; wipe clears it; backup unchanged |
| T15 | Picker in Settings and onboarding (1 d) | Sonnet | Radio semantics, rows >= 48 px, keyboard operable, live apply, a11y audit clean |
| T16 | Three new themes (1.5 d) | Sonnet; Opus for care/done decisions | Contrast and deltaE pass in light and dark; care screens identifiable in greyscale |
| T17 | @themes e2e and shots:themes (0.5 d) | Sonnet | Runs for every registry entry; screenshots produced |
| T18 | Finish review and high-risk review (0.5 d) | impeccable-finish-reviewer and Opus reviewer | No craft-floor violations; pain/stop salience confirmed |
| T19 | DESIGN.md, design.json, CONTRIBUTING (0.5 d) | Haiku/Sonnet documenter | Rules re-recorded per theme; "add a theme" guide present |

## Risks

- `isolate: false` order leaks (Dexie singleton, `stubGlobal`, fake timers): pure files only, plus the shuffle gate.
- The coverage gate may show rules coverage already below 100%: T2 fixes the tests before enforcing.
- `fullyParallel` may expose hidden test coupling: 3 green runs locally and in CI before merging.
- Blocking the service worker could hide SW regressions: PWA and offline tests opt in; `test:upgrade` runs nightly and on PRs touching `vite.config.ts`.
- Stale-dist check could miss a change: CI always builds.
- Playwright cache drift on Dependabot bumps: cache key from the lockfile.
- CSP blocks inline scripts: external boot file, verified against `vite preview` with CSP active.
- Colourful themes could weaken pain/stop salience: `--care` token, icon plus word, deltaE check, greyscale review, Opus review.
- Matrix growth: numeric checks for all themes, structural audit on the default only, sampled screenshots, cap of 5 themes until reviewed.
- The installed-app splash screen always uses Rutat colours (documented limitation).

## Owner questions with defaults

1. First theme set? Default: Rutat (default), Hav, Kvällssol, Hög kontrast.
2. Done colour policy: red pencil in every theme, or one done colour per theme? Default: one done colour per theme with the same pencil-tick shape; Rutat stays red.
3. Theme included in backups? Default: no; device-local in localStorage, cleared by "Radera all data".
4. First-run suggestion: a collapsed "Välj färger" in onboarding, or nothing? Default: the collapsed details in onboarding.
5. Install the pre-push hook automatically for all contributors? Default: yes, Lefthook through `prepare`, `--no-verify` documented.
