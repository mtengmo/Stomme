# Next steps (as of 2026-10-28, `main` at 7f9e957)

Work finished and merged: new quick start, level-driven plans, hands-free rep counting with beeps and per-exercise pace, session timeout, four new exercises, grouped exercise picker, Historik summary, filler-text cleanup. Everything below is open.

## 1. Harder push-ups and "Prova nästa nivå" (recommended first)

Why: beginners now have wall and knee push-ups, but nothing harder than the regular push-up except dips, and nothing tells you when to move up the ladder.

- Add exercises (same pattern as E65–E68: ExerciseId union, `bodyweightExercises.ts`, poses in `bodyweightPoses.ts`, references E69+, aliases, muscles, tests, `docs/bodyweight-catalogue.md`):
  - Armhävning med fötterna upphöjda (decline), level `technical`.
  - Smala armhävningar (diamond), level `technical`.
  - Planka med armlyft, level `practiced`.
  - Tåhävning på ett ben already exists; add a hold variant only if wanted.
- Add a "harder" link next to `easierExerciseId` (`harderExerciseId`) for the chain wall -> knee -> push-up -> decline/diamond, and calf-raise -> single-leg-calf-raise.
- "Prova nästa nivå": after two sessions at the top of the rep range with effort "lätt", suggest the next exercise in the chain on the preview/summary. Never switch automatically. Rehab excluded.
- Verify: roster tests per level (new / some / regular), no push-up without a slot fallback, source URLs opened before use, figures checked in `/dev/figurer`.
- Weighted push-ups (rucksack/vest) are deliberately NOT planned yet. If wanted later: new equipment type, weight field and plan-validation change, behind the "Tränar regelbundet" level.

## 2. Historik: Resultat per övning

The table inside "Din utveckling" (`src/features/history/ProgressOverview.tsx`, "Resultat per övning") is very tall and cramped on phones: narrow columns, every word wraps. Redesign as short rows per session (date, sets x reps, weight) with a small chart above; check at 320/360/412 px with real screenshots.

## 3. Decisions waiting for the owner

- Old knee programme: a forgotten session with every set logged is now ended as "avbruten" (reason `timeout`) after 90 minutes instead of being completable from the week-page banner. `src/features/week/StaleSession.tsx` is practically unreachable. Choose: keep (cautious: no progression without the after-pain answer) or complete such sessions. Then delete or keep `StaleSession`.
- One-time line "Nytt: appen räknar repetitionerna åt dig…" on the set screen: keep or remove.
- Old local branches can be deleted: `start-flow-redesign`, `rep-counting`, `timeout-and-exercises`, `history-summary`, `fix-bodyweight-weight` (all merged).

## 4. Unverified / cleanup

- Never tried on a real phone: beeps, spoken Swedish (needs a Swedish voice), figures (knee push-up, calf raise look acceptable but calf raise reads as a lean), layouts. Test with `npm run dev -- --host`.
- `npm run test:upgrade` cannot start in this Git Bash (tar path error), so the reworked `scripts/test-upgrade.ts`, `scripts/a11y-audit.ts` and `scripts/m6bshots.ts` have only been type-checked; check the GitHub quality run.
- Check whether `deploy.yml` publishes `main`; reload the installed app twice to get new versions.
- Slow unit tests (`repFlow`, `physioFlow`) time out under machine load: raise their timeouts if CI is flaky.
- `.impeccable/design.json` is older than `DESIGN.md`; run `/impeccable document` to refresh when convenient.
- CLAUDE.md names the implementer `developer-billy`, but the agent that exists is `developer-willy`.
- Pace and "Räkna själv" are per exercise and stored in the backup; backups with `abortReason: 'timeout'` or the new meta key cannot be restored by an older cached app version.

## How to work next time

Plan with `architect-einstein` (Opus), verify with `reviewer` (Opus), implement with `developer-willy` (Sonnet, Haiku for mechanical parts), commit on a branch, merge and push to `main` only when asked. Use `/impeccable` for any screen change and look at real screenshots at 320/360/412 px before committing.
