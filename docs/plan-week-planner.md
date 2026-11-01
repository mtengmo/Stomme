# Plan fas 2: veckodag och grupper för egna pass, veckoplanerare

Skriven 2026-11-01 efter planering av architect-einstein. Ingen kod är ändrad.
Bygger på `docs/plan-start-focus.md` (fas 1). Börja inte innan T2 (fokuslistor), T4 (återhämtning) och T5/T6 (`?fokus=`, Hem-raden, per-fokus-rutiner) är klara.
Radnummer kan ha flyttat sig, grep på namn. Gamla backuper och data behöver inte bevaras. Scheman får ändras direkt.

## Bakgrund: hur det fungerar i dag

- **Egna pass:** meta `customWorkouts`, typ `CustomWorkout {id, name, exerciseIds (1–12), plan?}` i `db/customWorkouts.ts`, max 30. De är globala (inte knutna till program). Skapas via `/nytt-pass` (`NewWorkout.tsx`), QuickStart "Skapa eget pass" (`saveStartWithCustomWorkout`) och förhandsvisningens namngivna spar- och namnbytesfunktioner. `CustomWorkoutList.tsx` visar dem: på Hem de tre senast använda plus "Visa alla", i inställningspanelen hela listan. De öppnas på `/traning/A?workout=id` och flyttar aldrig A/B (`nextTemplateId` i `rules/schedule.ts` hoppar över pass med `customWorkoutId`).
- **Veckoplan:** meta `weeklySchedule {days: 1–3 ISO-veckodagar, moved?}` (`rules/weeklySchedule.ts`, UI `features/week/WeeklyPlan.tsx`). Dold för rehab. Den lagrar bara dagar, inget pass per dag. Visar "Nästa planerade pass", "Klart den här veckan" och generellt 48-timmarsråd. `WeekView.tsx` hör bara till det gamla programmet. Utöka den inte.
- **Backup:** `db/backup.ts`. Meta-värden är zod `strictObject`: customWorkouts (~rad 431–448), weeklySchedule (~rad 415–422, återanvänder `isWeeklySchedule`). Meta indexeras inte, så meta-ändringar kräver ingen Dexie-versionshöjning.
- **Påminnelser:** inga finns (bara `BackupReminder` i appen). Push eller OS-påminnelser kräver behörighet och schemaläggning som appen saknar. Utanför det här.

## Beslut (användaren, 2026-11-01)

- Varje eget pass ska kunna få ett veckodagsförslag, och egna pass ska grupperas per muskelgrupp.
- Gamla backuper är oviktiga, så scheman skrivs om direkt.

## U1. Datamodell, validerare och backup (Sonnet, kan börja efter T2 och T5)

- `CustomWorkout.group?: WorkoutGroup` där `WorkoutGroup = 'push'|'pull'|'legs'|'upper'|'full'|'other'` (ligger i `content/focusPresets.ts` från T2). Saknas fältet betyder det "automatiskt". "Underkropp & bål" visas i gruppen Ben. `readCustomWorkouts` släpper ett ogiltigt `group`-fält men behåller passet. Namnbyte och append sprider redan resten av fälten, så gruppen överlever.
- `WeeklySchedule` skrivs om: `{ days: { day: 1..7; plan: { kind: 'standard' } | { kind: 'focus'; focus: FocusId } | { kind: 'workout'; workoutId: string } }[] (1–5, unika dagar); moved?: { from; to } }`. Planen är obligatorisk per dag, så ingen separat `assignments`-karta behövs. Uppdatera `isWeeklySchedule`, `readWeeklySchedule`, `nextPlannedDate`, anropare av `nextOccurrence` och `WeeklyPlan.tsx`. `moved` fortsätter fungera: det flyttade datumet bär planen från sitt `from`-datum.
- Dinglande id: `deleteCustomWorkout` rensar också veckoplanens dagar som pekar på passet, i samma `db.meta`-transaktion (vidga `updateWorkouts` så den skriver båda nycklarna). Läsaren behandlar okända id som "Nästa pass".
- Backup: `BACKUP_SCHEMA_VERSION` höjs till 3 i fas 1 (T5). Lägg här in de nya formerna i zod-scheman för `customWorkouts` (`group`) och `weeklySchedule` (nya dagformen, max 5 dagar).
- Tester: `db/backup.test.ts` (rundtur av nya former, avslag av ogiltigt `group`, fler än 5 dagar, dagar med samma nummer, okända nycklar), `db/customWorkouts.test.ts` (gruppen överlever namnbyte och append, radering rensar veckoplanen), `rules/weeklySchedule.test.ts` (4 och 5 dagar, giltighet), `db/wipe.test.ts`. Inga gamla fixturer eller kompatibilitetstester.

## U2. Grupp per pass (Sonnet, Haiku kan fylla testtabellen)

Ny `rules/workoutGroups.ts` med `groupOf(workout)`. Ett uttryckligt val vinner. Annars används övningarnas **primära** muskler (`exerciseMuscles`) och **bålen räknas inte**:
- alla muskler inom press (bröst, axlar, triceps) → Press
- alla inom drag (rygg, biceps, underarmar) → Drag
- alla inom benregionen → Ben
- bara överkroppsmuskler → Överkropp
- både över- och underkropp → Helkropp
- inga (bara bål, eller tomt) → Övrigt

Användaren kan åsidosätta gruppen i redigeraren för egna pass i `TrainingPreview` (där namnet ändras): en "Grupp"-väljare med "Automatiskt (Press)" plus de sex grupperna.

## U3. Veckoförslag (Opus designar villkoren, Sonnet implementerar med 100 % grenar i `src/rules`)

Ny ren `rules/weekSuggestion.ts`: `suggestWeek({workouts, daysPerWeek 2–5, preferredDays?, recent})`, deterministisk.
- Dagmallar: 2 → mån/tors, 3 → mån/ons/fre, 4 → mån/tis/tors/fre, 5 → mån/tis/ons/fre/lör. Valda dagar går före mallen.
- Tilldelning: girig med backtracking (högst 5 dagar × 30 pass). Rotera genom grupperna så att inga två träningsdagar i rad, inklusive sön→mån, delar någon icke-bål primär muskel. Helkropp behöver en vilodag på båda sidor, annars får den en granne ("Nästa pass" eller fokus) som inte överlappar.
- Reserv: om det inte finns tillräckligt många pass fylls dagarna med fokus-presets från T2 (till exempel Press/Drag/Ben) som genererar rostrar via `?fokus=` från T5.
- 48-timmarskontroll: första föreslagna dagen kontrolleras mot `recentMuscles` från T4 och flyttas vid överlapp.
- Bara förslag. Knappen "Föreslå vecka" fyller planeraren och inget sparas förrän du trycker Spara. Skriver aldrig över planen tyst.
- A/B-växlingen: `nextTemplateId` är oförändrad. Dagar med egna pass flyttar aldrig A/B. Fokus- och "Nästa pass"-dagar är vanliga pass, så A/B går framåt som i dag.
- Testfall: omslag över veckogränsen, Helkropp-avstånd, för få pass, valda dagar, 48-timmarsförflyttningen.

## U4. Grupper och taggar i listan (Sonnet)

- `CustomWorkoutList`: i inställningspanelen och `/nytt-pass` visas sektioner med h3-rubriker i ordningen Press, Drag, Ben, Överkropp, Helkropp, Övrigt, tomma grupper dolda. På Hem behålls ordningen senast använd och tre rader, men varje rad får en tagg: "Press · Måndag · 5 övningar · ca 25 min" (ingen extra höjd).
- Dagschip i redigeraren i `TrainingPreview` där passets planerade dag(ar) visas, härledda från veckoplanen.
- Rehab: inga taggar eller grupper, listan är som förut.

## U5. Veckoplaneraren `/vecka` (Sonnet)

- Ny sida `features/week/WeekPlanner.tsx` på `/vecka`. `WeeklyPlan` på Hem behåller sina sammanfattningsrader och flytt-funktionen men dagknapparna ersätts av en länk "Planera veckan". Home blir inte längre.
- Layout: överst "Dagar per vecka" (2–5, segmenterad kontroll) och "Föreslå vecka". Därefter sju rader (mån–sön), var och en med dagnamn och en inbyggd `<select>`: Vila, Nästa pass (A/B), fokus-presets och sparade pass grupperade i `<optgroup>`. Konflikttips i en sammanfattningsrad under listan (till exempel "Tis och ons tränar båda rygg"), inte inuti raderna. Fast Spara-knapp ovanför navigeringen (QuickStart-mönstret).
- Storlek: 7 × 56 px ≈ 392 px, ryms på 360x640 vid 100 %. Vid 130 % och 320 px får listan scrolla men knappraden syns. `pb-[var(--app-nav-height)]` så `expectNavClearance` håller.
- Rehab: `/vecka` omdirigerar till `/`.

## U6. "Idag: X" på Hem (Sonnet)

`TrainingHome.tsx`: om dagens datum är en planerad dag (med hänsyn till `moved`) och inget pass är klart ännu, säger huvudkortet **"Idag: Press"** och länkar till `/traning/A?workout=id` eller `/traning/{nextId}?fokus=push`. Annars visas "Nästa pass" som i dag plus en rad som "Nästa planerade: torsdag · Drag". Läser `days[].plan` direkt. Den muskelspecifika vilanteckningen från T4 är rådgivande text på kortet och blockerar aldrig. Raden "Dagens fokus" från T6 låter dig fortfarande byta.
Alla smärtgrindar nås fortfarande via `TrainingPreview`. Kopian ska vara rådgivande ("förslag"), inte ett måste träna.

## U7. E2E (Sonnet)

- Ny `tests/e2e/week-planner.spec.ts` vid 320x640, 390x844 och 360x640 130 %, ljust och mörkt.
- Lägg `/vecka` och Hem med "Idag"-kortet i `no-dead-scroll.spec.ts`.
- Uppdatera `training-continuity.spec.ts` (3-dagarsraden och gränsen) och `home-own-workouts.spec.ts`.
- Rehabfall i `physioFlow.test.tsx` och `homeOwnWorkouts.test.tsx`: inga taggar, inget "Idag", ingen planerare.

## U8. Säkerhetsgranskning (Opus, reviewer)

Rehab- och fysioisolering, att smärtgrindarna nås från "Idag"-kortet, att kopian är rådgivande, att schemaändringarna inte lämnar dinglande id.

## U9. Docs (Haiku)

En rad i `docs/next-plan.md`. Uppdatera copyn "Välj en till tre dagar".

## Risker

- Höjningen av dagsgränsen från 3 till 5 ändrar copy och befintliga tester.
- Dinglande pass-id i veckoplanen (täcks i U1).
- Egna pass är globala, så gruppering beror på det aktuella programmet.
- Planen kan läsas som en regel att träna oavsett läge. Håll copyn rådgivande, och smärtgrindarna gäller alltid.
- Hemmets höjd med "Idag"-kortet vid 360x640 / 130 %.

## Öppna frågor (förval inom hakparentes)

1. Dagar per vecka: [2–5 för förslaget, 1–5 giltigt]
2. Spara gruppen bara vid manuell ändring: [ja]
3. Grupper: [Press, Drag, Ben, Överkropp, Helkropp, Övrigt, Underkropp ingår i Ben]
4. Bål ignoreras vid konflikt mellan dagar i rad: [ja]
5. "Idag: X" på planerade dagar: [ja, andra dagar visar "Nästa pass" plus nästa planerade dag]
6. Samma pass på flera dagar: [tillåtet]
7. Förslag bara via knapptryck: [ja]

## Modeller

- Opus: U3-designen, U8.
- Sonnet: U1–U7.
- Haiku: U9 och testtabellen i U2.
