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
