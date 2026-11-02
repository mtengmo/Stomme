# Plan fas 1: välj fokus när passet startas, ta bort löpprogrammet

Skriven 2026-11-01 efter planering av architect-einstein. Ingen kod är ändrad.
Fas 2 (veckoplan och grupper för egna pass) ligger i `docs/plan-week-planner.md` och bygger på den här.
Radnummer kommer från planeringen och kan ha flyttat sig. Grep på funktions- och filnamn och lita inte på radnumren.
Gamla backuper och sparade data behöver inte bevaras. Scheman får ändras direkt.

Bygg på en egen gren från `main`, till exempel `feature/start-focus`. Checka in eller spara undan `docs/plan-new-exercises.md` först.
Rör inte övningsinnehållet (E95/E96/E98 rättas på en annan gren, E97 är pausad).

## Bakgrund: hur det fungerar i dag

- **Första start:** `features/training/QuickStart.tsx` med `quickStartModel.ts`. Mål: "Bli starkare" (general), "Styrka för löpning" (running), "Skapa eget pass" (build), "Knärehab". Stegen i `stepsFor`: general = utrustning, nivå, fokus ("Hela kroppen" eller "Välj kroppsdelar", de sex `bodyRegions`). Sparar `TrainingPreferences` och öppnar `/traning/A`.
- **Återvändande användare:** `TrainingHome.tsx` visar "Nästa pass · Pass A/B" (`nextTemplateId` i `rules/schedule.ts`) och länkar till `/traning/{A|B}`. `TrainingPreview.tsx` anropar `defaultPlan()` (`defaultPlan.ts`) som väljer första som gäller: 1) rehabplan, 2) sparad rutin (`trainingRoutines[programId][A|B]`), 3) `buildRoster()` (`rules/programRosters.ts`).
- Kroppsdelsfokus är en sparad hemmainställning som bara kan ändras via "Ändra › Byt inriktning" (`TrainingSetup`).

**Problem**
- Inget dagligt val. Press en dag och drag nästa kräver att man byter en sparad inställning varje gång.
- `focused()` hämtar bara från `allPicks()`: en övning från vart och ett av 12 `generalSlots` (ca 45 kandidater), max 5. "Bröst" ger en övning plus fyllnad. De flesta av ca 95 övningar kan aldrig dyka upp.
- Regionerna är för grova. `arms` blandar biceps och triceps, så push/pull går inte att uttrycka.
- Täckningsvarningen i `ReadyWorkout.tsx` (~rad 78) varnar "Saknas: ben…" för alla allmänna planer, även ett avsiktligt fokus.
- `restStatus` ger 48 timmars vilorådgivning efter varje pass i programmet, oavsett muskel.
- Sparade rutiner ignorerar fokus.

## Beslut (användaren, 2026-11-01)

- Gamla backuper och data behöver inte beaktas. Radera `running` helt (nedan, T1).
- Fokusvalen: Helkropp, Överkropp, Underkropp & bål, Press (bröst, axlar, triceps), Drag (rygg, biceps, grepp), Ben, Välj själv.
- Rehab och fysio är oförändrade (se Säkerhet).
- Bygg inte övning E97. Nya övningar E95/E96/E98 är bara bibliotek och får inte komma in i fokuslistorna.

## Nytt flöde

- **Hem** (bara icke-rehab): en kompakt rad under titeln, "Dagens fokus: Drag (förslag) · Byt", med den befintliga primära knappen "Visa nästa pass" direkt under. Håll Home inom skärmen vid 360x640 och 130 %.
- **"Byt" öppnar `/fokus`** ("Vad tränar du idag?"): stora radioknappar för de sju valen. Varje rad kan få en ledtråd ("Tränat igår", "Inga övningar med din utrustning", då avstängd). "Välj själv" expanderar de sex regionerna (extrahera listan från QuickStart till `RegionChecklist`). Fast knapprad nedtill ("Tillbaka" / "Visa passet"), samma mönster som QuickStart.
- **Överlämning:** `/traning/{A|B}?fokus=push` eller `?fokus=egen&delar=legs,core`, validerat mot en vitlista (som `tillbaka=`). Utrustning, nivå och Helt pass/Kortpass är oförändrade i `TrainingPreview`.
- **Standardfokus:** förslaget från återhämtningsregeln, annars senast använda fokus (sparas på passet, se T5), annars Helkropp.
- **Onboarding (QuickStart):** ta bort löpmålet. Behåll fokussteget och lägg en rad: "Du väljer fokus inför varje pass på träningssidan."

## Säkerhet (får inte ändras)

- Rehab: tidig retur i `buildRoster`, rehabgrenen i `defaultPlan`, AAOS- och fysioplanerna, `startReadiness`, rehabincheckningar och stoppet "Avbryt – det gör ont" är orörda. (Globala smärtfilter är borttagna för vanliga pass, se `plan-pain-rehab-only.md` P1.)
- Hem och `/fokus` länkar bara till `/traning/:id`. Grindarna i `TrainingPreview` är fortfarande enda vägen att starta.
- Fokusväljaren döljs för rehab. Rehabpass får inget `focus`-fält.
- Alla övningar väljs via befintliga `pickFromSlot` (utrustning, registrerad vikt, nivåfönster, lättaste-fallback-not, `rehabAdditionIds`). Smärta filtrerar inte längre rostret.
- Återhämtningsförslaget är rådgivande. Det blockerar aldrig och ändrar aldrig rehabgrindar.

## Uppgifter i ordning

### T1. Ta bort löpprogrammet (Sonnet, copy: Haiku)

"Styrka för löpning" är en avgränsad gren. Radera den helt.

Källa:
- `domain/types.ts`: `'running'` ur `ProgramId` (~rad 131). `StandardProgramId` (~rad 323) försvinner, rutinerna får ny nyckel i T5.
- `content/programmes.ts`: `programmeNames.running` (~rad 22).
- `rules/programRosters.ts`: `running()`, dess gren i `buildRoster` och `templates`-importen. `content/rosterSlots.ts`: `runningEasier` (~rad 110-117).
- `features/training/quickStartModel.ts`: målet `'running'`, `stepsFor`, `allowedEquipment`, castingen i `preferencesFromDraft`. `QuickStart.tsx`: målknappen (~rad 33) och texten "Din löpvana kan vara en annan" (~rad 316). `TrainingSetup` bygger sina radioval från `programmeNames` och förlorar alternativet automatiskt.
- `db/backup.ts`: `'running'` i session- och preferens-enumerna (~rad 249, 479) och `running: routinePlans` (~rad 410). `db/trainingRoutines.ts` (~rad 10).
- Historik och rapporter: `features/history/History.tsx` (~rad 206), `rules/physioReport.ts` (~rad 14, 23), `rules/progressOverview.ts` (~rad 29), `features/history/ProgressOverview.tsx` (~rad 23).
- Copy: `features/onboarding/Onboarding.tsx` (~rad 42), `features/library/ExerciseLibrary.tsx` (~rad 168).
- Behåll biblioteksetiketten "Löpstyrka" (`Purpose 'running'`, `runningReasons` i `content/exerciseMetadata.ts`). Den beskriver övningar och inte ett program.
- Behåll `content/templates.ts` och `rules/prescription.ts` även efter T0-L (de raderades inte i P3).

Tester som uppdateras eller tas bort (grep på `running`, varje träff raderas eller byts till `general`):
- `programRosters.test.ts` (~rad 51, 83, 106, 121, 282), `content/kneeStrength.test.ts` (~rad 41, 57, `runningEasier`), `quickStartModel.test.ts`, `quickStart.test.tsx`, `setupOwnWorkouts.test.tsx`, `db/training.test.ts`, `db/trainingRoutines.test.ts`, `db/session.test.ts`, `db/sessionTimeout.test.ts`, `physioReport.test.ts`, `progressOverview.test.ts`, `shortWorkout.test.ts`, `pain.test.ts`, `training.test.ts`, `weightInventory.test.ts`, `exerciseProgression.test.ts`.
- E2E: `tests/e2e/flow.ts` (~rad 263-283, ta bort löpmålet), `training.spec.ts` (~rad 103, behåll check-in-kontrollerna men starta från `general`), `training-preparation.spec.ts` (~rad 15) och `setup-own-workouts.spec.ts` (~rad 18) byts till `general`, `physio-report.spec.ts` (~rad 133-248, 344) tar bort löppasset.

Ingen migration. En enhet med sparade löpinställningar faller på `isTrainingPreferences` och hamnar i QuickStart. Löppass i databasen ignoreras. Dev-enheter använder "Radera all data".

Klart när: ingen `running`-träff återstår utanför `content/templates.ts` (gamla programmet) och biblioteksetiketten, och alla tester är gröna.

### T2. Fokuslistor (Sonnet, Opus granskar kandidatlistan)

- Ny `content/focusPresets.ts`: `FocusId = 'full'|'upper'|'lower'|'push'|'pull'|'legs'|'custom'`. Varje preset har etikett, målmängd `MuscleGroupId[]` och ordnad sloltlista. `custom` mappar valda regioner till muskler via `bodyRegions`.
- `content/rosterSlots.ts`: ny `focusSlots: (RosterSlot & { targets: MuscleGroupId[] })[]`. Återanvänd `generalSlots`-listorna och lägg slots: `row`, `vertical-pull`, `lateral-raise`, `curl`, `arm-extension`, `calf`, `hip-side`, `carry`, `core`, `side-core`. Kandidater i varje slot ordnade från lättast till svårast. Kandidatlistan är en uttrycklig opt-in, inte "hela katalogen". Nya övningar E95/E96/E98 och knäövningarna i `docs/knee-strength-plan.md` får inte vara med.
- Tester: utöka `content/kneeStrength.test.ts` (E90–E98-id saknas i `focusSlots`). Nya invarianter: inga `rehabAdditionIds`, ingen `wall-push-up` eller `crunch`, varje kandidats primära muskler skär sloten `targets`, varje preset går att nå med bara kroppsvikt.

### T3. Rostret (Sonnet)

`rules/programRosters.ts`:
- Lägg `RosterContext.focus?: { id: FocusId; regions?: BodyRegionId[] }`.
- Ordning i `buildRoster`: 1) rehab tidig retur, oförändrad, 2) om fokus saknas eller är `full` och inga bodyParts: `wholeBody()` oförändrad (inga regressioner), 3) annars nya `focusRoster()`.
- `focusRoster()`: välj de slots vars `targets` överlappar fokusmusklerna, sammansatta rörelser först. Välj varje övning via befintliga `pickFromSlot`. Pass B tar andra valet i varje pool, som `focused()` gör nu. Storlek: 5 för nya/några, 6 för regular, minst 3, annars fyll med helkropp och `TOP_UP_NOTE`.
- Ersätt `focused()` med den och döp om `regionsAvailable` till `focusAvailable(prefs, ctx)` som returnerar presets och regioner.
- `features/training/defaultPlan.ts`: skicka `focus` till `buildRoster`. Hoppa över `savedRoutines` när fokus inte är `full` (ändras i T5 till rutiner per fokus). Vikter, set och smärtbaserade lätta starter kommer som förut från `basePlan`, `chooseStartingWeight` och `trainingPlanSuggestion`.
- Tester i `programRosters.test.ts` (100 % grenar i `src/rules`):
  - per preset × erfarenhet × A/B: 3–6 unika övningar som passar
  - Press innehåller aldrig en övning med ben som huvudmuskel
  - impact ingår inte i rostret när en användare har registrerat symptom (`painOnRecord` borttagen i P1, så inget smärtfilter längre)
  - rehab ger `[]`
  - `full` är lika med gamla `wholeBody` (ögonblicksbild)
  - uppdatera befintliga kroppsdelstester (~rad 183-222)

### T4. Återhämtning (Sonnet)

- Ny ren `rules/recovery.ts`: `recentMuscles(sessions, now, hours = 48)`. Räknar slutförda och avbrutna pass i alla program (även rehab och egna), `finishedAt ?? startedAt` inom fönstret. Muskler från `plan[].exerciseId` minus `feedback[id].skipped`, bara primära muskler.
- `suggestFocus(recent, available)` returnerar första tillgängliga preset utan överlapp i ordning Press → Drag → Ben, sedan Överkropp → Underkropp, sedan Helkropp. Blockerar aldrig.
- För allmänna användare ersätts den generiska `restNote` med den muskelspecifika "Bröst och axlar tränades för 1 dag sedan", bara när valt fokus överlappar. `WeeklyPlan`-rådet är oförändrat.
- Tester: fönsterkanter, hoppade övningar utesluts, rehabpass räknas, reservförslag.

### T5. Förhandsvisningen (Sonnet)

Eftersom scheman får ändras direkt:
- **Rutiner per fokus:** `TrainingRoutines = Partial<Record<RoutineFocus, Partial<Record<TemplateId, PlannedExercise[]>>>>` där `RoutineFocus` är varje `FocusId` utom `custom`. `RoutineControls` fungerar på varje preset och inte bara Helkropp. Skriv om meta och zod-scheman. `db/trainingRoutines.ts`.
- **Fokus sparas på vanliga allmänna pass:** lägg `focus: FocusId` (och `regions` när det är `custom`) på sessionen. Rehab och egna pass får det inte. Historiken kan då visa "Pass A · Drag". `preferences.bodyParts` blir bara onboardingens standardfokus.
- En parser för `?fokus` i `lib`, `App.tsx`-routens props, `TrainingPreview.tsx` (`draftKey`, rubrik "Fokus: …", dölj `RoutineControls` på fokusdagar tills rutiner per fokus är klara), `ReadyWorkout.tsx` (visa "Saknas"-notisen bara för helkroppsplaner).
- Backup: höj `BACKUP_SCHEMA_VERSION` till 3 och godta bara 3. Ta bort v1-unionen (~rad 512, 539-540, 552-553 i `db/backup.ts`) och dess tester.
- Tester: `defaultPlan.test.ts`, `ReadyWorkout.test.tsx`, `previewDraft.test.ts`, ogiltig parameter, backupens rundtur och avslag av ogiltiga värden.

### T6. Hem och `/fokus` (Sonnet)

- Rad "Dagens fokus: … · Byt" på `TrainingHome`. Ny `features/training/FocusPicker.tsx` på `/fokus` med sju rader på minst 48 px, fast knapprad ovanför navigeringen, `pb-[var(--app-nav-height)]` så `expectNavClearance` håller. "Välj själv" får scrolla men knapparna ska synas.
- Ingen "dölj för löpning"-regel (löpning finns inte längre). Väljaren döljs bara för rehab.
- Tester: renderingstest, dold för rehab, avstängda rader.

### T7. E2E (Sonnet)

- Ny `tests/e2e/start-focus.spec.ts` vid 320x640, 390x844 och 360x640 130 %, ljust och mörkt.
- Utöka `no-dead-scroll.spec.ts` med `/fokus` och Hem med fokusraden.
- Smärtväg (ändrad i P1): ett registrerat symptom ändrar inte rostret eller vikterna för vanliga användare. "Det gör ont" på en övning ger bara en notering i förhandsvisningen och hoppar inte över övningen av sig själv.

### T8. Säkerhetsgranskning (Opus, reviewer)

Rosterlistorna och bibliotekslistan, rehabgrindar (smärtfiltren är borttagna), rehabvägen, copy.

### T9. Docs (Haiku)

En rad i `docs/next-plan.md`. Beskriv ändringen: kroppsdelsanvändare får andra rostrar och löpprogrammet är borta.

Kör `npm run check`, `test:cov`, `build` och relevanta Playwright-specar. Granska riktiga skärmbilder vid 320 och 390 px.

## Separat uppgift efteråt: T0-L, ta bort det gamla "Knä och löpning · ursprungligt program"

Planeras och granskas separat (Opus-plan, Sonnet, Opus-granskning). Börja inte med den i fas 1.

**Status: genomförd som P3 i `docs/plan-pain-rehab-only.md` (commit 7f8bfdf och följande). Texten nedan beskriver planen.**
Programmet nås i dag bara via gamla data eller genom att skriva `/#/pass/A`. Det är inte enklare för den här funktionen och rör smärtsystemet och e2e-uppsättningen.

Skulle raderas: rutten `/pass/:id` (`App.tsx` ~rad 184), `features/pass/*`, `content/templates.ts`, `content/alternatives.ts`, `rules/nextPlan.ts` (`buildPlan`, `wallSitPlan`), `planningData`, `programStartDate`, `addWallSit` och de gamla grenarna i `logSet`/`startSession`/`replanSession` i `db/repo.ts`, `features/week/WeekView.tsx`, `weekTally.ts`, `StaleSession.tsx`, det gamla 0–10-knäsmärtflödet (`PainScreen`, `careState`, `PainNotices`, `recordPainReading`/`addPainLog`, `PainLog` och tabellen, kräver Dexie-versionshöjning), meta `'program'`, `legacy`-grenen i `TrainingHome` och namnfallbackarna (`templates[...].name` i `Runner.tsx`, `Summary.tsx`, `PainNotices`, `ExerciseCard`, `ExerciseLibrary`, `ExerciseResults`, `dev/demoData.ts` blir `Pass ${templateId}`).

Förutsättning: skriv om e2e-selen först. `playPassA`, hands-free-testet och varje no-dead-scroll-test för passskärmen går via `/#/pass/A` och måste gå via `quickStart(general)` → `/traning/A` → "Börja passet". Stoppgrinden kontrollerades före radering. Rehabgrindarna är obligatoriska rehabincheckningar, symptom i rehab och `startReadiness`, och de står kvar. Vanliga pass får ingen obligatorisk incheckning; ventilen "Det gör ont" ersätter den. Det gamla 0–10-stoppbanderollet skyddade bara gamla pass.

## Risker

- Bibliotekslistor som läcker in i rostrar. Skydd: kurerade slots plus invarianttesterna i T2.
- Befintliga kroppsdelsanvändare får andra rostrar. Det är avsikten, skriv det i releasenoterna.
- Hemmets höjd vid 360x640 / 130 %. Skydd: bara en rad.
- 48-timmarsregeln per muskel krockar med A/B-rådet. Hanteras genom att bara byta `restNote` för allmänna användare.
- Täckningsgrinden: nya regelgrenar måste nå 100 %.

## Öppna frågor (förval inom hakparentes)

1. Ta bort biblioteksetiketten "Löpstyrka"? [Nej, den är innehåll]
2. Radera det gamla programmet som T0-L efter fas 1? [Ja]
3. Godta bara backup v3? [Ja]
4. Rutiner per fokus? [Ja]
5. Spara `focus` på allmänna pass? [Ja]
6. Antal övningar per fokuspass? [5 för nya/några, 6 för regular, minst 3]
7. Återhämtning: [48 timmar, bara primära muskler, rådgivande]
8. Sparade A/B-rutiner: [per fokus, se T5]
9. Visa "Pass A/B" på fokusdagar? [Behåll internt för variation, visa bara fokusetiketten]

## Modeller

- Opus: T0-L-planen och granskningen, T2:s kandidatlista, T8 och U8.
- Sonnet: T1, T3, T5–T7 och fas 2.
- Haiku: copy i T1, T9.
