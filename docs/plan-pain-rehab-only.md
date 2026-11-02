# Plan: smärtfunktionen bara för rehab, minimal ventil för vanliga användare

Skriven 2026-11-01 efter utredning av architect-einstein. **Status: P1–P4 klara** (P1–P3 implementerade i 5b0002d, eea67b3, 7f8bfdf, 1602a83, f61609a; P4 docs i denna commit). **P5 (säkerhetsgranskning) väntar på granskning.**
Användaren tycker att hela smärtfunktionen är överarbetad och bör bara gälla rehab.
Rekommenderat alternativ är B (rehab oförändrad plus en minimal ventil för vanliga användare). Se Öppna frågor, förvalen gäller tills användaren säger annat.
Radnummer kommer från utredningen och kan ha flyttat sig. Grep på namn.
Gamla backuper och data behöver inte bevaras. Scheman får ändras fritt.

## Sekvensering (viktigt)

Codex arbetar på `feature/start-focus` med ocheckade filer (`FocusPicker.tsx`, `NewWorkout.tsx`, `TrainingHome.tsx`, `focusModel(.test).ts`, `WeekPlanner.tsx`, `vitest.config.ts`). P1–P3 rör `TrainingHome.tsx`, P1 rör `FocusPicker.tsx` och P3 rör `App.tsx`. Börja därför inte förrän:
1. Codex har committat och `feature/start-focus` är mergad till `main`.
2. Skapa sedan en ny gren `feature/pain-rehab-only` från `main`.
3. Kör P1 → P2 → P3 → P4 → P5.

Om T8/U8 (säkerhetsgranskningarna i fasplanerna) inte har körts än: kör dem nu med smärtgrindspunkterna markerade som överspelade, och låt P5 täcka dem.

## Fynd

- **De globala smärtfiltren träffar aldrig rehab i dag.** `buildRoster` returnerar tidigt för rehab, `basePlan` hoppar över `chooseStartingWeight` för rehab och `harderExerciseSuggestions` ger `[]` för rehab. "Bara rehab" betyder alltså att radera filtren. Rehabsäkerheten ändras inte.
- **Två separata smärtsystem:**
  - Det gamla 0–10-flödet för höger knä: tabellen `PainLog`, `PainScreen`, `careState`, `PainNotices`, `rules/pain.ts` och stopp/håll-reglerna i `progression.ts`. Nås bara via `/pass/A|B` (det gamla programmet "Knä och löpning").
  - Det nyare symptomsystemet: `SymptomReport` i incheckningar och per-övningsfeedback, `rules/training.ts`, `painOnRecord.ts`. Gäller både vanlig träning och rehab.
- **Det gamla flödet läcker in i vanlig träning.** Länkarna "Ingår i Pass A/B" i `src/features/library/ExerciseResults.tsx` (~rad 301-309) låter vilken användare som helst nå `/pass/A`. Varje poäng över 0 där gör `painLogsShowPain` sant för alltid och slår på de globala filtren.

## Nuläge per användargrupp

**Gamla programmet (inget `programId`)**: 0–10 knäpoäng före, efter och dagen efter, plus röda flaggor (`/smarta/...`). En röd flagga avslutar passet som `pain_stop` och visar stoppskärmen. `suggestNext` (`src/rules/progression.ts` ~rad 106-159) håller knäbelastade övningar vid varning eller stopp. `careState` styr stoppbannern och dagen-efter-notiserna i `WeekView` och `PassPreview`. `progression.ts` används bara av `nextPlan.ts`, alltså bara det gamla programmet.

**Rehab (AAOS, fysio och eget rehabprogram)**: obligatorisk incheckning före (`SessionScreen.tsx` ~rad 133). Incheckning efter förväntas och dagen-efter-incheckning är alltid aktuell (`trainingDayAfterDue`). Varje övning har "Rapportera besvär" (`ExerciseSymptoms`: område, sida, 0–10). "Avbryt – det gör ont" leder till stoppskärmen. Ingen automatisk progression. `startProblems` kontrollerar AAOS-medlemskap. Fysiorapporten är skrivskyddad. Inga globala filter berör rehab.

**Vanlig träning och egna pass** (egna pass ärver `preferences.programId`): samma "Rapportera besvär" och "Avbryt – det gör ont" som rehab. Valfri incheckning före ("Besvär eller något att anpassa idag?", `TrainingPreview.tsx` ~rad 1397-1417). Incheckningen efter är i praktiken obligatorisk (`Runner.tsx` ~rad 247-256 omdirigerar till `/kansla/:id/after`). Dagen-efter läggs till om ett symptom registrerats.

**Det som är överarbetat eller överraskande för vanliga användare:**
- `symptomsOnRecord` (`src/rules/painOnRecord.ts`) är sant för alltid så fort något finns registrerat: ett symptom i vilket område som helst med vilken poäng som helst (även 0 om ett område valts), ett `pain_stop` eller ett gammalt `PainLog` över 0. Därefter:
  - impact-övningar (`squat-jump`, `jumping-lunge`, `burpee`) utesluts ur varje roster och ur fokus-tillgängligheten (`programRosters.ts` ~rad 90, `FocusPicker`, `TrainingHome`)
  - varje roster och egna pass startar på lättaste vikt (`levelPolicy.ts` ~rad 191, `defaultPlan.ts` ~rad 166, 202)
  - nästa-nivå-förslag till impact- eller knäbelastade övningar döljs (`exerciseProgression.ts` ~rad 87-93, knäfiltret lades till 2026-11-01)
- Exempel: en axelbesvär med poäng 2 tar för alltid bort hoppsquats och tvingar kroppsviktsstarter. Det kodas uttryckligen i `tests/e2e/start-focus.spec.ts` (~rad 99-150).
- Sessionsomfattande håll: ett symptom någonstans stoppar +1 rep för varje övning (`training.ts` ~rad 207-228). Varje nyare symptompass sätter tak för alla övningar (`withRecentSymptomHold`, ~rad 75-96). Varje symptom sedan den äldre av de två senaste försöken döljer alla svårare-övning-förslag (`exerciseProgression.ts` ~rad 41-51).
- Progression beror på incheckningen efter: +1 rep och nästa-nivå kräver `checkins.after.feeling === 'good'`, så "Svara senare" blockerar progressionen i tysthet.
- Sex skärmar läser tabellen `painLogs` bara för att räkna `painReported`.
- `startReadiness.ts` är inte smärtrelaterad (den kollar bara plan och AAOS-medlemskap). Behåll den oförändrad.

## Alternativ

- **A. Bara rehab.** Som B men utan "Det gör ont"-knappen och utan markeringen per övning. Vanliga användare behåller bara vanligt avbryt. Förlust: ingen signal, appen kan föreslå +1 rep på en övning som gör ont.
- **B (rekommenderas). Rehab plus en minimal ventil för vanliga användare.**
  - Rehab är orörd.
  - Vanliga pass och egna pass får en åtgärd per övning, **"Det gör ont"**. Den visar en rad om röda flaggor, övningens befintliga `easierOption`-text (och namnet på `easierExerciseId` där det finns) och tre val: "Hoppa över övningen", "Avbryt passet" (som `pain_stop`, sedan stoppskärmen) och "Fortsätt ändå".
  - Den sparar bara `feedback[exerciseId].hurt = true` på det passet. Markeringen är aldrig global. Enda effekten: den övningen får ingen automatisk höjning eller nästa-nivå-förslag, och förhandsvisningen visar "Gjorde ont senast. Välj lättare eller hoppa över."
  - Inget globalt tillstånd, inga filter, ingen tvingad lätt start, inga incheckningar före, efter eller dagen efter för vanliga användare.
- **C. Nuläge, beskuret.** Begränsa `symptomsOnRecord` i tid och kroppsdel. Fortfarande två system med överraskande effekter. Avråds.

**Säkerhet som går förlorad med B, och varför det är acceptabelt:**
- Lätta starter efter tidigare besvär: nya användare börjar redan lättast, startnoter säger "anpassa" och ventilen täcker stunden då det gör ont.
- Automatisk impact-uteslutning: användaren kan byta övningar i förhandsvisningen, övningen som gjorde ont får en notering och en rad i introt pekar mot Knärehab.
- Knäfiltret för nästa nivå: förslagen är valfria och väljs av användaren, och de förblir blockerade för en övning markerad som smärtsam.
- Försenade signaler från incheckningar efter och dagen efter: normalt för en allmän träningsapp.

## Uppgifter i ordning

### P1. Ta bort de globala filtren för vanliga pass och egna pass (Sonnet, 0,5 d)
Ingen schemaändring.
- Radera `src/rules/painOnRecord.ts`, `src/rules/exerciseProgression.impact.test.ts` och `impactExercises` i `src/content/rosterSlots.ts`.
- `src/rules/programRosters.ts`: ta bort `RosterContext.painOnRecord` och impact-klausulen i `pickFromSlot`.
- `src/rules/levelPolicy.ts`: ta bort `painOnRecord`-valet i `chooseStartingWeight`.
- `src/rules/exerciseProgression.ts`: ta bort parametern `painOnRecord` och filtret `globalPain`/`kneeLoaded` (knäfiltret från 2026-11-01).
- `src/features/training/defaultPlan.ts`: ta bort `painReported`-parametrarna (`defaultPlan`, `customWorkoutPlan`), `roster.painOnRecord` och re-exporten `painLogsShowPain`.
- Anropare som läser `painLogs` bara för `painReported`: `TrainingHome.tsx`, `FocusPicker.tsx`, `TrainingPreview.tsx`, `NextLevelSuggestions.tsx`, `src/features/library/WorkoutBuilder.tsx`, `CustomWorkoutList.tsx`.
- Tester: `programRosters.test.ts` (fallen med `painOnRecord` och impact, ~rad 68 och 201-206), `levelPolicy.test.ts` (~rad 85-95), `exerciseProgression.test.ts`, `defaultPlan.test.ts` (~rad 306), `NextLevelSuggestions.test.tsx` (~rad 72), `FocusPicker.test.tsx`, newWorkout/homeOwnWorkouts/WorkoutBuilder-testerna. Nytt regressionstest: en vanlig användare med ett registrerat symptom får samma roster och vikter som en utan.
- E2E: ta bort describe-blocket "start focus after a reported symptom" i `tests/e2e/start-focus.spec.ts`. Behåll `IMPACT_IDS`-kontrollen i första testet (ny användare, Press).
- Klart när: inga träffar på `symptomsOnRecord|painOnRecord|painLogsShowPain|impactExercises` i `src` och `tests`, rehabtesterna oförändrade och gröna, och `test:cov` 100 % i `src/rules`.

### P1b. Introrad (Haiku, 0,1 d)
"Har du ont eller en skada? Välj Knärehab eller följ din vårdgivare." Leverera inte P1 utan den raden, eller leverera P1 och P2 tillsammans.

### P2. Ventilen, incheckningar bara för rehab, markering per övning (Sonnet, 1–1,5 d)
- `src/domain/types.ts`: lägg `hurt?: true` på feedbacktypen per övning. `src/db/backup.ts`: lägg till det i feedbackens zod-schema.
- `src/features/session/Runner.tsx` och `SetScreen.tsx`: rehab behåller `ExerciseSymptoms`. Vanliga pass får en ny komponent `PainValve`. När ett vanligt pass är slut går det direkt till `Summary` och `finishSession` (ingen `/kansla/after`).
- `src/rules/training.ts`: radera `hasSymptoms`. Ersätt de sessionsomfattande symptomkontrollerna och `after.feeling === 'good'`-grinden med "den här övningen är inte markerad `hurt`". `withRecentSymptomHold` blir per övning. `trainingDayAfterDue` blir bara rehab.
- `src/rules/exerciseProgression.ts`: `symptomsSince` blir `feedback[id].hurt` i de två försöken. Släpp efterkänsla-grinden.
- `TrainingPreview.tsx`: radera blocket `checkBefore` och dess rutt. Visa noteringen "Gjorde ont senast. Välj lättare eller hoppa över." för markerade övningar.
- `Checkin.tsx` och `recordTrainingCheckin` i `src/db/training.ts`: bara rehab (avvisa vanliga).
- `TrainingHome.tsx`: uppdatera texten "Plan framåt".
- Historik (`CheckinHistory`, `HistoryTrends`, `ExerciseHistory`, `ProgressOverview`): visa "Gjorde ont" för `hurt`. `PhysioReport` är oförändrad.
- Texten i ventilen: ingen diagnos och inget "säkert". Ta med: "Vid skarp smärta, svullnad eller om en led låser sig: avbryt och kontakta vården (1177)."
- Tester: `rules/training.test.ts`, `exerciseProgression.test.ts`, `db/training.test.ts` (vanliga incheckningar avvisas nu), session-, failures- och quickStart-tester, nytt `PainValve`-test.
- E2E: skriv om "general direction uses body-wide check-ins…" i `training.spec.ts` kring ventilen. Ta bort stegen "Hur kändes passet / Spara och fortsätt" för vanliga pass i `first-run-nav`, `custom-programme`, `quick-start-custom` och `training-preparation`. `physio-knee` är oförändrad.
- Klart när: ett vanligt pass har inga `/kansla`-rutter, "Det gör ont" hoppar över eller avbryter, `hurt` håller bara den övningen, och rehabflödet är identiskt (`physioFlow` och `physio-knee` gröna).

### P2b. Historiketiketter för `hurt` (Haiku, 0,2 d)
Renderingstester.

### P3. Radera det gamla programmet och tabellen `PainLog` (Opus förkontroll, sedan Sonnet, 1,5–2 d)
Det här är samma uppgift som T0-L i `docs/plan-start-focus.md`. Allt som listas där, plus:
- `src/rules/pain.ts`, `progression.ts` och `nextPlan.ts` med tester. `careState.ts` och dess test, `PainNotices.tsx`, `testHelpers.ts`.
- `PainScreen`-delen av `PainScreen.tsx` (flytta `StopScreen` till `features/session/` med en vanlig textvariant som inte säger "Fråga fysioterapeuten"). `src/charts/PainChart.tsx`, `lastPainAfter` i `HistorySummary`, smärtsektionen i `SessionDetail`, `legacyPain` i `History`.
- `painLogs` i `physioReport.ts`, smärtparametrarna i `symptomSummary` och `sessionTimeout.lastActivity`, smärtsektionen och de gamla grenarna i `repo.ts`, antalet `painLogs` i `canReplaceTrainingPreparation`, `wipe.ts`, demodata.
- `PAIN_COPY` beskärs till avbryt- och stopptexterna. Länken "Ingår i Pass" i `ExerciseResults.tsx`. Rutterna `/pass` och `/smarta`. Prefixen i `navVisibility` och `Shell`.
- Flytta påståendet "timeout är aldrig `pain_stop`" från `timeoutNotPain.test.ts` till `sessionTimeout.test.ts`. Regeln gäller fortfarande rehab.
- `src/domain/types.ts`: ta bort `PainLog`, `PainStatus`, `PainReason` och orsakskoderna `pain_hold`/`pain_stop_hold`. Behåll `abortReason: 'pain_stop'`. Behåll `kneeLoaded` som ren metadata och ändra kommentaren ("Gated by the pain rule" stämmer inte längre).
- **Dexie** (`src/db/db.ts`): lägg `this.version(3).stores({ sessions: 'id, date, status, templateId', setLogs: 'id, sessionId, [exerciseId+loggedAt]', painLogs: null, meta: 'key' })` och behåll v1- och v2-deklarationerna.
- **Backup** (`src/db/backup.ts`): `BACKUP_SCHEMA_VERSION` till 4 (om fas 1 redan höjt till 3, höj ett steg till) och godta bara den nya. Ta bort `painLogs`, `painLogSchema`, orsaksenumerna och kontrollen "pågående pass behöver en smärtavläsning före" (~rad 611-669).
- Tester och e2e: radera `pain.spec.ts`, `recordPain.test.ts`, `painRepo.test.ts`, `pain.test.ts`/`.tsx`, `careState.test.ts`, `nextPlan.test.ts`, `progression.test.ts`. Skriv om `answerPain` och `playPassA` i `flow.ts` så de går via `quickStart(general)` → `/traning/A` (förutsättning enligt T0-L). Uppdatera `smoke.spec.ts`, `no-dead-scroll.spec.ts`, smärtskärmen i `themes.spec.ts` och skärmbilderna, samt skärmlistan i a11y-granskningen.
- Klart när: inget `painLogs`/`PainLog` återstår, uppgradering från en v2-databas fungerar (test med `fake-indexeddb`), backup-rundtur på nya versionen, och hela e2e-sviten är grön utan `/pass`.

### P4. Docs (Haiku, 0,25 d)
- `docs/plan-start-focus.md`: avsnittet Säkerhet (~rad 42, 45), T3 "impact uteslutet med painOnRecord", T7:s smärtväg, T8 och T0-L-raden (~rad 140). Den raden säger i dag att smärtgrindarna "ska stå kvar" och måste skrivas om.
- `docs/plan-week-planner.md`: U6 (~rad 66), U8 och risken (~rad 88). Byt "smärtgrindar" mot "rehabgrindar; ventilen för vanliga pass bor i passkörningen så att varje ingång når den".
- `docs/plan-new-exercises.md`: anteckningarna om `kneeLoaded` och "pain stop". Lägg en rad i `docs/next-plan.md`.

### P5. Säkerhetsgranskning (Opus, reviewer, 0,5 d)
Texterna, rehabisoleringen, att ventilen nås från Hem, "Idag"-kortet, `/nytt-pass` och veckoplaneraren.

## Säkerhet och juridik

- Appen är ett träningsverktyg nära rehab och inte en medicinteknisk produkt. Att ta bort smärtpoängsstyrda automatiska beslut ur vanlig träning gör syftet tydligare och undviker allt som liknar symptomövervakning. Behåll rehabraden "Appen bedömer inte om träningen är lämplig".
- **Måste stå kvar:**
  - rehab: obligatorisk incheckning före, incheckningar efter och dagen efter, `ExerciseSymptoms`, ingen automatisk progression, AAOS-medlemskapskontrollen och fysiorapporten utan slutledningar
  - "Avbryt – det gör ont" och stoppskärmen för båda grupperna
  - uteslutning av `rehabAdditionIds` ur allmänna rostrar (det är inte ett smärtfilter)
  - regeln att en timeout aldrig registreras som smärta
- **Det som kan skada:** en användare med ett knäproblem i det vanliga programmet får nu hoppövningar och normala startvikter. Ventilen, noteringen per övning och introraden täcker det. Leverera inte P1 utan åtminstone introraden.

## Risker

- P2 och P3 ändrar mycket e2e (ca 17 incheckningssteg i sex specar plus `/pass/A`-upplägget).
- Dexie-uppgraderingen på riktiga enheter. Testa från v2 med `fake-indexeddb`.
- 100 %-gränsen för grenar i `src/rules`.
- Planen motsäger två tidigare beslut: raden i `docs/plan-start-focus.md` om att smärtgrindarna ska stå kvar, och knäfiltret som mergades till `main` 2026-11-01 (commit facd7a5).

## Öppna frågor (förval inom hakparentes)

1. Vilket alternativ? [B]
2. Ska `hurt` hålla just den övningen och visa noteringen i förhandsvisningen? [Ja]
3. Behåll "Hur kändes passet?" för vanliga användare? [Nej]
4. Byta till den lättare övningen mitt i passet? [Nej, visa bara text och namn, senare funktion]
5. Ta bort knäfiltret för nästa nivå som lades till 2026-11-01? [Ja]
6. Slå ihop T0-L som P3? [Ja]
7. Behåll `kneeLoaded` som metadata? [Ja]
8. Stoppskärm för vanliga användare utan "Fråga fysioterapeuten"? [Ja]
9. Ändra något i rehab? [Nej]
10. Visa gamla symptom för vanliga användare i historiken? [Ingen särskild hantering, gamla data spelar ingen roll]

## Modeller

- Opus: P3-förkontrollen, P5.
- Sonnet: P1, P2, P3.
- Haiku: P1b, P2b, P4.
