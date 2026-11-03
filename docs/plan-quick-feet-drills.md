# Plan: löp- och fotarbetsövningar E101–E104 ("Quick Feet")

Skriven 2026-11-03 av architect-einstein. Bara utredning, ingen kod ändrad när planen skrevs. Idén kommer från en Instagram-video (2 × 45 s per övning). Videon får inte citeras som källa och har inte setts av författaren; tolkningen bygger på en beskrivning. Repo-rot: `C:\GitRepos\Stomme`. Grep på `single-leg-lateral-hop` och `box-jump` hittar alla handskrivna listor. ID som aldrig får återanvändas: E85, E86, E89, E97.

Status: byggs

## Beslut (förval)

- **Fyra övningar, alla tidsstyrda (`unit: 'seconds'`):** E101 `fast-feet`, E102 `in-and-out-jump`, E103 `lateral-shuffle`, E104 `knee-drive`.
- **Bara bibliotek och egna pass.** De läggs inte i `generalSlots`, `focusSlots`, `movementSlots` (`levelPolicy.ts`), `rehabAdditions`, `kneeRehab`/`kneeConditioningPlan` eller fysioplanen. Inget `harderExerciseId` pekar på dem. `pickFromSlot` väljer bara bland `slot.candidates`. Ska testas.
- **Nivå `technical`, `kneeLoaded: true` och med i `rehabImpactExercises`** (`src/content/rosterSlots.ts`), som E62, E63, E99 och E100. Då döljer `pickableInProgramme` (`src/rules/pickerPolicy.ts`) dem i rehab. Inga globala smärtfilter (P1).
- **Inga nya utrustningstyper.** Ingen `plate` i `EquipmentType`/`EquipmentChoice`. Alla fyra är `bodyweight`. Viktskivorna i videon blir tejp eller en linje på golvet; texten säger att man inte ska landa på föremål. Minibandet tas inte med i v1.
- **Dosen är appens förslag, inte videons 45 s.** `{start: 20, max: 45, step: 5}` (valfri parameter `maxSeconds` i `exercise()`; övriga övningars intervall är oförändrade). Starttiden följer vald erfarenhet för alla tidsstyrda övningar via `startingSeconds(experience, range)` i `src/rules/levelPolicy.ts`: ny = start, någon = start + 2 steg, regelbunden = start + 4 steg, aldrig över `max`. För de fyra nya blir det 20 / 30 / 40 s. Gäller bara första målet utan historik (`basePlan`); rehab och reps-övningar är oförändrade. Set via `startingSets(experience, index)`, vila 60 s.
- **Vyer:** E101 och E104 bara sidovy. E102 och E103 bara frontvy (som E99).
- Instruktionerna är egna svenska sammanfattningar. Alla fyra redaktionella (utgivare `Stomme`, ingen `source`), noten börjar "Redaktionell övning utan verifierad extern källa. Dos och upplägg är appens förslag." Aldrig `orthoinfo.aaos.org`; `plyometrics.test.ts` kräver att ingen källa innehåller `aaos`.

## Gemensamt för alla fyra (kod)

- `src/domain/types.ts`: fyra id i `ExerciseId`.
- `src/content/exerciseReferences.ts`: `'fast-feet': 'E101'`, `'in-and-out-jump': 'E102'`, `'lateral-shuffle': 'E103'`, `'knee-drive': 'E104'`.
- `src/content/bodyweightExercises.ts`: id i `KNEE_LOADED_IDS` och `bodyweightIds`. Poster via `exercise(id, namn, muskeletiketter, tips, fel, lättare, 20, 'seconds')` och rader i `bodyweightDetails`.
- `src/content/exerciseMetadata.ts`: rader i `runningReasons`; id i `reviewedAt`-kedjan; `sidePolicy = 'alternating'` för `fast-feet`, `knee-drive`, `lateral-shuffle`; inget `easierExerciseId`.
- `src/content/exerciseAliases.ts`, `src/content/muscles.ts` (`exerciseMuscles`), `rosterSlots.ts` (`rehabImpactExercises`).
- Ingen sidokö (`perSide` false). Ingen ändring i `repTempo.ts`.

## E101 Snabba fötter (`fast-feet`)
- Muskler: primära `['calves']`, sekundära `['quads','hip-flexors','core']`, `qualities: []`. Etiketter `['Vader','Framsida lår','Höftböjare','Bål']`.
- `reason`: "Snabba, korta fotisättningar kräver rytm och kontroll av fot och vad."
- Tips: 1 "Stå med fötterna ungefär höftbrett, lätt böjda knän och vikten på framfötterna. Ha halkfritt underlag och fritt omkring dig." 2 "Trippa snabbt på stället med korta, låga steg, en fot i taget. Lyft fötterna bara några centimeter och låt armarna pendla med." 3 "Håll överkroppen upprätt och fortsätt i jämnt, snabbt tempo under tiden som visas. Sänk tempot om stegen blir tunga eller ojämna."
- Vanligt fel: "Stegen blir höga och tunga, eller du landar på hälarna."
- Lättare: "Trippa långsammare, eller gå på stället med fötterna nära golvet."
- Not: "Redaktionell övning utan verifierad extern källa. Dos och upplägg är appens förslag. Korta, snabba steg på stället utan extra vikt. Tiden gäller båda benen tillsammans. Avbryt vid smärta i knä, fot eller vad. Har du ont eller en skada: välj Knärehab eller följ din vårdgivare."
- `runningReasons`: "Snabba fotisättningar och rytm." Alias: `Fast feet`, `Quick feet`, `Snabba fotsteg`, `Trippning`.
- Animation (sidovy): ny `fastFeet(t)` i `bodyweightPoses.ts`: stående på framfötter, `lift_R = 8·clamp(1−2t)` och `lift_L = 8·clamp(2t−1)`; knän via `joint(hip, ankel, 36, 34, -1)`; armar med konstanta längder som pendlar motsatt benen. `motion: 'ballistic'`. Reducerad rörelse: Start och Slut (t=0 och t=1 olika).

## E102 Hopp in och ut (`in-and-out-jump`)
- Muskler: primära `['calves','quads','glutes']`, sekundära `['hip-abductors','hip-adductors','core']`, `qualities: ['power']`. Etiketter `['Vader','Framsida lår','Säte','Sidan av höften','Insida lår','Bål']`.
- `reason`: "Upprepade hopp mellan smal och bred fotställning kräver mjuka landningar och knäkontroll."
- `cue`: "Tejp eller en linje på golvet som markering. Lägg inga föremål där du landar."
- Tips: 1 "Sätt två markeringar på golvet, till exempel tejp, en bit utanför höftbredd. Stå med fötterna ihop mellan dem på halkfritt underlag." 2 "Hoppa lätt så att fötterna landar brett utanför markeringarna, och hoppa sedan tillbaka in mellan dem. Landa mjukt på framfötterna med knäna i samma riktning som tårna." 3 "Fortsätt in och ut i jämn takt under tiden som visas. Hoppa inte upp på markeringarna och pausa om landningarna blir hårda."
- Vanligt fel: "Knäna faller inåt när du landar brett, eller du landar med raka ben."
- Lättare: "Kliv ut och in en fot i taget utan hopp, eller gör mindre hopp."
- Not: redaktionell inledning + "Små hopp mellan smal och bred fotställning. Ingen extra vikt. Landa aldrig på föremål. Avbryt vid smärta i knä, fot eller vad. Har du ont eller en skada: välj Knärehab eller följ din vårdgivare."
- `runningReasons`: "Mjuka landningar och fotarbete i sidled." Alias: `In and out jumps`, `In-out jumps`, `Plate in and out`, `Hopp brett och smalt`.
- Animation (bara frontvy): id i `supportedFrontViews` och `FRONT_ONLY` (`frontViews.tsx`), gren i `frontMovementPose`. t=0 fötterna ihop mellan markeringarna, t=1 brett utanför. Lyft `10·sin(πt)` på båda fötterna. Knän via `joint(hip, ankel, 36, 34, ±1)` med knät utåt mot tårna, aldrig inåt. Konstant bål och armar. Markeringar i `FrontFigureFrame`: två låga streck på golvet (`data-support="floor-marker"`), placerade så att tår/anklar på golvet aldrig ligger inom en markering (±10 px). Enkel sidovy som reserv i `bodyweightPoses.ts` (handlers är en `Record<BodyweightId, …>`). Reducerad rörelse: Start (in) och Slut (ut).

## E103 Sidoförflyttning över linje (`lateral-shuffle`)
- Muskler: primära `['hip-abductors','quads','glutes']`, sekundära `['calves','hip-adductors','core']`, `qualities: []`. Etiketter `['Sidan av höften','Framsida lår','Säte','Vader','Insida lår','Bål']`.
- `reason`: "Snabba riktningsbyten i sidled kräver balans och kontroll av knät." `cue`: som E102.
- Tips: 1 "Sätt en markering på golvet, till exempel en tejpbit, och ställ dig bredvid den i lätt knäböj med fötterna ungefär axelbrett och vikten på framfötterna." 2 "Ta snabba sidosteg över markeringen. Kliv först med foten närmast rörelseriktningen och låt den andra följa efter, utan att fötterna korsar varandra." 3 "Byt riktning på andra sidan och fortsätt fram och tillbaka under tiden som visas. Kliv över markeringen, inte upp på den."
- Vanligt fel: "Fötterna korsar varandra eller knät faller inåt när du byter riktning."
- Lättare: "Ta långsammare sidosteg utan studs och stanna kort vid varje riktningsbyte."
- Not: redaktionell inledning + "Sidosteg fram och tillbaka över en linje, alltid en fot i golvet. Ingen extra vikt. Kliv aldrig upp på föremål. Avbryt vid smärta i knä, fot eller vad. Har du ont eller en skada: välj Knärehab eller följ din vårdgivare."
- `runningReasons`: "Fotarbete och riktningsbyten i sidled." Alias: `Lateral shuffle`, `Plate shuffle`, `Shuffle`, `Sidosteg`.
- Animation (bara frontvy): höften går från ca x 70 till x 130 under t 0→1. Första halvan kliver ledande foten över linjen, andra halvan följer den andra. Vid t=0,5 står fötterna på var sin sida om linjen; de korsar aldrig och en fot är alltid i golvet. Ping-pong-tiden ger automatiskt förflyttning åt andra hållet. Linjen ritas som `hop-line` i E99 (`data-contact-plane="shuffle-line"`). Ingen fot i golvet inom ±4 px från linjen. Stegbredd ca 32–60 px. Sidovy som reserv. Reducerad rörelse: Start och Slut.

## E104 Höga knän på stället (`knee-drive`)
- Muskler: primära `['hip-flexors','calves']`, sekundära `['quads','glutes','core']`, `qualities: []`. Etiketter `['Höftböjare','Vader','Framsida lår','Säte','Bål']`.
- `reason`: "Snabba växelvisa knälyft kräver koordination, hållning och mjuka fotisättningar."
- Tips: 1 "Stå upprätt med fötterna höftbrett och armarna böjda som när du springer. Ha halkfritt underlag." 2 "Lyft ett knä i taget framåt och uppåt mot höfthöjd i ett snabbt löpsteg och sätt ned foten under höften på framfoten. Armarna pendlar motsatt benen." 3 "Växla ben i jämn takt under tiden som visas med överkroppen upprätt. Sänk knälyften om du lutar dig bakåt eller tappar rytmen."
- Vanligt fel: "Överkroppen lutar bakåt, eller du landar tungt på hälen."
- Lättare: "Gå på stället med höga knän utan studs, ett ben i taget."
- Not: redaktionell inledning + "Växelvisa knälyft på stället utan extra vikt. Tiden gäller båda benen tillsammans. Avbryt vid smärta i knä, höft, fot eller vad. Har du ont eller en skada: välj Knärehab eller följ din vårdgivare."
- `runningReasons`: "Knälyft och armföring som i löpsteget." Alias: `Knee drives`, `High knees`, `Knälyft`, `Knädriv`.
- Animation (sidovy): `kneeDrive(t)` med samma ping-pong-mönster som E101. Det lyfta benet med polärkoordinater (`polar(hip, 36, θ)`, `polar(knä, 34, φ)`): låret upp mot vågrätt, underbenet hänger. Stödbenet via `joint` med ankeln på y=174. Armar pendlar motsatt med konstant längd. `motion: 'ballistic'`.

## Fynd som måste åtgärdas

1. **Timerkopian är fel för tidsstyrd rörelse.** `SetScreen.tsx` (~rad 105) sätter `movingTimed` bara för `heel-slide` och `mountain-climber`. Alla andra tidsövningar visar "Hålltid", "Håll tills signalen …" och rösten "Börja hålla." / "Klart. Släpp positionen." (`src/lib/useTimedHold.ts`, ~rad 111 och 117). Gäller redan E99 och skulle gälla alla fyra nya. Åtgärd: ersätt hårdkodningen med en tabell i innehållet (t.ex. `timedMovementCue: Partial<Record<ExerciseId, string>>` i `src/content/`) med en rad per övning under pågående tid, och en neutral startröst "Börja rörelsen." för de nya (och E99). Heel-slide och mountain climber behåller sina texter. Plank, wall-sit, side-plank oförändrade "Hålltid". Nya tester krävs.
2. **`tests/e2e/review.spec.ts` är röd på main:** listan `codes` har 91 koder men katalogen 96, så `toHaveCount(codes.length)` faller i mobilläget; i skrivbordsläget matchar `new RegExp('^E10')` både E10 och E100 (med E101–E104 sex länkar). Åtgärd: hämta koderna från `exerciseReferences`, sortera med `compareReferences` och förankra mönstret: `` new RegExp(`^${code}(?!\\d)`) ``.
3. **Hårdkodade antal och listor:** `src/content/content.test.ts` (96 → 100), `exerciseMetadata.test.ts` (integritetslistan), `plyometrics.test.ts` "review ordering" `.slice(-3)` (byt till kontroll att E100 < E101 och att sista koden är E104).
4. **Tre listor för frontvyer:** `FRONT_ONLY` (`frontViews.tsx`), `NO_SIDE_VIEW` i både `figureGeometry.test.ts` och `auditFingerprint.ts`, samt `devView` i `FigureDev.tsx`. Exportera `FRONT_ONLY` och läs den på de andra ställena. Befintliga fingeravtryck påverkas inte.
5. **Sidonotering:** E99 och E100 står i loggen som `unreviewed` utan `fixes`. Fyll i i efterhand bara om git-historiken visar vem som byggde dem. Hitta aldrig på en granskare.

## Säkerhet

- Alla fyra är ballistiska. Ingen får finnas i rehabprogram. `rehabImpactExercises` styr väljarna (`TrainingPreview.tsx`, biblioteket och egna rehabpass) via `pickableInProgramme`.
- Vanliga pass har inga globala smärtfilter. Skydd: (1) "Det gör ont"-ventilen per övning (`Runner.tsx` visar `easierOption`/`easierVariant`), därför är lättare-texterna obligatoriska och konkreta; (2) noten med "Avbryt vid smärta …" och hänvisning till Knärehab; (3) nivån `technical` ("Kräver god teknik"); (4) att övningarna saknas i alla rosters.
- Ingen landning på föremål, halkfritt underlag och fritt omkring sig. Inget band i v1 (snubbelrisk). Texterna lovar inga effekter och ställer ingen diagnos. Använd "Tränar …".

## Granskningslogg

Utan en post per katalog-id faller `exerciseAudit.test.ts`. Lägg fyra poster sist (efter `box-jump`) med `"fingerprint": ""`, kör `npm run audit:fingerprints -- --write` (uppdaterar bara befintliga poster) och därefter `npm run test`. Status `fixed-awaiting-review` med byggaren som `fixer` (id `claude-sonnet`). Aldrig `approved`. Form (exempel fast-feet): `{ id, name:"Snabba fötter", group:"ballistic", risk:"high", status:"fixed-awaiting-review", reviews:[], fixes:[{date, fixer:"claude-sonnet", notes:"Ny övning E101: text, metadata och sidofigur (ballistic). Redaktionell, ingen extern källa."}], openIssues:[], notes:["Från docs/plan-quick-feet-drills.md. Godkänns helst av codex eller human, aldrig av byggaren."], fingerprint:"" }`. Samma för in-and-out-jump ("Hopp in och ut", E102 frontvy med golvmarkeringar och sidovy som reserv), lateral-shuffle ("Sidoförflyttning över linje", E103), knee-drive ("Höga knän på stället", E104). När figurer ändras: ny rättning och `--write` igen. Om E99:s timertext ändras: rad i `notes` på `single-leg-lateral-hop`.

## Uppgifter

| # | Uppgift | Modell | Klart när |
|---|---|---|---|
| T0 | Källkontroll (NASM/ACE), bara av någon med webbåtkomst | människa | Förval: redaktionell. |
| T1 | Rätta `review.spec.ts` (fynd 2) | Haiku | Specen grön i båda lägena före de nya övningarna. |
| T2 | Innehåll: typer, referenser, poster, detaljer, metadata, alias, muskler, `rehabImpactExercises`, enkla figurhanterare, räknarna i fynd 3, loggposter + `--write` | Sonnet | `npm run check` och `npm run test` gröna. `exerciseAudit.test.ts` grön. Inga nya rader i `figureGeometry.baseline.json`. |
| T3 | Timerkopia för tidsstyrd rörelse (fynd 1), med E99 | Sonnet | De sju id:na visar "Övningstid" och sin egen rad. Plank, wall-sit, side-plank oförändrade. Nytt renderings- och `useTimedHold`-test. |
| T4 | Sidofigurer E101 och E104 | Sonnet | Nytt `src/figures/quickFeetPoses.test.tsx`: konstanta segmentlängder (6 decimaler), stödfot y=174, lyft fot aldrig under golvet, t=0/t=1 spegelvända mellan benen, båda fötterna nere vid t=0,5, alla punkter inom 14..188. Ratchet utan nya rader. |
| T5 | Frontvyer E102 och E103, golvmarkeringar, export av `FRONT_ONLY` | Sonnet | `frontViews.test.tsx` och `quickFeetPoses.test.tsx`: `defaultViewFor` front, `supportedViewsFor` ['front'], konstanta längder, knät aldrig medialt om höft–ankel (E102), ingen fot i golvet inom en markering/linje, fötterna korsar aldrig (E103), en fot alltid i golvet (E103), `data-support`/`data-contact-plane` i markup. Ratchet utan nya rader. |
| T6 | Regel-, roster- och rehabtester. Uppdatera loggfingeravtryck | Sonnet | `test:cov` 100 % grenar i `src/rules`. |
| T7 | Docs: denna plan, en rad i `docs/next-plan.md`, `docs/bodyweight-catalogue.md` | Haiku | Docs stämmer med koden. |
| T8 | Säkerhets-, text- och figurgranskning | Opus | Granskningsposter (`claude-opus`) i loggen. Status förblir `fixed-awaiting-review`. |
| T9 | Slutkörning: check, alla vitest-projekt, `test:cov`, bygge, e2e (review, exercise-additions, start-focus, no-dead-scroll, muscles, bodyweight), `npm run shots:exercises` | Sonnet | Allt grönt. |

## Tester (urval)

- Nytt `src/content/quickFeet.test.ts`: referenserna E101–E104 och att E85, E86, E89, E97 är oanvända; `kneeLoaded`, `rehabImpactExercises`, nivå `technical`; `unit 'seconds'`, `perSide false`, `{20,45,5}`, `repTempo === null`, `sidePolicy`; redaktionell källa (Stomme, ingen URL, "Avbryt vid smärta", inte `aaos`); `purposes.running` finns, `purposes.knee` saknas; cue innehåller "Tejp" för E102/E103; saknas i `generalSlots`, `focusSlots`, `movementSlots`, `rehabAdditionIds`, `kneeRehabExercises`, `physioKneeItems`, `kneeConditioningPlan`; inget `harderExerciseId` pekar på dem; rostersvep som i `plyometrics.test.ts`.
- `pickerPolicy.test.ts`: rehab + nytt id utesluts, general tillåts. Utöka id-listorna i `rehabImpactGuard.test.tsx` och `ballisticRender.test.tsx`. `ExerciseLibrary.test.tsx`: sökning på "snabba fötter", "höga knän", "knee drives", "plate shuffle". E2E: `IMPACT_IDS` i `start-focus.spec.ts` får de fyra id:na.

## Risker

- Tolkningen bygger bara på en beskrivning av videon, framför allt "en fot på skivan" (E101) och "knee drives" (E104).
- Fyra nya ballistiska övningar utan globala smärtfilter; skyddet vilar på ventilen, noterna, nivån, rosterfrånvaro och rehabvakten. Därför T8.
- T3 ändrar `SetScreen` för alla tidsövningar och kan ge regressioner för hållövningar.
- Frontgeometrin i E103 är snäv; ratcheten tillåter inga nya rader.
- Många handskrivna listor; `Record<ExerciseId|BodyweightId, …>` gör typkontrollen till checklista.

## Öppna frågor (förval)

1. Viktskiva som rekvisita/utrustning? [Nej. Tejp eller linje; ny `EquipmentType` berör `EquipmentChoice`, backupens zod-enum, `EquipmentInventory` och e2e.]
2. Miniband runt anklarna? [Nej i v1 (snubbelrisk). Kräver andra variant, `FigureSpec.band` i sidovyn och bandbana i `FrontFigureFrame`; ca +1 d senare.]
3. E101 "en fot uppe på skivan"? [Snabba steg på stället utan skiva.]
4. E104 växelvis eller per ben? [Växelvisa höga knän utan medvetet hopp. Lättare: marsch.]
5. Videons 2 × 45 s? [Delvis. Starttid efter erfarenhet 20 / 30 / 40 s, max 45 s, steg 5, vila 60 s. Beslut från användaren.]
6. Rosters eller löpfokus? [Nej, bara bibliotek och egna pass.]
7. Nivå? [`technical` för alla fyra.]
8. Ny kvalitet "Snabbhet"? [Nej.]
9. `BALLISTIC_MS` per övning (valfritt, `Figure.tsx` ~rad 551)? [E101 600 ms, E104 900 ms, övriga 1100 ms.]
10. E99 med i T3? [Ja.]
11. Loggstatus? [`fixed-awaiting-review` med byggaren som fixer.]
