# Next steps (as of 2026-10-28)

The exercise/history handoff was merged and pushed as `14cfb28`. The next requested build is now implemented on `feature/training-continuity`: remembered A/B routines, explicit short workouts and local weekly planning. See [the plan and verification](training-continuity-plan.md). No further merge or push has been performed.

## Finished

- Ditt program ([docs/plan-ditt-program.md](plan-ditt-program.md)) is done on `feature/ditt-program`: tasks T1-T13 complete. Follow-ups: Codex/human review of the 22 beginner-set exercises first (glute-bridge, back-extension, goblet-chair-squat, knee-push-up, dead-bug, wall-push-up, plank, calf-raise); E01 text/animation re-review cross-vendor; tempo text vs `repTempo` for E01; block 2 'new'-only curated pool not implemented, `curated` stays true.
- E69 decline push-up and E70 diamond push-up (`technical`), plus E71 plank with arm lifts (`practiced`). IDs, stable references, aliases, source notes, muscle tags, equipment, catalogue, backup round-trip and geometry tests are updated. Source URLs were opened before use; figures were checked in `/dev/figurer`, including reduced-motion framing. E71 is counted manually: one alternating arm lift per rep.
- Harder/easier links for wall → knee → push-up → decline/diamond and calf raise → single-leg calf raise. New/some rosters retain the knee-push-up fallback; regular bodyweight users can receive a harder press. Registered weighted presses keep priority. No weighted push-up or optional calf hold was added.
- “Prova nästa nivå” on preview and completed-session summary. The latest two same-programme attempts must be complete, with every set/side at the top of the range, effort easy and after-check good. Symptoms since the older attempt block it. Missing/aborted/skipped/early-ended results do not qualify. Rehab is excluded. Equipment is checked, the exercise never switches automatically, and an explicit preview switch uses its start dose.
- “Resultat per övning” now has a small chart and short newest-first session rows: date, sets/reps and weight. Programme, full set values, symptoms and missing answers are available in an accessible disclosure, with a session-detail link. Programme/equipment/side/weight filters remain separate. Incomplete session status stays visible. History's latest-session link now has a 48 px target.
- Upgrade runner: native Windows tar handles drive-letter paths, and the browser contexts support tsx's serialized callback helpers. Accessibility and M6 screenshot scripts use manual counting; the latter seeds the legacy programme explicitly and starts Vite without a shell wrapper.
- Refreshed `.impeccable/design.json` from the existing design context. `CLAUDE.md` is absent from this checkout, so there is no implementer name to repair.

## Previous verification (exercise/history handoff)

- `npm run check` and `npm run build` pass. Check reports only existing Biome warnings/deprecation information.
- `npm run test:cov`: 1,348 tests passed, 100% branch coverage in `src/rules/`. Removed unreachable roster top-up code and redundant fallback branches; apparatus-free running rosters and missing historical check-ins have explicit regression coverage.
- Mobile preview/history tests pass at 320/360/412 px in light and dark, including explicit switching, start dosage, draft reload, varied set results, missing answers, session-detail links and overflow checks. Screenshots were inspected. The existing bodyweight/catalogue browser checks also pass.
- `npm run test:upgrade`: all six scenarios pass, including the unmodified old-client bootstrap, offline retry, active workout and multiple tabs.
- M6 screenshot runner completes at 360/412 px in both schemes.
- Full browser suite: 104 passed initially; the two failures were stale 68-exercise assertions. After updating them to 71, all 12 checks in the affected/mobile specs pass against the final build. No functional browser failures remain.
- Accessibility: contrast checks pass; the final structural audit covers 104 screens at 360×800 in light/dark with no findings. The design detector reports no findings on changed screens.
- `deploy.yml` uploads and deploys Pages from `main`; `dev` is a separate Cloudflare deployment. The latest completed [quality run](https://github.com/mtengmo/Stomme/actions/runs/39821006034) succeeded on 2026-10-22, before this handoff's script changes; the local runs above verify the current scripts.
- Local screenshot/log artifacts: `.impeccable/review/next-plan/` (ignored by git). Recreate mobile screenshots with `npx playwright test tests/e2e/next-plan.spec.ts` and inspect figures with `npm run dev` → `#/dev/figurer`.

## Decisions waiting for the owner

- Old knee programme: a forgotten session with every set logged is ended as “avbruten” (`timeout`) after 90 minutes. Choose whether to keep that cautious behaviour (no progression without after-pain feedback) or complete such sessions. `StaleSession` has not been deleted.
- Keep or remove the one-time “Nytt: appen räknar repetitionerna åt dig…” line on the set screen.
- Old merged local branches may be deleted: `start-flow-redesign`, `rep-counting`, `timeout-and-exercises`, `history-summary`, `fix-bodyweight-weight`. They have been left intact.

## Still needs a real device

- Beeps, Swedish speech (requires an installed Swedish voice), figure comprehension and floor-use ergonomics have not been tested on a physical phone. Browser screenshots and geometry checks do not replace that check. Use `npm run dev -- --host`.
- After an authorised release, reload the installed app twice and check the displayed commit. No deployment or installed-app reload was performed here.
- Pace and “Räkna själv” remain per-exercise backup data. Older cached app versions cannot restore backups containing `abortReason: 'timeout'` or the new metadata; existing IDs and backup schema remain unchanged.

## Working convention

Use a feature branch, preserve the Swedish notebook design, and inspect real mobile screenshots before committing UI changes. Run check, coverage tests and build; run browser/accessibility/upgrade checks for relevant changes. Commit on the feature branch. Merge or push only when asked. Named Claude agents from the original handoff are not required by this repository.
2026-11-01: E95 corrected to Blast off-armhävning (the first version, a plyometric push-up, was wrong): planted-hands push-up where the body travels forward and back; editorial, not impact, avoid with wrist or shoulder problems.

2026-11-01: Fokus väljs inför varje allmänt pass med muskelbaserade återhämtningsförslag och rutiner per fokus. Kroppsdelsval får nya kurerade rostrar; löpprogrammet är borttaget. Rehab och det ursprungliga knäprogrammet är kvar. Backup kräver v3.

2026-11-01: Egna pass grupperas automatiskt eller manuellt och kan planeras på 1–5 veckodagar via /vecka. Veckoförslag sparas först med Spara, och dagens tilldelning öppnar alltid förhandsvisningen. Välj själv används bara för dagens pass eftersom veckoplanens fokus inte har kroppsdelar.

2026-11-01: Plyometriska övningar E99 Sidohopp på ett ben (redaktionell, tid per ben) och E100 Boxhopp (NASM, steg, räknas för hand). Bara bibliotek, knäbelastade och i `impactExercises`; ingen roster, rehabplan eller progressionslänk. Rehabväljaren döljer nu impact-övningar (`pickableInProgramme`). Se `docs/plan-plyo-exercises.md`.

2026-11-03: Smärtfunktionen är bara för rehab (`docs/plan-pain-rehab-only.md`, P1–P4): globala smärtfilter borttagna för vanliga pass, "Det gör ont" per övning, incheckningar bara i rehab, gamla knäprogrammet och tabellen `PainLog` borttagna (Dexie v3, backup v4). P5 säkerhetsgranskning väntar.

2026-11-03: Fyra löp- och fotarbetsövningar E101 Snabba fötter, E102 Hopp in och ut, E103 Sidoförflyttning över linje, E104 Höga knän på stället (redaktionella, tidsstyrda, knäbelastade, bara bibliotek och egna pass) samt korrekt timertext för tidsstyrd rörelse. Se `docs/plan-quick-feet-drills.md`.
Starttiden för tidsstyrda övningar följer nu vald erfarenhet (`startingSeconds` i `levelPolicy.ts`: ny/någon/regelbunden = start, +2 och +4 steg, högst ett steg under max så att första passet har progressionsutrymme, utom när start redan är max); de fyra nya övningarna går 20/30/40 s med max 45 s. Rehab och historikbaserade mål påverkas inte.
