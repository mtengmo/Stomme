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
