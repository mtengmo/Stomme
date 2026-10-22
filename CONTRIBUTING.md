# Contributing to Stomme

Thanks for wanting to help. Stomme is a small offline-first strength-training app (PWA) whose UI is in Swedish. Please read this first: it is short.

## Important: this is not a medical app

Stomme gives no medical advice. Its pain and progression rules are deliberately conservative. Please do not add treatment claims, diagnoses or "this will heal your knee" wording. Anything touching these areas gets extra review from the maintainer:

- `src/rules/` (pain and progression logic)
- `src/content/` (exercise text, copy, programmes)
- pain screens, onboarding and settings text

If you suggest a new exercise, include a reliable source (physiotherapy guideline or clinical paper) and say whether it loads the knee.

## Branches

```
feature/your-change ──PR──▶ dev ──release PR──▶ main
                             │                    │
                       dev site (Cloudflare)   live site (GitHub Pages)
```

- `main` is what runs at https://stomme.tengmo.com. Only the maintainer merges into it, through a release pull request from `dev`.
- `dev` is the integration branch. It has its own site on Cloudflare Pages with its own data storage, so trying things there never touches real training logs.
- Your work goes on a branch from `dev` (for example `feature/seated-calf-raise` or `fix/rest-timer`) and you open a pull request **into `dev`**.
- Every pull request gets its own preview link from Cloudflare. Use it to try the change on a phone.

First time with GitHub? The short version:
1. Click **Fork** on the repository page (you work on your own copy).
2. `git clone` your fork, then `git checkout -b feature/my-change origin/dev` after adding the main repo as `upstream`.
3. Commit, push to your fork, then click **Compare & pull request** and choose `dev` as the base branch.

## Running it locally

Requires Node 24 and npm.

```
npm ci
npm run dev        # development server
npm run check      # lint, format and type check
npm test           # unit tests
npm run e2e        # browser tests (rebuilds only if the sources changed)
```

Run `npm run check`, `npm test` and `npm run build` before you push. CI runs the same and a pull request cannot be merged while it fails.

## Test tiers

Use the cheapest tier that answers your question; the slower tiers run for you before a push and in CI.

| Tier | When | Commands | Time (typical) |
|---|---|---|---|
| Inner loop | While editing | `npm run test:watch` (unit and db tests, reruns affected files), `npm run test:related -- src/rules/stats.ts`, `npm run test:changed`, `npm run check:fast` (lint and types for changed files) | seconds |
| Pre-push | `git push` | Lefthook runs `npm run check` and `npm run test:cov` in parallel, then `npm run e2e:smoke` (12 tests tagged `@smoke`, including every pain test) | 1-2 minutes |
| CI | Every pull request and push | `npm run check`, `npm test`, `npm run build`; browser tests (`npm run e2e:ci`, always builds first) join CI with the planned CI restructure | minutes |
| Nightly | Scheduled, not yet set up | Accessibility audit (`npm run audit:a11y`), `npm run test:upgrade`, theme screenshots | n/a |

Details:

- `npm test` runs three vitest projects: `unit` (pure code, shared workers), `db` (IndexedDB singleton) and `dom` (jsdom components). `npm run test:cov` runs all of them with coverage and fails below 100% branch coverage in `src/rules/`. Run one project with `npx vitest run --project unit`. Keep tests in `unit` free of module-level state, because they share workers; a test that stubs globals or uses the database belongs in `db`.
- `npm run e2e` runs the full browser suite in parallel with the service worker blocked and onboarding already accepted (saved once per run to `test-results/.auth/`, never committed). A spec that tests onboarding or training setup starts from empty state with `test.use({ storageState: FRESH_STATE })`; a spec that needs the service worker (offline, PWA) sets `test.use({ serviceWorkers: 'allow' })`. Tag a test `@smoke` (`test('...', { tag: '@smoke' }, ...)`) only if it protects the main flow or a safety rule.
- Fake clocks in browser tests: after the page has loaded, use `freezeClock(page)` from `tests/e2e/flow.ts`, not `page.clock.install()`, so countdowns only move when the test advances them.
- Hook setup: `npm ci` installs the Lefthook pre-push hook automatically when you work in a git checkout (never in CI). To skip it once use `git push --no-verify` or `LEFTHOOK=0 git push`; to remove it run `npx lefthook uninstall`. CI still runs everything, so a skipped hook only moves the failure to the pull request.

## Style

- UI text is Swedish. Code, identifiers and comments are English.
- Follow the visual system in [DESIGN.md](DESIGN.md): red is reserved for "done", colour is never the only signal, touch targets are at least 48 px, text at least 16 px, and light and dark themes both work. Attach 360 px screenshots (light and dark) to UI pull requests.
- Keep pull requests small and focused. One idea per PR.
- Add or update tests for logic changes. The rules in `src/rules/` keep 100% branch coverage.
- Do not commit personal data: no exported backups, real training logs or private screenshots.

## Licensing of contributions

Stomme is licensed under AGPL-3.0-or-later. By opening a pull request you agree that your contribution is licensed under the same terms, and that you have the right to contribute it (it is your own work, or its source allows this). Do not copy text, images or code from sources whose terms are incompatible, and always cite the source for exercise content.

## Reviews

The maintainer reviews all pull requests. Safety-relevant changes may take longer and may be sent to a physiotherapist for a look before merging.

## Reporting problems

Use the issue templates. For security problems use the private report link on the Issues tab, not a public issue.
