# Plan: plyometriska övningar E99 och E100

Skriven 2026-11-01 efter planering av architect-einstein. Idén kommer från en Instagram-video om plyometri för löpare. Videon får inte citeras som källa.
Grep på `squat-jump` och `jumping-lunge` hittar alla handskrivna listor. ID som aldrig får återanvändas: E85, E86, E89, E97.

## Beslut

- **Bygg två övningar:** E99 `single-leg-lateral-hop` (Sidohopp på ett ben) och E100 `box-jump` (Boxhopp).
- **Hopp fram och tillbaka på ett ben utelämnas.** Det är samma övning som E99 i ett annat plan (samma utrustning, dos, muskler, säkerhet och figurtyp).
- **Hjulhopp på ett ben ("single-leg wheel jumps") är pausat.** Ingen källa, inget etablerat namn, ingen bild. Inget ID reserveras.
- **Bara bibliotek.** Ingen av dem läggs i `generalSlots`, `focusSlots`, `movementSlots`, knärehab, fysioplanen eller `rehabAdditions`. Inget `harderExerciseId` pekar på dem. Nivå `technical`, `kneeLoaded: true`, medlem i `impactExercises`.
- Inga nya utrustningstyper. Boxhopp använder `step`.
- Instruktionerna är egna svenska sammanfattningar. Dosen är appens förslag, inte videons 45 s eller 10 reps.

## Källor (kontrollerade 2026-11-01)

| ID | Källa | Status |
|---|---|---|
| E100 | NASM Exercise Library, `https://www.nasm.org/resource-center/exercise-library/box-jumps` (sidan finns, rubrik "box jumps", utrustning låda/steg, nivå intermediate) | Verifiera att texten beskriver samma rörelse innan URL:en skrivs in. Annars redaktionell. |
| E99 | Ingen NASM- eller ACE-sida hittad | Redaktionell (utgivare Stomme, ingen URL), som E95 och E98 |

URL:er får aldrig hittas på.

## E99 Sidohopp på ett ben (`single-leg-lateral-hop`)

- Fil: `src/content/bodyweightExercises.ts`. Hjälpfunktionen `exercise()` sätter i dag alltid `perSide: false`. Lägg till en valfri sista parameter `sideKind?: SideKind` som sätter `perSide: true` och `sideKind`. Befintliga anrop ändras inte. Ersätt den inbyggda `kneeLoaded`-listan med ett namngivet `Set` som också innehåller de nya ID:na.
- Dos: `unit: 'seconds'`, per ben (`sideKind: 'ben'`), intervall `{start: 20, max: 30, step: 5}`. Samma modell som `side-plank`, `sidePolicy` blir `choose-side`. Takt: tidsstyrd, så `repTempo` ger `null`.
- Muskler: primära `['calves', 'hip-abductors']`, sekundära `['quads', 'glutes', 'core']`. `muscles.ts`: `qualities: ['power', 'balance']`. Etiketter `['Vader', 'Sidan av höften', 'Framsida lår', 'Säte', 'Bål']`.
- Nivå `technical`, utrustning `bodyweight`. `reason`: "Upprepade hopp och landningar på ett ben kräver balans och kontroll av knät."
- Tips: (1) Stå på det valda benet med lätt böjt knä och den andra foten lyft, tänk dig en linje på golvet bredvid foten, halkfritt underlag och fritt omkring. (2) Hoppa en kort bit åt sidan över linjen och tillbaka, landa mjukt på framfoten med knät i samma riktning som tårna och bromsa med höft och knä. (3) Fortsätt från sida till sida i jämn takt under tiden som visas, sätt ned andra foten om du tappar balansen, byt sedan ben.
- Vanligt fel: "Knät faller inåt vid landningen, eller du landar med stelt ben." Lättare: "Gör kortare hopp, eller hoppa på två fötter. Ännu lättare: stå på ett ben utan att hoppa."
- Not: "Korta hopp åt sidan med landning på samma ben. Tiden gäller per ben. Ingen extra vikt. Avbryt vid smärta i knä, fot eller vad." Redaktionell inledning: "Redaktionell övning utan verifierad extern källa. Dos och upplägg är appens förslag."
- Alias: `Single-leg lateral hops`, `Lateral hops`, `Enbens sidohopp`, `Sidohopp`.
- Sidokue (`exerciseSideCues.ts`): egen fabrik, inte `plantedFoot`. Etikett `Hoppa på ${sideWord} ben`. Förklaring `Hoppa från sida till sida på det ${sideAdjective} benet; den andra foten är lyft hela tiden.`
- Syfte: en rad i `runningReasons` ("Landning och sidokontroll på ett ben."). Ingen `kneeReasons`-rad.
- Animation: ren frontvy som `seated-tibial-rotation`. Generalisera de två `if`-raderna i `frontViews.tsx` till en lista `FRONT_ONLY`, lägg ID:t i `supportedFrontViews`. `frontMovementPose` beroende på `working`: stödbenet mot golvet, fria benet böjt med foten lyft vid stödbenets vad, höften flyttas x≈85 till x≈115, lyft 12·sin(πt), knät mer böjt vid landning, konstanta segmentlängder, två korta golvmarkeringar i `FrontFigureFrame`. Sidovypost i `bodyweightPoses.ts` krävs (enkel enbensstående med liten studs). `motion: 'ballistic'`, cykel 1,1 s. Reducerad rörelse: Start och Slut (fas 0 och 1 via `stillFramePhase`), kräver H/V-markering och "Byt sida" (`tests/e2e/exercise-additions.spec.ts`).

## E100 Boxhopp (`box-jump`)

- `bodyweightExercises.ts`: `unit: 'reps'`, `perSide: false`, `exercise(..., 3, 'reps', 5)` (`{start 3, max 5, step 1}`, inom NASM:s 3-5 repetitioner; ändrat efter granskning). Lägg i `MANUAL_REPS` i `src/rules/repTempo.ts` med kommentaren "Full återställning och nedkliv mellan hoppen; ingen fast takt."
- Muskler: primära `['quads', 'glutes', 'calves']`, sekundära `['hamstrings', 'core']`, `qualities: ['power']`. Etiketter `['Framsida lår', 'Säte', 'Vader', 'Baksida lår', 'Bål']`.
- Nivå `technical`, utrustning `step`. `reason`: "Hopp upp på en upphöjd yta kräver kraft, precision och mjuk landning."
- Lägg ett valfritt `cue?: string` i `bodyweightDetails`. Seed-koden i `exerciseMetadata.ts` (~rad 1189) ska använda `added.cue ?? <dagens text>`. Cue: "Ett lågt, stadigt steg eller en låda som inte kan glida, välta eller ge efter. Börja lågt."
- Tips: (1) Ställ ett lågt, stadigt steg eller en låda på ett halkfritt golv så att den inte kan glida eller välta, stå en kort bit framför med fötterna ungefär höftbrett. (2) Böj höfter och knän, ta fart med armarna och hoppa upp, landa mjukt med hela foten på steget och knäna i samma riktning som tårna. (3) Res dig upp helt på steget och kliv sedan ned en fot i taget. Hoppa inte ned. Upp och ned är en repetition; hitta balansen före nästa.
- Vanligt fel: "Steget är så högt att du landar i djup knäböj eller med tårna på kanten." Lättare: "Använd ett lägre steg, eller gör uppsteg utan hopp." `easierExerciseId = 'step-up'`, bara åt det hållet.
- Not: "Hopp upp, nedkliv. Steget ska vara lågt och stadigt. Ingen extra vikt. Avbryt vid smärta i knä, fot eller vad." Alias: `Box jump`, `Box jumps`, `Lådhopp`, `Hopp upp på låda`. Syfte: rad i `runningReasons` ("Explosiv benstyrka med kontrollerad landning."), ingen `kneeReasons`.
- Lägg inte till `ASK_PHYSIO` i `ExerciseCard.tsx` och inte i `SetScreen.tsx`.
- Animation (sidovy, `motion: 'sequence'`): ny hjälpfunktion i `bodyweightPoses.ts` (befintlig `squat()` behåller sitt beteende). Steg-rekvisita `{type: 'step', x≈125, y≈156, w≈44}` (ca 30 cm). Faser: 0–0,2 sänk till kvartsknäböj, 0,2–0,3 fråndrag, 0,3–0,5 flykt framåt-uppåt, 0,5–0,6 landning på steget, 0,6–0,7 res dig, 0,7–0,9 kliv ned bakåt en fot i taget, 0,9–1 stå på startplatsen. `Figure.tsx`: ersätt `squat-jump ? 4500 : 12000` med tabellen `SEQUENCE_MS` (squat-jump 4500, box-jump 5000, standard 12000), `'box-jump'` i `FRAMING` (t.ex. `'0 0 200 188'`), reducerad rörelse fyra rutor "Start" 0, "Hopp" 0,4, "Landa på steget" 0,55, "Kliv ned" 0,8. Om nedklivet blir för dyrt: hoppa över det i animationen men behåll rutan.

## Säkerhet

- `kneeLoaded: true` och `impactExercises` för båda. Lägg dem också i `IMPACT_IDS` i `tests/e2e/start-focus.spec.ts`.
- Ska aldrig vara fallback för nybörjare eller nivåbegränsade: `pickFromSlot` väljer bara bland `slot.candidates` och bålutfyllnaden bara bland bålkandidater. Så länge ID:na saknas i slots kan de inte komma in. Ska testas.
- Rehab: AAOS-urvalet filtreras på `orthoinfo.aaos.org`-URL, så källorna får aldrig vara AAOS. `rehabAdditions`, fysioplanen och `kneeConditioningPlan` är explicita listor.
- Befintlig lucka: i rehab med fokus physio eller custom tillåter väljaren i `TrainingPreview.tsx` (~rad 342 och 441) hela katalogen, alltså redan E62, E63 och burpee. Åtgärdas i steg 8 nedan.
- `docs/plan-pain-rehab-only.md` P1 vill ta bort `impactExercises` och `painOnRecord`. Bygg på `main` nu. Om P1 landar senare ska den inte radera mängden om rehabvakten använder den. Byt då namn till `jumpExercises` som ren metadata.
- Texter: inga löften om effekter, ingen diagnos, "Tränar ...", varje not säger "Avbryt vid smärta".

## Fynd som måste åtgärdas

- `src/features/exercise/ExerciseReview.tsx` (rad ~14–16) sorterar med `localeCompare` på referenssträngen, så "E100" hamnar mellan E10 och E11. Sortera numeriskt (`Number(ref.slice(1))`). Test: E98 → E99 → E100 och E10 → E11.

## Steg

1. Källkontroll (gjord, se ovan; öppna NASM-sidan för E100 och verifiera).
2. ID och typer (`types.ts` `ExerciseId`, `exerciseReferences.ts` E99 och E100, `bodyweightIds`). Typkontrollen är checklista för saknade `Record`-poster.
3. Numerisk sortering i `ExerciseReview.tsx` med test.
4. Hjälpfunktion, poster och detaljer (`sideKind`, `Set` för `kneeLoaded`, `cue`, seed-ändring, `reviewedAt` = genomförandedatum, `runningReasons`). Befintliga tester för E54–E68 och E95 ska vara oförändrade.
5. Alias, muskler, sidokue.
6. Regler: `impactExercises` (`rosterSlots.ts`) och `MANUAL_REPS` (`repTempo.ts`). Ingen ändring i `levelPolicy.ts`. 100 % grenar i `src/rules`.
7. Figurer (se ovan), `FigureDev.tsx`-listan. Granska i `/dev/figurer`.
8. Rehabvakt i väljaren: ren funktion i `src/rules/` (t.ex. `pickableInProgramme(id, preferences)`) som utesluter `impactExercises` när `programId === 'rehab'`, använd för både `allowedIds` och `compatible` i `TrainingPreview.tsx`. Testa båda grenarna.
9. Tester (se nedan).
10. E2E: `IMPACT_IDS`, kör `exercise-additions.spec.ts` och `start-focus.spec.ts`.
11. Docs: den här planen, en rad i `docs/next-plan.md`, `docs/bodyweight-catalogue.md` om den listar E62/E63.
12. Säkerhetsgranskning (reviewer).
13. Slutkörning: tsc, alla vitest-projekt, `test:cov`, biome, bygge, e2e.

## Tester

- `exerciseMetadata.test.ts`: integritetslistan får E99 och E100. Källa verifierad URL eller Stomme utan URL med "Redaktionell övning", aldrig AAOS. `purposes.knee` saknas, `purposes.running` finns. Box-jump-utrustning `[{bodyweight,1},{step,1}]`, cue innehåller "stadig". `easierExerciseId === 'step-up'`. Ingen post har `harderExerciseId` som pekar på de nya.
- `kneeStrength.test.ts`: E85, E86, E89, E97 oanvända.
- Nytt `src/content/plyometrics.test.ts`: `kneeLoaded` för båda. E99 `seconds`, `perSide`, `sideKind 'ben'`, `{20,30,5}`, `sidePolicy 'choose-side'`. E100 `{3,5,1}`, `perSide false`. Båda saknas i `generalSlots`, `focusSlots`, `movementSlots`, `rehabAdditionIds`, `kneeRehabExercises` och fysioplanen. Sidokuen säger "Hoppa på".
- `programRosters.test.ts`: för alla erfarenheter, utrustning med/utan `step`, mallarna A och B, alla fokusval och `painOnRecord` true/false: ingen roster innehåller de nya ID:na, inklusive glest fall med lättaste nivå.
- `repTempo.test.ts` (båda `null`), `favouriteSuggestions.test.ts` (`[]`), `exerciseProgression.test.ts` (inget nästa-nivå-förslag returnerar dem), `equipment.test.ts` (box-jump kräver `step`), `libraryFilters.test.ts` ("Löpstyrka" hittar båda, "en sida" och tid hittar E99).
- Steg 8: `pickerPolicy.test.ts` (rehab + impact utesluts, rehab + vanlig tillåts, general + impact tillåts).
- Figurer: `frontViews.test.tsx` (E99 `defaultViewFor` `'front'`, `supportedViewsFor` `['front']`, konstanta segmentlängder, stödfot vid golv vid t=0/1, fria benet aldrig under golv, höger/vänster spegelvända). `bodyweightPoses.test.ts` för box-jump: konstanta segmentlängder, fötter aldrig inne i stegets rektangel eller under golvet, vid t≈0,6 båda fötterna på stegets ovansida, t=0 och t=1 samma golvplats, under nedklivet når en fot golvet före den andra.
- dom: `ExerciseLibrary.test.tsx` (sökning "sidohopp" och "boxhopp"), `repCounting.test.tsx` (box-jump räknas för hand), `ballisticRender.test.tsx`, `ExerciseReview`-ordningen.
- Vitest-projekt: nya rena tester i unit (`isolate: false`) får inte använda `vi.mock` eller modultillstånd. Mockande tester läggs i egen fil, i `exclude` för unit och `include` för db i `vitest.config.ts`. Kör `--project unit --sequence.shuffle` fem gånger i rad.

## Risker

- E99 är redaktionell (ingen källa).
- Två nya impact-övningar medan `plan-pain-rehab-only` P1 vill ta bort impact-filtret.
- Ändringen i `exercise()` berör E54–E68 och E95, kör befintliga tester.
- Första treställiga ID:t (E100). Leta efter fler antaganden om `E\d{2}`.
