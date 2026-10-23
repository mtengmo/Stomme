# Test timings

Measured on the developer machine (Windows 11, 16 logical cores, Node 22 shell / PowerShell), 3 runs each, median reported. Each task below appends its delta.

## T1 Baseline (branch faster-tests, before any change)

| Suite | Runs (s) | Median (s) |
|---|---|---|
| `npm run check` | 5.1, 2.3, 2.4 | 2.4 |
| `vitest run` (58 files, 754 tests) | 33.6, 27.7, 29.9 | 29.9 |
| `npm run build` | 12.1, 7.7, 7.3 | 7.7 |
| `playwright test` (55 tests, 8 workers by default) | 64.5 (cold), 40.4, 39.6 | 40.4 |
| `npm run test:upgrade` (1 run) | 35.2 | 35.2 |

Notes:
- The plan's numbers (vitest 45 s, e2e 86 s) were from a slower moment; on this machine the baseline is lower. Playwright already uses 8 workers (half the cores), files in parallel, tests inside a file serial.
- Vitest phase split (reported by vitest): environment ~41%, tests ~40%, import ~10%, setup ~7%. 58 workers spawned, about 0.9 s startup each; vitest itself estimates 12 s saved with `isolate: false`.
- e2e with `serviceWorkers: 'block'` (single run, untuned, machine busy with test:upgrade just before): 106 s and 3 failures (`pwa.spec.ts`, `smoke.spec.ts` offline test, `review.spec.ts` mobile dark). The first two need the SW by design (opt-in in T5); the review failure is checked in T5. Not usable as a timing figure; re-measured in T5.
- CI step durations and queue time from Actions history were not collected (no GitHub access in this environment).

### 10 slowest vitest files

| ms | File |
|---|---|
| 5877 | src/features/pain/pain.test.tsx |
| 4182 | src/features/library/ExerciseLibrary.test.tsx |
| 3589 | src/features/session/failures.test.tsx |
| 3500 | src/features/session/session.test.tsx |
| 2985 | src/features/settings/settings.test.tsx |
| 2789 | src/features/history/History.test.tsx |
| 2681 | src/features/exercise/exercise.test.tsx |
| 2277 | src/features/training/quickStart.test.tsx |
| 1081 | src/App.test.tsx |
| 1066 | src/features/training/symptomFields.test.tsx |

### 10 slowest vitest tests

| ms | Test |
|---|---|
| 2174 | session flow previews the pass, starts it, logs a set, undoes it and rests |
| 2038 | exercise library shows all exercises, equipment, template links... |
| 1745 | pain picker has eleven radios, anchors, three flags and cannot be saved empty |
| 1680 | asks only about focus first and persists only explicitly selected equipment... |
| 1621 | inline workout technique keeps the edited amount while technique opens and closes |
| 1468 | exercise library preserves the selected filter through a detail visit and browse |
| 899 | write failures Starta pass shows an error and can be tried again |
| 891 | session flow resumes where the logs left off and shows "Fortsätt passet" |
| 830 | robustness bad backup meta does not break the week view or settings |
| 825 | onboarding gating shows the disclaimer first and stores acceptance |

### 10 slowest Playwright tests (8 workers)

| ms | Test |
|---|---|
| 8555 | exercise-development: new catalogue animations render without overflow |
| 6851 | library-workouts: browse previews and reuse a custom workout (1280) |
| 6688 | training: knee rehab saves a reusable AAOS selection and connects actual sets to history |
| 5987 | smoke: Pass A can be completed with only the primary action on each screen |
| 5571 | library-workouts: browse previews and reuse a custom workout (360) |
| 5560 | kettlebells: single-kettlebell options ... (360) |
| 5096 | kettlebells: single-kettlebell options ... (1280) |
| 4747 | training: training setup keeps readiness, symptoms, effort, and after check-in separate |
| 4417 | training: running direction uses body-wide check-ins and keeps effort separate from symptoms |
| 4382 | guide: timer, movement and completion fit together (360) |

## T2 Coverage gate

`npm run test:cov` = `vitest run --coverage`, threshold 100% branches on `src/rules/**` (v8). Before: 94.26% (26 uncovered branches in 10 files). After: 100%; +15 tests (754 -> 769), two new test files (`prescription.test.ts`, `programRosters.test.ts`). One branch was unreachable by type (`SessionStatus` has three values) and was simplified to an `else` in `progressOverview.ts`; no ignore comments.

Cost: a coverage run is 31-53 s versus 30 s plain (instrumentation). The default 5 s test timeout flaked under coverage (ExerciseLibrary test), so `testTimeout` is now 15 s.

## T3 Vitest projects

`unit` (30 files, 516 tests, threads, `isolate: false`), `db` (13 files, threads, isolated), `dom` (17 files, forks, isolated). Worker cap is global (`maxWorkers: 6`): vitest refuses different `maxWorkers` per project unless the projects run in sequential groups, which would lose the overlap. All 60 files and 769 tests run.

| Measure | Before (median) | After |
|---|---|---|
| `vitest run`, 3 runs | 29.9 s | 25.1, 26.4, 32.0 s, median 26.4 s |
| `test:cov` | 31-53 s | 21.9 s |
| `--project unit` | n/a | 1.1-1.3 s |
| `--project db` | n/a | 4.4 s |
| `--project dom` | n/a | 13-16 s (24 s once under load) |

`isolate: false` gate: 5 consecutive `vitest run --project unit --sequence.shuffle` runs passed (516/516 each, seeds 1792627239235, ...42425, ...45376, ...48230, ...51879); no file had to move to `db`.

The `dom` project is now the long pole (jsdom environment startup is about 40% of its time). Trying `isolate: false` there only broke `src/lib/update.test.tsx` (7 tests) and saved about 4 s, so it was not adopted (plan keeps `dom` isolated).

## T4 Inner-loop scripts

`test:watch` (unit + db projects, about 5 s for a cold full pass, then only affected files re-run), `test:changed`, `test:related` (e.g. `npm run test:related -- src/rules/stats.ts`: 9 files, 9.4 s because related dom tests are included), `check:fast` (biome on files changed against `main`, then tsc; `vcs.defaultBranch` set to main in `biome.json`). `test:changed` after a config edit runs everything (17.6 s), which is vitest's rule for config changes. The watch rerun time was not measured interactively.

## T5 Playwright config and tags

`fullyParallel: true`, `workers: '75%'` locally (12 of 16 here; 2 in CI), `serviceWorkers: 'block'` by default; opt-in (`serviceWorkers: 'allow'`) for `pwa.spec.ts`, the offline smoke test and the narrow-viewport review test (it reloads offline). 12 tests tagged `@smoke` (Pass A flow, offline, skip, inline technique, 3 pain, pwa, export, import, delete, main training flow); `npm run e2e:smoke`.

| Measure | Before | After |
|---|---|---|
| full e2e, 55 tests | 40.4 s median (64.5 cold, 40.4, 39.6) | 39.4 s median (87.4 cold, 39.4, 39.0) |
| `@smoke` (12 tests) | n/a | 17.5 s and 24.2 s (26 s with the build check) |

Findings:
- On this 16-core machine the baseline was already 8 workers with parallel files; going to 12 workers with `fullyParallel` and blocking the service worker saved about 1 s. The suite is limited by its few long tests (6-8 s each) and CPU, not by worker count. The plan's 86 s -> 40-50 s gain was therefore already in the baseline here; the real wins are expected on slower machines and CI (2 workers per shard, no precache download per test).
- The first run after a build is consistently slow (64 s and 87 s versus 38-40 s warm); cold file cache for `dist` and the Playwright browser.
- Smoke is above the 20 s plan target (17.5-24 s) because the 12 tests include the 8 s Pass A flow and the 8 s training test; they run in parallel but compete for CPU.

Flake found and fixed (cause, not retry): in the cold run 1, `guide.spec.ts` "timer, movement and completion fit together (360)" failed on `toHaveText('0:05')`. `page.clock.install()` lets the fake clock keep running in real time, so a stalled machine let the countdown run past the asserted value. Reproduced deterministically by adding a 1.5 s wait after the start click (received 0:19 instead of 0:05). Fix: `freezeClock()` in `tests/e2e/flow.ts` (install, then `pauseAt`), used in the guide spec and in `playPassA`, so the clock only moves via `fastForward`. The kettlebell, knee-extension and exercise-development specs install the clock before `goto`; pausing there stalls lazy chunk loading (5 failures), so they keep the plain install (they assert animation state, not exact countdown text).

## T6 Shared onboarded storage state

`tests/e2e/global-setup.ts` accepts the disclaimer once and saves `test-results/.auth/onboarded.json` (`storageState({ indexedDB: true })`, regenerated every run, inside the gitignored `test-results/`). It is the default `use.storageState`. Specs that test onboarding or training setup keep fresh state through `test.use({ storageState: FRESH_STATE })` (`tests/e2e/state.ts`): smoke, training, training-preparation, exercise-development, kettlebells, library-workouts (all of them click through "Bli starkare"/setup somewhere). Converted to the shared state: figure-colours, guide, knee-extension, muscles, pain, rack-grip, review, settings. `openPreview(page, true)` and the converted specs also skip the redundant `goto('/')` before the deep link, one page load fewer per test.

Results (machine shared with other jobs, so wall times swing from 38 s to 90 s between identical runs):

| Measure | Before T6 (T5) | After T6 |
|---|---|---|
| full e2e wall, quiet runs | 37.1, 39.4, 39.0 s | 39.8, 40.3, 42.4, 43.7, 44.2 s |
| full e2e wall, loaded runs | 87 s | 58-91 s |
| sum of test durations (one A/B pair) | 487 s | 255 s |

Wall time did not improve on this machine: with 12 workers on 16 cores the suite is bounded by its longest tests and CPU, and the saving per test (one onboarding click, one page load) is small next to those. The sum of test durations in the A/B pair roughly halved, so the gain should show on slower or CI hardware with 2 workers.

Flake findings (3 consecutive green runs achieved after the fixes: 55/55, 55/55, 55/55; two further green runs before):
- Failures only appeared in the first run after a pause or under external load (runs of 58-91 s) and were always a 5 s `expect` timeout while a lazily loaded route rendered (`Pass A` heading, technique list, a saved workout link) or a `browser.newContext: Test ended` after a timeout. They did not reproduce in 45 repeated runs of the same test at 16 workers, nor in isolation. Cause: default 5 s expect timeout versus worker over-subscription. Fix: `expect.timeout` 10 s in the config (assertions unchanged) and fewer page loads per test.
- With 18 workers and `--repeat-each=2` (a deliberate 2x over-subscription) 1 of 110 tests failed per run with the same signature (`library-workouts` 360 saved-workout link, `guide` 200% text `Pass A` heading); not reproduced at normal worker counts.

## T7 ensure-build

`scripts/ensure-build.ts` (`npm run ensure-build`) compares the newest mtime in `src/` (test files and `src/test/` ignored), `public/`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json` and `pwa-assets.config.ts` with `dist/index.html`. `e2e` and `e2e:smoke` use it; `e2e:ci` always runs `npm run build`. Verified: missing dist builds; unchanged sources print "up to date" in about 1 s instead of an 8 s build; touching `src/App.tsx` rebuilds; touching a `*.test.tsx` does not. Saving: about 8 s on every local e2e run with no source change.

## T10 Lefthook pre-push

`lefthook.yml`: group of `check` and `test:cov` in parallel, then `e2e:smoke`. Installed by `npm run prepare` (`scripts/prepare-hooks.mjs`, plain Node): does nothing when `CI` is set, `LEFTHOOK=0`, there is no `.git`, or lefthook is not installed (`--omit=dev`), and never fails the install. Verified in a scratch git repo: CI=1 installs nothing; normal installs `pre-push`; no `.git` exits 0. Bypass: `git push --no-verify` or `LEFTHOOK=0 git push`. The hook was not installed in this worktree (a worktree shares `.git/hooks` with the main repository); it was run with `npx lefthook run pre-push`.

Measured (`lefthook run pre-push`, machine under external load): 100 s total = check 2.6 s and test:cov 67 s in parallel (70 s), then e2e:smoke 33 s. On a quiet machine the parts are about 3 s, 22-31 s and 18-24 s, so about 50-60 s; the plan's 60 s target is met only when the machine is idle. The coverage run is the long part (it runs all 769 tests, because the 100% rule coverage is partly exercised by dom tests).

## Summary of end state (quiet-machine medians)

| Suite | Baseline | Now |
|---|---|---|
| `npm test` | 29.9 s | 18.6 s on a quiet machine (25-27 s when loaded) |
| `npm run test:cov` | 31-53 s (and failing the gate) | 22-31 s, gate passes |
| unit + db only (`test:watch` cold) | n/a | about 5 s |
| `npm run e2e` | 40.4 s + 8 s build | 38-44 s, build skipped when unchanged |
| `npm run e2e:smoke` | n/a | 18-24 s |

## T8 CI restructure (deploy.yml) and T9 quality.yml

Jobs: `verify` (npm run check, test:cov), `build` (full-history checkout, `vite build`, uploads artifact `dist`, plus the Pages artifact on main), `e2e` (needs build, matrix shard 1/2, downloads `dist`, `npm run e2e:prebuilt -- --shard=N/2`), `deploy` (main only, needs verify, build and e2e, `pages` concurrency group on this job only). Workflow concurrency `ci-${{ github.ref }}`, cancelling only for pull requests. `permissions: contents: read` at workflow level; `pages: write` and `id-token: write` only on `deploy`; no secrets. New script `e2e:prebuilt` = `playwright test` (no build). `quality.yml`: nightly 03:17 UTC, manual, and PRs touching `src/styles/**`, `src/ui/**`, `index.html`, `vite.config.ts`, `scripts/a11y-audit.ts`; jobs `a11y` (one run, the script covers light and dark and has no scheme argument) and `upgrade` (uploads `test-results/pwa-upgrade`); theme e2e/shots are a TODO comment.

Local simulation of each job's commands with `CI=1` (this machine, lightly loaded): npm ci 107 s (cold, includes deleting node_modules), check 6.6 s, test:cov 24.7 s (769 tests), vite build 5.1 s, e2e shard 1/2 46.9 s (28 tests, 2 workers), shard 2/2 53.6 s (27 tests, 2 workers). YAML checked with `@action-validator/cli` (deploy.yml clean, quality.yml only the warning that `paths` globs are not validated) and yaml-lint. actionlint was not available through npx.

Expected PR wall time on GitHub runners (2 vCPU, estimated, not measured): verify about 2 min (install 40 s plus 1 min of checks and tests), build about 1 min, then e2e shards in parallel about 4-5 min each including browser cache restore. Wall time is roughly build + slowest shard = 5-7 min, versus about 3 min before (no e2e in CI). Queue time drops to zero for PRs (own concurrency group, older PR runs cancelled). Main deploy is gated by the same path plus the deploy step.

Risks and unverified points:
- Required status checks: if branch protection requires the old job `build`, add `verify` and `e2e (1)`, `e2e (2)` (matrix names) as required; `build` still exists but no longer runs checks or tests.
- `actions/upload-artifact@v4`, `download-artifact@v4` and `cache@v4` are used because they are known to exist; the file pins other actions at newer majors (checkout v7, upload-pages-artifact v5). Dependabot will propose bumps; confirm on the first run that these resolve.
- `vite.config.ts` computes the version from git history even for `vite preview`, so the e2e (and quality) jobs also use `fetch-depth: 0`; a shallow clone would throw under CI. The CI shallow-clone failure was not simulated.
- The `dist` artifact is built from the same commit, so the e2e job tests exactly what deploys; the Pages artifact is uploaded separately from the same `dist`.
- Linux Chromium timing differs from Windows; the 2-worker shards could expose slower tests, and the 10 s expect timeout is the only headroom. First runs may flake: watch them and read the uploaded `e2e-results-N` traces.
- Browser cache key is `playwright-<os>-<@playwright/test version from the lockfile>`; `install-deps` runs on a hit, a full `install --with-deps` on a miss. Cache hits cannot be verified without GitHub.
- Not verifiable locally: that `deploy` is skipped on pull requests (it is guarded by `github.ref == 'refs/heads/main'`, and PR refs are `refs/pull/N/merge`), the `pages` environment behaviour, and the schedule trigger.

## Review follow-ups (CI hardening)

- Job timeouts: verify 15, build 10, e2e shard 20, e2e-result 5, deploy 10, a11y 20, upgrade 30 minutes; Playwright `globalTimeout` 15 min in CI.
- Playwright in CI: `retries: 1`, `trace: on-first-retry` (so the uploaded `e2e-results-N` artifact holds real traces), reporters `list` plus `github` (a test that passes only on retry is annotated as flaky and must be investigated, not ignored; the pain and safety tests get no exemption), `forbidOnly`, `reuseExistingServer` off in CI (still on locally, so a stale preview on port 4173 can serve old results; stop it if in doubt).
- Actions: upload-artifact v7, download-artifact v8, cache v6 (latest majors confirmed with `gh api`); Playwright cache key `playwright-<os>-<ImageOS>-<playwright version>`; `install-deps` still runs on a cache hit.
- New job `e2e-result` (needs e2e, `if: always()`, fails unless the matrix result is `success`) is the stable gate; deploy needs verify, build, e2e and e2e-result.
- Required checks for a future ruleset: `verify`, `build`, `e2e-result`. Not `deploy`, `a11y` or `upgrade` (`e2e (1)`/`e2e (2)` names depend on the shard list).
- A push to main/dev while a run is in progress does not cancel it; a newer queued run replaces an older pending one, so the latest commit still deploys.
- `quality.yml` path filter now also covers `scripts/contrast.ts`, `scripts/test-upgrade.ts`, `scripts/buildVersion.ts`, `src/lib/update.ts`, `src/main.tsx`, `package.json`, `package-lock.json` and the workflow itself.

## Themes branch (phase B, after merging faster-tests)

Single runs on the same machine (not 3-run medians), wall time including `ensure-build`.

| Suite | Result | Time (s) |
|---|---|---|
| `npm test` | 66 files, 866 tests | 67 (vitest reports 63) |
| `npm run test:cov` | 866 tests, rules gate 100% branches passes | 45 |
| `npm run e2e` | 73 passed | 88 |
| `npm run e2e:smoke` | 14 passed (12 existing + 2 theme boot tests) | 56 (47.7 in Playwright) |
| `npm run e2e:themes` | 18 passed (8 theme x scheme flows, 5 picker, 4 boot/CSP/wipe, 1 S1) | 67 (58.5 in Playwright) |

The two added @smoke tests are the boot tests in `tests/e2e/appearance.spec.ts` (first paint with the app bundle blocked; app applies the scheme with the boot script blocked), about 1 s each. The full theme matrix is local-only (`npm run e2e:themes`, also part of `npm run e2e`).

## Update 2026-10-22: CI runs the smoke tests only

Decision (owner): this is a hobby app, so GitHub runs the fast gate only and the slow suites run on the owner's machine.

- `deploy.yml`: `verify`, `build`, `smoke` (one job, `npm run e2e:prebuilt -- --grep @smoke`, 12 tests), `deploy` (main only, needs verify, build and smoke). The sharded `e2e` job and the `e2e-result` aggregate are gone. Failure traces are uploaded as `smoke-results`.
- `quality.yml` is manual only (`workflow_dispatch`): `a11y` and `upgrade`. No nightly schedule, no pull-request triggers.
- Required checks for a future ruleset: `verify`, `build`, `smoke`. Not `deploy`, `a11y` or `upgrade`.
- Why: in the first run on GitHub the browser tests themselves took under a minute per shard; one shard spent 11.5 minutes installing Chromium and system packages (both shards raced to fill the browser cache). A single job removes the race. The full suite, the accessibility audit and the upgrade test stay available locally (`npm run e2e`, `npm run audit:a11y`, `npm run test:upgrade`).
