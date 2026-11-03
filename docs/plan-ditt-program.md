# Plan: Ditt program för nya användare

Skriven 2026-11-03 efter planering av architect-einstein, efter designkritiken `.impeccable/critique/2026-11-03T22-19-54Z__src-features-training-quickstart-tsx.md` (23/40). Ingen kod är ändrad.
Bygger på `docs/plan-start-focus.md` och `docs/plan-week-planner.md` (båda genomförda). Radnummer anges inte. Grep på funktions- och filnamn.
Bygg på en egen gren från `main`, till exempel `feature/ditt-program`. Blanda inte in grenen `feature/exercise-audit-log`.
Inga nya övningar och inga figurändringar. Undantaget är en textändring, E01:s namn (se Granskningsloggen).

## Bakgrund: hur det fungerar i dag

- **Välkomst:** `features/onboarding/Onboarding.tsx` visas innan `meta.onboarding` finns. Den har fyra textblock: en nyttomening, "träningsstöd/fysioterapeut", ett stoppbesked med knät och "Så läser du antal" i en details. Därefter kommer integritet och färger. `DisclaimerText` delas med Inställningar.
- **Första start:** `TrainingHome` renderar `QuickStart` på `/` när `meta.training` saknas. Bottennavigeringen syns då, eftersom `navVisibility.ts` säger att första start ska visa nav.
  - `quickStartModel.ts` `stepsFor('general')` ger `goal → equipment → level → focus`.
  - Målskärmen har tre knappar (Bli starkare, Skapa eget pass, Knärehab) och två rehablänkar.
  - `save()` sparar `TrainingPreferences` och går till `/traning/A`.
- **Förhandsvisningen** (`TrainingPreview.tsx`, ca 1 700 rader) är enda startvägen: `startProblems`, fysiobocken och kontrollen av pågående pass. `startTrainingSession` validerar igen. Knappen heter "Börja passet".
  - `ReadyWorkout.tsx` visar `E01 · Sitta ner och resa sig från stol (goblet)` via `exerciseReferences`.
  - Täckningsvarningen kontrollerar drag med `ids.includes('supported-row')`. Ett kroppsviktspass med `back-extension` får därför alltid "Saknas: drag för överkroppen".
  - "Antal bygger på sparade resultat" visas även utan historik.
- **Hem** (`TrainingHome`) innehåller:
  - rubriken "Nästa pass"
  - raderna om träningsvana och skada
  - "Dagens fokus · Byt"
  - primärknappen "Visa nästa pass", mitt på skärmen
  - "Mina pass" (`CustomWorkoutList alwaysShow`, visas även när listan är tom)
  - `WeeklyPlan` (länk till `/vecka`)
  - "Plan framåt", "Ändra" och "Senaste pass"

  Allt väger lika, så ingenting framstår som huvudsaken.
- **Byggstenar:**
  - `rules/programRosters.ts`:
    - `buildRoster`/`pickFromSlot` sköter utrustning, registrerad vikt, nivåfönster och rehabs tidiga retur.
    - `wholeBody` bygger A/B från `generalSlots`.
    - `focusRoster` utgår från presets, där B är andra valet.
  - `content/focusPresets.ts`: full, upper, lower, push, pull, legs och custom.
  - `rules/weekSuggestion.ts`: dagmallar för 2–5 dagar, samt `adjacent`/`overlaps` (bortser från bål).
  - `rules/weeklySchedule.ts`: 1–5 dagar.
  - `features/training/defaultPlan.ts` `customWorkoutPlan`: basePlan + `trainingPlanSuggestion`.
  - `rules/training.ts` `trainingPlanSuggestion`: progressionen räknas **per övning** över alla vanliga pass, oberoende av A/B. Fasta övningar ger därför progression direkt.
  - `rules/shortWorkout.ts` `estimateWorkoutMinutes`.
  - `NextLevelSuggestions.tsx` (`harderExerciseSuggestions`, `onChoose`).
  - `rules/recovery.ts`.
  - `ui/Tally.tsx` och `ui/PencilTick.tsx` (`.tick-new` i `styles/index.css`, reducerad rörelse är hanterad).
  - `figures/Figure.tsx` (`stillOnly`, `paused`, stillbilder vid reducerad rörelse).
- **Data:**
  - `MetaEntry.key` är en sluten union.
  - `meta` och sessionsfälten är inte indexerade, så ingen Dexie-versionshöjning behövs.
  - `db/backup.ts` använder zod `strictObject`, `BACKUP_SCHEMA_VERSION = 4` och `z.literal(...)`.
  - Meta-nyckeln `'program'` är legacy och raderas i en uppgradering i `db/db.ts`. Använd den inte.
  - `TemplateId` är bara `'A'|'B'`. `Session.programWeek` är legacy och alltid 1.
- **Granskningsloggen** (`docs/exercise-audit-log.json`): ingen övning är `approved`.
  - `risk: normal` har bara bål- och kroppsviktsövningarna: dead-bug, side-plank, bird-dog, plank, plank-arm-lift, lying-leg-raise, crunch, back-extension, wall/knee/push-up, decline/diamond push-up och calf-raise.
  - Alla benövningar har `high`.
  - `goblet-squat` och `jumping-lunge` har `needs-fix`.

## Beslut (ägaren, 2026-11-03)

- Onboarding frågar efter dagar per vecka, 1–5.
- Programmet är ett fast block på 4 veckor med samma övningar varje vecka. Efter blocket föreslås nästa block eller nivå (`NextLevelSuggestions`).
- Första blocket hämtar bara övningar ur ett kurerat nybörjarurval (20–25 övningar). Hela biblioteket går fortfarande att bläddra i.
- Formen är en "djärvare anteckningsbok":
  - stora count-siffror
  - animerade figurminiatyrer på passkort
  - tydligare idag och nästa
  - en andra rörelse: en pennbock dras över veckoremsan när en vecka är klar

  One Done Colour gäller, inga skuggor eller gradienter, och reducerad rörelse respekteras.
- Alla fem kritikpunkter ingår. Avslöjandet och Hem görs först.
- Välkomsten får en nyttomening och ett stoppbesked. Övriga varningar flyttas till där de behövs. Rehab- och fysioflöden och säkerhetsgrindar är oförändrade.

**Arkitektens beslut (förval, se Öppna frågor)**
- Programmet följer en **sekvens**. Nästa pass = antal klara pass modulo dagar per vecka, och blockveckan räknas på samma sätt. En missad dag flyttar bara programmet framåt. Inget "missat" och inga streaks.
- Veckodagarna är förslag. Mallen roteras så att pass 1 = **idag**, och avslöjandet slutar med "Starta första passet".
- Ett program finns bara för `programId: 'general'`. Byter man inriktning till rehab blir programmet vilande, inte raderat.
- Hem och avslöjandet länkar till `/traning/A?program=<n>`. Förhandsvisningen är fortfarande startskärmen med grindarna, och knappen "Starta passet" sitter på samma ställe på båda skärmarna.

## Datamodell

`domain/types.ts`:
```ts
export type ProgramEmphasis = 'full' | 'run' | 'upper';
export interface ProgramPass {
  focus: RoutineFocus;            // etikett och muskler för vila
  template: TemplateId;           // A/B-varianten som användes vid generering
  exerciseIds: ExerciseId[];      // 4–6 unika, fasta under blocket
}
export interface TrainingProgram {
  id: string;                     // uuid, sessioner pekar hit
  block: number;                  // 1, 2, …
  createdAt: string;              // ISO-instant
  startDate: string;              // lokalt datum för pass 1
  daysPerWeek: 1 | 2 | 3 | 4 | 5;
  emphasis: ProgramEmphasis;
  weekdays: number[];             // ISO-veckodag per pass, längd = daysPerWeek, unika, bara förslag
  passes: ProgramPass[];          // längd = daysPerWeek
  curated: boolean;               // true = bara nybörjarurvalet
}
```
- **Lagring:** ny meta-nyckel `trainingProgram` med ett aktivt program, inte en lista. Nästa block skriver över den. Historiken behöver inga gamla program, eftersom varje session bär sin egen referens.
- **Session:** `programPass?: { programId: string; pass: 1..5; week: 1..4 }`.
  - Sätts bara av förhandsvisningen, när `?program=n` gäller det aktiva programmet.
  - `focus` = `pass.focus`, så att vila och historik ("Pass 2 · Överkropp") fungerar som förut.
  - `templateId` = `pass.template`. `programWeek` rörs inte.
- **Framsteg** (ny ren `rules/programProgress.ts`):
  - `done` = antal klara sessioner med `programPass.programId === program.id`. Kortpass räknas, avbrutna pass gör det inte.
  - Nästa pass = `done % N + 1`.
  - Vecka = `min(4, floor(done / N) + 1)`.
  - Blocket är klart när `done >= 4N`.
- **Backup:** strikt zod för `trainingProgram`.
  - `superRefine` kontrollerar `passes.length === weekdays.length === daysPerWeek`, unika veckodagar 1–7, kända och unika id:n per pass och 4–6 övningar per pass.
  - Sessionsschemat får `programPass` (strikt, valfritt).
  - `BACKUP_SCHEMA_VERSION` = 5, och export skriver 5. Import godtar 4 och 5 eftersom ändringen bara lägger till fält.
  - "Radera all data" rensar meta redan i dag, så ingen ny kod behövs där.
- **Läsare:** `db/program.ts` med `isTrainingProgram`, `readTrainingProgram` (ogiltigt värde ger `null`) och `saveTrainingProgram`.

## Genereringsregler (`rules/programPlan.ts`, ren och deterministisk)

1. **Veckodagar:** förskjutningar från `startDate` (pass 1 = idag): 1 → [0], 2 → [0,3], 3 → [0,2,4], 4 → [0,1,3,4], 5 → [0,1,2,4,5]. Avstånden är desamma som i `weekSuggestion.ts`-mallarna.
2. **Fokus per pass:**

| Dagar | Hela kroppen / Välj åt mig | Ben & bål för löpning | Mer överkropp |
|---|---|---|---|
| 1 | Helkropp A | Helkropp A | Helkropp A |
| 2 | Helkropp A, Helkropp B | Underkropp & bål A, Helkropp B | Överkropp A, Helkropp B |
| 3 | Helkropp A, B, A | Underkropp A, Överkropp A, Underkropp B | Överkropp A, Underkropp A, Överkropp B |
| 4 | Överkropp A, Underkropp A, Överkropp B, Underkropp B | Underkropp A, Överkropp A, Underkropp B, Överkropp B | Press, Drag, Underkropp A, Överkropp A |
| 5 | Press, Drag, Ben, Överkropp, Underkropp | Underkropp A, Press, Drag, Underkropp B, Överkropp | Press, Drag, Ben, Överkropp, Underkropp |

   "Underkropp" är presetet `lower` (Underkropp & bål). "Helkropp A/B" är `wholeBody` med respektive mall.
   Invarianter:
   - Två pass på intilliggande förskjutningar, även över veckoskiftet, delar ingen primär muskel utom bål. Återanvänd `adjacent`/`overlaps`.
   - Löpraden har högst två benpass per vecka.
3. **Övningar:** `buildRoster(prefs, template, { focus, pool })`. Nytt fält `RosterContext.pool?: ReadonlySet<ExerciseId>` filtrerar `slot.candidates` i både `wholeBody` och `focusRoster` före `pickFromSlot`. Övrig policy är oförändrad. Block 1 använder `pool = beginnerSet`.
4. **Storlek och reserv:**
   - Målet är 5 övningar på nivåerna new och some, och 6 på regular. Minst 4.
   - Bålfyllnad ur urvalet räknas som giltig utan `TOP_UP_NOTE`. Etiketten blir då "Överkropp & bål".
   - Får ett pass färre än 4 ersätts hela raden med växlingen Överkropp/Underkropp, med Överkropp först vid 5 dagar så att det blir högst två bendagar.
   - Räcker inte det används Helkropp A/B växelvis.
5. **Dosering** räknas när passet öppnas, inte vid generering, med `customWorkoutPlan(ids, prefs, sessions, logs)`:
   - set från `startingSets`
   - mål från `range.start`
   - startvikt från `chooseStartingWeight`
   - historik från `trainingPlanSuggestion`

   Eftersom bara id:n lagras fungerar progression, smärtstopp ("ingen automatisk ökning") och viktregler oförändrat.
6. **Ändrad utrustning mitt i blocket:** en övning utan passande variant tas bort ur dagens plan med en informationsrad. Blir det färre än 3 övningar visar Hem "Utrustningen har ändrats" med "Gör om programmet".
7. **Nästa block:**
   - "Starta block 2" behåller passen, ger ett nytt `id` och ökar `block` med 1.
   - Byten i `NextLevelSuggestions` (`onChoose`) gäller alla pass som innehåller övningen.
   - "Gör ett nytt program" frågar om dagar och tyngdpunkt igen.
   - Från block 2 används `pool = beginnerSet` för nivån `new`, annars `focusSlots`.

## UX: avslöjande och Hem (komponentnivå)

Nya filer i `features/program/`: `ProgramReveal.tsx`, `ProgramHome.tsx`, `PassCard.tsx`, `BlockProgress.tsx`, `ProgramWeekStrip.tsx`, `WeekTick.tsx` och `ExerciseThumb.tsx`. Rutten `/program` läggs till i `App.tsx`.

- **ProgramWeekStrip** (DESIGN "Week strip"): sju 44 px-rutor för innevarande kalendervecka, måndag först, med dagförkortning och dagnummer i `.count`.
  - Idag: `today`-fyllning, ink-kontur och solikon.
  - Planerad dag: 3 px `accent`-kontur. Nästa planerade dag får `chip-upcoming` "Nästa" under remsan.
  - Dag med ett klart programpass: pennbocken i övre högra hörnet.
  - Under remsan står "Förslag: tor · lör · mån. Träna när det passar."
  - Remsan är en lista med `aria-label` per dag, till exempel "torsdag 6 november, planerat, klart".
- **BlockProgress:** fyra 44 px-rutor, V1–V4.
  - En klar vecka har en bock i `done-mark`.
  - Aktuell vecka har 3 px ink-kontur och ordet "Nu".
  - Bredvid står count-texten "5 av 12 pass".
- **PassCard lead** (`pass-card-lead`), uppifrån och ned:
  - "Nästa pass" i `accent`, plus `chip-today` "Idag" eller `chip-upcoming` "lör".
  - Titeln "Pass 2" (display, 3.75rem) och fokus "Överkropp & bål" (headline, 1.875rem).
  - Count-raden "≈ 25 min" (`estimateWorkoutMinutes`) och "5 övningar".
  - `Tally` 48 px, en cirkel per övning, med antal set.
  - Övningsrader: hela raden är en länk på minst 48 px till `/ovning/:id`. Raden har `ExerciseThumb` 64 px, namnet **utan E-kod**, "2 × 10" och "per sida" vid behov.
  - En gång överst i listan, tills första passet är klart: "2 × 10 = 2 set med 10 repetitioner. 60 s vila mellan seten."
- **PassCard receding** (`pass-card-receding`): "Därefter · Pass 3 · lör", fokus, ≈ min och `Tally` 36 px i edge, utan miniatyrer.
- **ExerciseThumb:** `Figure` i en 64 px-ruta med 2 px edge-kontur.
  - Bara lead-kortet animerar. Figuren pausas utanför vyn (IntersectionObserver) och när `document.hidden`.
  - En knapp "Pausa figurerna" på minst 48 px uppfyller WCAG 2.2.2. Valet sparas i `localStorage`.
  - Vid reducerad rörelse och på receding-kort används `stillOnly`.
- **ProgramReveal** (`/program?ny=1`, målet efter QuickStart):
  - Display "Ditt program" och "4 veckor · 3 pass i veckan · Hela kroppen".
  - "Vecka 1 av 4" i count, veckoremsan och BlockProgress.
  - Pass 1 som lead-kort, pass 2…N som receding-kort.
  - Texten "Samma pass varje vecka, så ser du att du blir starkare."
  - Fast primärknapp "Starta första passet" ovanför nav, som går till `/traning/A?program=1`. Länken "Ändra programmet" går till dagarssteget.
  - **Inga varningar, ingen "Saknas" och inga E-koder.**
- **ProgramHome** (`TrainingHome` när det finns ett program och inriktningen är `general`), uppifrån och ned:
  1. H1 "Vecka 2" i count, med "av 4".
  2. BlockProgress.
  3. Veckoremsan, med WeekTick när veckan är klar.
  4. Lead-kortet för nästa pass.
  5. Receding-kortet för passet därefter.
  6. Vilotext (`muscleRecoveryNote` på passets fokus, rådgivande).
  7. Fast primärknapp "Starta passet" i tumhöjd.
  8. "Ändra":
     - Min utrustning
     - Skapa eget pass (`/nytt-pass`)
     - Träna något annat idag (`/fokus`, räknas inte i programmet)
     - Gör om programmet
     - Bläddra bland övningar
     - Byt inriktning
     - Avsluta programmet (bekräftelse enligt mönstret i Inställningar)
  9. "Mina pass", bara om det finns sparade pass.
  10. "Senaste pass".

  Från programhemmet försvinner:
  - träningsvanan
  - "Har du ont…"
  - "Dagens fokus"
  - `WeeklyPlan`
  - "Plan framåt"

  `/vecka` omdirigerar till `/` medan ett program är aktivt. Ett pågående pass ger, som i dag, "Fortsätt passet".

  När blocket är klart visas "Blocket klart" med alla V-rutor bockade, ett lead-kort "Block 2" med primärknappen "Starta block 2", och `NextLevelSuggestions` med `onChoose`. Utan program ser Hem ut exakt som i dag.
- **Förhandsvisning med `?program=n`:**
  - Ny `lib/programQuery.ts` med vitlista: n måste vara ett heltal 1–N och dessutom nästa pass, annars visas nästa pass.
  - `draftKey` innehåller program-id och pass.
  - Planen kommer från `customWorkoutPlan`. Rubriken är "Pass 2 · Överkropp & bål" och "Vecka 2 av 4".
  - `RoutineControls` och täckningsvarningen döljs. Ändringar gäller bara dagens pass.
  - `startTrainingSession` får `options.programPass` och validerar att programmet och passet finns. All befintlig validering körs som förut.

## Onboarding

- **Stegmodell:** `Step` blir `'goal'|'rehab'|'days'|'emphasis'|'equipment'|'weights'|'level'|'pick'`.
  - `stepsFor('general', draft)` ger `goal, days, emphasis, equipment, (weights om Vikter valts), level`.
  - Fokussteget försvinner för general. Tyngdpunkten ersätter det, och onboarding sätter inte längre `bodyParts`.
  - `Draft` får `days` (förval 2, enligt PRODUCT) och `emphasis` (förval `full`). `readDraft` validerar båda.
- **Goal:** två kort.
  - "Bli starkare", med texten "Ett färdigt program på 4 veckor".
  - "Knä- eller rehabprogram", med texten "Har du ont eller en skada? Följ din vårdgivare." Kortet leder till steget `rehab`: tre kort (Knärehab AAOS, Fysioterapeutens knäprogram, Eget rehabprogram) och `DisclaimerText`. Därefter följer de befintliga rehabstegen oförändrade.
  - "Skapa eget pass" och "Har du en säkerhetskopia? Importera" blir textlänkar längst ned. Importlänken behövs eftersom nav döljs.
- **Days:** "Hur många dagar i veckan?" är **en** kontroll: en rad med fem 56 px-rutor med count-siffrorna 1–5 (radiogrupp). Fem kort hade brutit regeln om högst fyra.
  - En rådgivande ledtråd visas för valt antal, till exempel för 2: "Två pass med minst två dagars mellanrum. Passar bra bredvid löpning."
- **Emphasis:** fyra kort: Hela kroppen, Ben & bål för löpning, Mer överkropp, Vet inte – välj åt mig (= Hela kroppen).
- **Equipment:**
  - Låst rad "Alltid med: stol och vägg" (ändras i Inställningar).
  - Kort-toggles i tre grupper:
    - Vikter: Hantlar, Kettlebell, Träningsband
    - Möbler: Träningssteg
    - Fast monterat: Chinsstång, Dipsställning
  - Grupperna följer `allowedEquipment('general')`.
  - Väljs Hantlar eller Kettlebell följer delsteget `weights` med viktdelen av `EquipmentInventory`. Dela komponenten i `SupportToggles` och `WeightFields`.
- **Level:** tre kort med `levelHints`.
- **Spara:** `saveTrainingPreferences` och `saveTrainingProgram(buildProgram(...))` skrivs i **samma** `db.meta`-transaktion, sedan `navigate('/program?ny=1')`.
- **Dold nav:**
  - `QuickStart` flyttar till `/kom-igang`, som läggs i `HIDDEN_PREFIXES`.
  - `TrainingHome` omdirigerar dit när inställningar saknas. `/kom-igang` med inställningar omdirigerar till `/`.
  - Uppdatera kommentaren i `navVisibility.ts`.
- **Välkomst:**
  - Nyttomening: "Korta styrkepass hemma, anpassade efter din utrustning."
  - Stoppbesked: "Avbryt vid skarp smärta, svullnad eller om en led låser sig." (samma ordval som `copy.stopAbortPainHint`).
  - `DisclaimerText` ligger hopfälld under "Om Stomme och säkerhet".
  - Integritet och färger står kvar. "Så läser du antal" flyttas till passlistan.

## Biblioteket (`features/library/ExerciseLibrary.tsx`)

- Med ett program öppnar sidan med avsnittet "Ditt program", där övningarna är grupperade per pass (h3 "Pass 1 · Helkropp"). "Alla övningar" följer under.
- `ExerciseFilterControls`, `SortSelect` och `ResultViewSwitch` läggs bakom knappen "Filtrera" (`aria-expanded`).
  - Panelen är öppen när URL:en redan har filter.
  - AAOS-länken flyttar in i panelen.
- "Granska alla övningar" tas bort från biblioteket. `/granska` finns kvar som rutt, och länken i `Settings.tsx` flyttas till en hopfälld "Granskning (för testare)" längst ned.
- E-koderna tas bort i `ExerciseResults.tsx`, `ExercisePicker.tsx` och `ProgressOverview.tsx`. De behålls i `PhysioReport`, `RehabCollection` och granskningsläget i `ExerciseCard`.

## Rörelse

- **Veckobock** (`WeekTick.tsx`):
  - Ett brett handritat avsmalnande penndrag i samma familj som `PencilTick` (viewBox ca 320×48), lagt över `ProgramWeekStrip` med `fill: var(--done-mark)`.
  - Draget ritas med clip-path-svep från vänster till höger: 720 ms, `cubic-bezier(0.16, 1, 0.3, 1)`, samma kurva som `.tick-new`. Därefter ritas V-rutans bock (`.tick-new`, 480 ms, 120 ms fördröjning).
  - Animationen körs en gång per `(program.id, vecka)`, när Hem monteras efter att veckans sista pass är klart. Flaggan `stomme.program.weekTick` ligger i `localStorage` (bara på enheten, inte i backup).
  - Bocken står sedan kvar statiskt med `chip-done` "Vecka 1 klar" tills nästa pass startas. Färgen är aldrig ensam.
- **Reducerad rörelse:** inget svep, bocken syns direkt (media query som för `.tick-new`), och figurerna använder `stillOnly`.
- `done` används bara till bockar och "Klar". Nästa och planerat använder `accent`, idag använder `today`. Inga skuggor eller gradienter.

## P3: enhetlighet

- **`ui/ChoiceCard.tsx`:** ett `<label>` med 3 px kontur kring en **äkta**, visuellt dold `<input type="checkbox|radio">`.
  - Kontur i edge. Valt läge: `accent`-kontur, bockikon och fet text.
  - Roll och namn är oförändrade, så e2e-väljarna `getByRole('checkbox', { name })` fortsätter att fungera.
  - Används i QuickStart, `RegionChecklist`, `EquipmentInventory`, `FocusPicker` och radioknapparna i `TrainingSetup`.
- **Verb:**
  - "Starta passet" och "Starta kortpasset" ersätter "Börja passet" och "Börja kortpasset".
  - QuickStart för general slutar med "Visa mitt program".
  - Rehabknapparnas texter ändras inte.
- **Länkar:** `ui/link.ts` `linkClass` = ink, fet, understruken (2 px, offset 4). Länkar med `text-accent` ersätts, eftersom accent betyder val, nästa och info.
- **"3 × 10":** förklaringsraden ovan visas i `ReadyWorkout` och på passkorten.

## Säkerhet (får inte ändras)

- **Rehab:** följande är orört:
  - tidig retur i `buildRoster`
  - rehabgrenen i `defaultPlan`
  - AAOS- och fysioplanerna
  - `startReadiness`
  - rehabincheckningar (`/kansla/:id/before`)
  - `PainValve`, "Avbryt – det gör ont" och `StopScreen`

  `buildProgram` returnerar `null` för rehab, och programhemmet visas aldrig för rehab.
- Grindarna i `TrainingPreview` är enda startvägen. Hem och avslöjandet länkar bara. `startTrainingSession` validerar `programPass` utöver den befintliga valideringen, aldrig i stället för den.
- **Urvalet utesluter:**
  - `rehabAdditionIds`
  - `rehabImpactExercises`
  - `group: ballistic`
  - knäövningarna E90–E98
  - `needs-fix`

  Alla val går via `pickFromSlot` (utrustning, registrerad vikt, nivåfönster).
- Progressionen är oförändrad: `trainingPlanSuggestion`, hålla tillbaka efter "gjorde ont", ingen automatisk viktökning.
- Veckodagar och vila är rådgivande och blockerar aldrig. Ingen text om missade pass, inga streaks och inga mörka mönster.
- Stoppbeskedet står kvar på välkomsten. `DisclaimerText` finns kvar i Inställningar, hopfälld på välkomsten och på rehabsteget. Ventilen "Det gör ont" finns i varje pass.
- Täckningsvarningen räknas på muskler: rygg som primär = drag, bröst/triceps/axlar = press. Den visas fortfarande för fria A/B-pass och helkroppspass och döljs bara för programpass, där testet i T1 garanterar täckningen.

## Uppgifter i ordning

### T1. Nybörjarurval (Opus väljer och skriver testet)
- **Fil:** ny `content/beginnerSet.ts` med `beginnerExerciseIds: ReadonlySet<ExerciseId>`, 20–25 id:n, och en kort motivering per id i en kommentar.
- **Kriterier:**
  - Allt i säkerhetslistans uteslutningar är uteslutet.
  - `risk: normal` föredras.
  - `risk: high` tillåts bara om alla tre gäller:
    - risken beror på belastning eller knälast, inte ballistik
    - det finns minst en granskning av text och animation med `result: ok` efter senaste rättningen
    - `openIssues` beskriver inget sakfel
  - Övningen har minst en variant på nivån `basic` och kontrollerat tempo (`repTempo`).
  - Varje fokus (full, lower, upper, push, pull) går att fylla med bara kroppsvikt, stol och vägg.
  - Hantel- och kettlebellövningar ingår för den som har vikter (PRODUCT: 2×5 kg, 2×10 kg, 16 kg).
- **Utgångsförslag** (Opus bekräftar mot loggen): goblet-chair-squat, glute-bridge, split-squat, reverse-lunge, calf-raise, wall-sit, wall-push-up, knee-push-up, push-up, back-extension, bird-dog, dead-bug, plank, side-plank, plank-arm-lift, supported-row, floor-press, shoulder-press, lateral-raise, hammer-curl, triceps-kickback, dumbbell-rdl, farmer-carry, suitcase-carry.
- **Test** `content/beginnerSet.test.ts` (läser loggen som `exerciseAudit.test.ts` gör):
  - storleken är 20–25, uteslutningarna gäller och ingen övning är `needs-fix`
  - för varje nivå × tyngdpunkt × 1–5 dagar, både med standardutrustning och med PRODUCT-vikterna: varje pass har 4–6 övningar, alla ur urvalet
  - varje helkroppspass täcker ben, press, rygg och bål enligt den muskelbaserade täckningen (`rules/coverage.ts`, delas med `ReadyWorkout`)

Klart när testet är grönt och Opus har skrivit urvalet. Urvalet är **inte** ett godkännande (se Granskningsloggen).

### T2. Generatorn (Sonnet, 100 % grentäckning i `src/rules`)
- **Kod:**
  - `RosterContext.pool` i `programRosters.ts`
  - `rules/programPlan.ts`: `programFocusPlan`, `weekdaysFor`, `buildProgram`
  - `rules/programProgress.ts`: `programProgress` → `{done, week, nextPass, blockDone, weekJustDone}`
  - `rules/coverage.ts`: muskelbaserad täckning
- **Tester:**
  - hela tabellen
  - grannar utan överlapp på icke-bålmuskler, även över veckoskiftet
  - löpraden har högst två benpass
  - reservkedjan för kroppsvikt
  - pass 1 = idag för varje veckodag
  - sekvensen vid avbrutet pass och kortpass
  - `blockDone` vid 4N
  - rehab ger `null`
  - utan `pool` blir resultatet detsamma som i dag (ögonblicksbild av `buildRoster`)

### T3. Data och backup (Sonnet)
- **Kod:**
  - typerna, samt `'trainingProgram'` i `MetaEntry.key`
  - `db/program.ts`
  - `options.programPass` i `startTrainingSession`
  - `backup.ts`: schema v5 (godtar 4 och 5), meta-schemat och sessionens `programPass`
- **Tester:**
  - `db/program.test.ts`: läsaren förkastar ogiltiga värden
  - `db/backup.test.ts`: rundtur, avslag för för många pass, dubbla dagar, okänd övning och okänd nyckel, samt import av v4
  - `db/wipe.test.ts`
  - `db/training.test.ts`: `programPass` sparas och ogiltigt pass avslås

### T4. Förhandsvisning och `ReadyWorkout` (Sonnet)
- **Kod:**
  - `?program=n` (`lib/programQuery.ts`, vitlista) och programgrenen i `TrainingPreview`, enligt UX.
  - `ReadyWorkout`:
    - inga E-koder
    - täckningen räknas med `rules/coverage.ts` och döljs för programpass
    - utan klar historik står "Startförslag för din nivå. Ändra före start om det behövs." i stället för "Antal bygger på…"
    - förklaringen av "3 × 10"
  - Byt namn på E01 till "Sitta ner och resa sig från stol". "(goblet)" behålls i variant- och lastetiketten. Logga ändringen enligt Granskningsloggen. **Sonnet eller Opus gör det, inte Haiku**, som saknar tillåtet `fixer`-id.
- **Tester:**
  - `ReadyWorkout.test.tsx`: ingen "Saknas" för något genererat pass, inga E-koder
  - `previewNumbers.test.tsx`: uppdatera E-kodstestet
  - `programPreview.test.tsx`: fel `n` ger nästa pass, start sparar `programPass`, `RoutineControls` är dold
  - `copy.test.ts`

### T5. UI-delar och rörelse (Sonnet)
- **Kod:** `ChoiceCard`, `linkClass`, `ProgramWeekStrip`, `BlockProgress`, `PassCard` (lead och receding), `ExerciseThumb`, `WeekTick`, samt CSS för `.week-tick-new` med media query för reducerad rörelse.
- **Tester:**
  - rendering och `aria-label` för remsan och BlockProgress
  - WeekTick animerar en gång per flagga och står statiskt vid reducerad rörelse (mocka `matchMedia`)
  - pausknappen
  - `ChoiceCard` behåller rollen checkbox/radio och sitt namn
  - `npm test` (kontrastgrinden) om något token rörs, vilket inte är meningen

### T6. Avslöjandet och de nya stegen (Sonnet)
- **Kod:**
  - `ProgramReveal` på `/program`.
  - Stegen `days` och `emphasis` i QuickStart direkt efter `goal`. Befintlig utrustning och nivå behålls tills vidare.
  - Spara i en transaktion och navigera till `/program?ny=1`.
- **Tester:**
  - `quickStartModel.test.ts`: steg och `readDraft`
  - `quickStart.test.tsx`: programmet sparas och användaren landar på avslöjandet
  - `programReveal.test.tsx`: "Vecka 1 av 4", pass 1 som lead, inga varningar eller E-koder, knappens mål

### T7. Hem (Sonnet)
- **Kod:**
  - `ProgramHome` i `TrainingHome` enligt UX
  - `/vecka` omdirigerar
  - "Mina pass" döljs när listan är tom
  - "Ändra" byggs om
  - blockslutet med `NextLevelSuggestions` och nästa block
  - "Gör om programmet" och "Avsluta programmet"
  - historiken (`features/history/labels.tsx`) visar "Pass 2 · Vecka 1"
- **Tester:**
  - `programHome.test.tsx`: nästa pass efter avbrutet pass, kortpass räknas, blockslut, utrustningsbyte, pågående pass
  - `homeOwnWorkouts.test.tsx`
  - `physioFlow.test.tsx`: rehab ser aldrig programmet

### T8. Onboarding i sin helhet (Sonnet, Opus granskar copyn)
- **Kod:** två mål plus rehabsteget, grupperade utrustningskort plus `weights`, nivåkort, `/kom-igang` med dold nav och importlänk, samt välkomstcopyn.
- **Tester:**
  - `quickStart.test.tsx`
  - `Onboarding`-test: en nyttomening, stoppbeskedet, disclaimern hopfälld
  - `navVisibility`-test
  - rehabtesterna som går genom målskärmen

### T9. Biblioteket (Sonnet)
- **Kod:** avsnittet "Ditt program", "Filtrera", `/granska` bort från biblioteket och E-koderna bort enligt ovan.
- **Tester:**
  - `ExerciseLibrary`-test: avsnittet syns bara med program, panelen är öppen när URL:en har filter
  - `library-*.spec.ts`

### T10. Enhetlighetssvep (Sonnet för `ChoiceCard`, Haiku för verb och länkar)
- **Kod:**
  - `ChoiceCard` i `RegionChecklist`, `EquipmentInventory`, `FocusPicker` och `TrainingSetup`
  - verben: grep på `Börja passet`, `Visa nästa pass` och `Starta pass`
  - länkarna: grep på `text-accent underline`
- **Tester:** berörda komponenttester och `EquipmentInventory.test.tsx`.

### T11. E2E (Sonnet)
- `tests/e2e/flow.ts` `quickStart` får de nya stegen (dagar, tyngdpunkt) och väntar på `/program`. För gamla specar går hjälparen vidare till `#/traning/A`, så de flesta specar behöver bara den nya hjälparen.
- Ny `tests/e2e/ditt-program.spec.ts`:
  - viewport 320x640, 390x844 och 360x640 med 130 %, ljust och mörkt
  - hela vägen från onboarding via avslöjandet till "Starta passet"
  - veckobocken
  - reducerad rörelse
- `no-dead-scroll.spec.ts`: `/kom-igang`, `/program` och programhemmet.
- `first-run-nav.spec.ts`: nav är dold under onboarding.

### T12. Säkerhetsgranskning (Opus, reviewer-lotta)
Granska:
- urvalet mot loggen
- att rehab hålls isolerat
- att startgrinden är enda vägen in
- att copyn är rådgivande
- stoppbeskedet på välkomsten
- att täckningsvarningen finns kvar för fria pass
- backupvalideringen

### T13. Docs (Haiku)
- `DESIGN.md`: två rörelser, programremsan och BlockProgress, `ChoiceCard`, länkfärgen och miniatyrerna.
- `PRODUCT.md`: en rad under Capabilities.
- `docs/next-plan.md`: en rad.

Kör `npm run check`, `test:cov`, `build`, `audit:fingerprints` och relevanta Playwright-specar. Granska riktiga skärmbilder vid 320 och 390 px.

## Granskningsloggen

- **Inga figurändringar planeras.** Miniatyrerna använder `Figure` som den är, så inget fingeravtryck ändras, och `npm run audit:fingerprints` ska vara tomt i T11. Ändras ändå en figur gäller AGENTS.md: post i `fixes`, ny status och `--write` i samma commit.
- **E01:s namn är en ändring av övningstexten.** I samma commit:
  - uppdatera `name` i loggen
  - lägg till en post i `fixes` (`claude-sonnet` eller `claude-opus`)
  - sätt `status: fixed-awaiting-review`

  Därefter gör en Codex-modell eller `human` en granskning med `scope: text`, aldrig den som rättade.
- **Urvalet är inget godkännande.** Ingen copy får säga "granskade övningar". Rekommendation: lägg urvalets id:n först i kommande granskningsomgångar, eftersom nybörjare nu ser figurerna som miniatyrer.

## Risker

- **E2E-ytan:** de flesta specar går via `quickStart`. Hjälparen ändras på ett ställe, och `ChoiceCard` behåller rollerna.
- **Prestanda:** varje `Figure` renderar om varje bildruta. Bara lead-kortet animerar, med IntersectionObserver och paus. Testa på en riktig Android-telefon och fall tillbaka på `stillOnly` vid behov.
- **Hemmets höjd** vid 360x640 och 130 % med miniatyrer. Den fasta knappen och `no-dead-scroll` skyddar.
- **`TrainingPreview` är stor.** Programläget läggs till som en ny gren, och befintlig kod flyttas inte.
- **Täckningstestet i T1 är skört** när slots ändras. Det är avsiktligt, eftersom det skyddar regeln om ingen "Saknas".
- **Dold nav under onboarding** går emot ett tidigare beslut (`navVisibility.ts`). Importlänken behövs därför.
- **"Jag förstår" på välkomsten** gäller nu mindre text. Disclaimern finns kvar men är hopfälld. Opus granskar i T12.
- **Fem dagar för löpare** ger hög total belastning. Tabellen har högst två bendagar, ledtråden är rådgivande och 2 är förval.

## Öppna frågor (förval inom hakparentes)

1. Leder Hems "Starta passet" till förhandsvisningen? [Ja. Förhandsvisningen är startskärmen, med knappen på samma ställe]
2. Visar veckoremsan kalenderveckan (måndag först) eller programveckan? [Kalenderveckan. Blockets framsteg visas i BlockProgress]
3. Ett fjärde tyngdpunktskort, "Vet inte – välj åt mig"? [Ja, det betyder Hela kroppen]
4. Räknas kortpass i programmet? [Ja, men inte i progressionen]
5. Godtas backup v4 vid import? [Ja, ändringen bara lägger till fält]
6. Sparas ändringar i förhandsvisningen i programmet? [Nej, bara för dagens pass. Byten görs vid blockets slut]
7. Vilket urval gäller i block 2? [Urvalet för nivån `new`, `focusSlots` för de andra]
8. Vad händer med `/vecka` när det finns ett program? [Omdirigera till `/`. `/fokus` nås via "Träna något annat idag" och räknas inte]
9. Vart tar `/granska`-länken vägen? [Bort från biblioteket, hopfälld i Inställningar]
10. Är stol och vägg alltid med i onboarding? [Ja, kan ändras i Inställningar]
11. Kan man ändra veckodagar i ett aktivt program? [Inte i v1. Använd "Gör om programmet"]

## Modeller

- **Opus:** T1, copygranskningen i T8 och T12.
- **Sonnet:** T2–T9, `ChoiceCard` i T10, T11, och E01-namnet i T4 (kräver tillåtet `fixer`-id).
- **Haiku:** verb och länkar i T10, samt T13.
