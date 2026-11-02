# Plan: nya övningar E95, E96, E98 (E97 pausad)

Skriven 2026-11-01. Ingen kod är ändrad. Planerad av architect-einstein, källor kontrollerade efteråt.
Grep efter `diamond-push-up` (E95) och `step-up` (E96) för att hitta alla handskrivna listor.
Reserverade ID som aldrig får återanvändas: E85, E86, E89 (se `docs/knee-strength-plan.md`).

## Status och källor

| ID | Övning | Källa | Status |
|---|---|---|---|
| E95 | `blast-off-push-up` "Blast off-armhävning" | Ingen verifierad källa (NASM Plyometric Push-Up beskriver en annan övning och är struket) | Rättad 2026-11-01, redaktionell post |
| E96 | `step-down` "Nedsteg från steg" | [InStep Physiotherapy, Steps downs](https://education.instepphysio.ca/Injuries-Conditions/Knee/Exercises/Steps-downs/a~1087/article.html), text bekräftad av användaren 2026-11-01 (sidan gav 403 för oss) | Bygg |
| E98 | `seated-tibial-rotation` "Sittande skenbensrotation" | Ingen källa hittad för sittande med band | Bygg som redaktionell post (som woodchop) |
| E97 | `toe-squat` "Knäböj på tå" | Ingen källa | **Bygg inte.** Hög knäbelastning och fallrisk. Vänta på källa. |

Instagram får inte citeras. Videorna: Alexia Clark (blast off push-up), Anya Turner (knäövningarna).
Nedsteg-källan säger inget om repetitioner, så doser är appens förslag och ska märkas så.
Texterna får inte lova effekter på VMO eller knäskålens bana. Använd "Tränar ...".

## Beslutade val

- Utelämnade för att vi redan har likadana: sidouppsteg (E02 step-up), vadlyft med böjt knä (E93), tibial raise (E94), övning sex (SL isometric).
- Alla nya övningar är bara bibliotek. De får ingen plats i roster, `generalSlots`, `runningEasier` eller knärehab (`kneeRehab.ts`).
- Inga nya utrustningstyper. Inga nya ID för lättare varianter (bara text).
- Översätt inte videons text. Instruktionerna är egna sammanfattningar på svenska.

---

## E95 Blast off-armhävning (`blast-off-push-up`)

**Rättelse 2026-11-01: första versionen var fel.** Den byggdes som en explosiv, plyometrisk armhävning där händerna lämnar golvet, med NASM Plyometric Push-Up som källa. Det är fel övning. NASM-sidan beskriver inte rörelsen i videon och källhänvisningen är struken.

**Tolkning (säkerhet: ca 85 procent att händerna står kvar och kroppen färdas fram och tillbaka, ca 60 procent på exakt förlopp; bygger på bara två stillbilder).** Källan är en Instagram-video av Alexia Clark ("blast off push up", bildtext bröst, bål, axlar, triceps, framsida lår). Bild 1: på tårna, knäna böjda strax ovanför mattan, höften högt och bakåt, händerna i golvet långt framför. Bild 2: benen raka, fortfarande på tårna, låg planka med bröstet nära händerna. Händer och fötter är på samma plats i båda. Rörelsen tolkas som att benen sträcks och driver kroppen framåt och nedåt, och att hon sedan pressar tillbaka till startläget. Instagram får inte citeras och ingen verifierad sida finns, så posten är redaktionell (som woodchop och E98).

**Data**
- Namn: "Blast off-armhävning". Alias: `Blast off push-up`, `Blast-off push-up`, `Armhävning med framåtskjut`. Struket: `Plyometrisk armhävning`, `Plyo push-up`, `Explosiv armhävning`.
- Nivå `technical`, utrustning `bodyweight`, `kneeLoaded: false`.
- Dos: `exercise(..., 5, 'reps', 10)`, ett redigerbart förslag (inte NASM:s 3-5 reps).
- Muskler: primära `['chest', 'triceps']`, sekundära `['shoulders', 'core', 'quads']`, `qualities: []` (inte explosiv). Etiketter `['Bröst', 'Triceps', 'Axlar', 'Bål', 'Framsida lår']`.
- Tips:
  1. Start på tårna med händerna i golvet framför axlarna, knäna böjda strax ovanför golvet och höften bakåt.
  2. Sträck benen och för kroppen framåt och nedåt så att bröstet hamnar nära händerna, med armbågarna snett bakåt och rak bål.
  3. Pressa tillbaka till startläget med höften bakåt och knäna böjda. Fram och tillbaka är en repetition. Händer och fötter står kvar.
- Vanligt fel: "Höften sjunker i det låga läget eller axlarna glider långt förbi händerna."
- Lättare variant: "Gör en kortare rörelse framåt, eller gör vanliga armhävningar med knäna i golvet."
- Anledning: "Kroppen förs fram och tillbaka över fasta händer, vilket kräver bålkontroll och belastar handleder och axlar."
- Källa: utgivare Stomme, ingen länk. "Redaktionell övning utan verifierad extern källa för varianten. Dos och upplägg är appens förslag." Undvik vid handleds- eller axelbesvär.

**Beslut**
- Inte `impactExercises`: inget lämnar golvet och inget landas, så smärtfiltret ska inte dölja den. Handleds- och axelvarningen finns i noten. Inte i något roster.
- Inte `FIXED_REP_MS` och inte sekvensfigur: vanlig kontrollerad takt (ca 2 s framåt, 2 s tillbaka).
- Progression: länkad som tidigare från `push-up` (`diamond-push-up`, `blast-off-push-up`) och `easierExerciseId = 'push-up'`.
- Animation: `blastOffPushUp(t)` med fasta händer och tår, konstanta segmentlängder, knän över golvet. t=0 höften bakåt, t=1 låg planka. Reducerad rörelse visar start (höften bakåt) och slut (låg planka). Granskas i `/dev/figurer`.

**Tester:** pose (fasta kontakter, segmentlängder, axelrörelse, knä ovanför golv), `repTempo` (ingen fast takt), `programRosters` (inte impact, inte i roster), källa (Stomme, ingen URL), muskler inklusive quads, progressionens smärtfall.

## E96 Nedsteg från steg (`step-down`)

Stå på ett steg vänd nedåt. Böj det stående benet kontrollerat och sänk den andra hälen mot golvet.

**Data**
- Placering: `src/content/kneeStrengthExercises.ts` och `kneeStrengthMetadata.ts`, bredvid E90-E94.
- `unit: 'reps'`, `perSide: true`, `sideKind: 'ben'`, intervall `{start: 6, max: 10, step: 1}`, kroppsvikt.
- `kneeLoaded: true` är bara metadata sedan P3 (`docs/plan-pain-rehab-only.md`). Ingen smärtregel i `progression.ts` finns längre (filen är borttagen), så flaggan styr inte stopp eller progression. Stopp i vanliga pass sker via "Det gör ont" per övning.
- Nivå `practiced`. Utrustning `step`. Muskler: "Framsida lår", "Säte".
- Tips (från källan): ställ dig på ett lågt steg med ena benet stadigt, håll i väggen för stöd. Böj det stående knät kontrollerat och sänk den fria hälen. Stanna när hälen är 2-3 tum under steget, tryck tillbaka upp med det stående benet. Håll knät i linje med andra tån och låt inte rörelsen ta fart framåt.
- Vanligt fel: att falla ner snabbt eller att knät faller inåt.
- Lättare: lägre steg och handstöd.
- Källa: InStep (länk ovan). Dosen är appens förslag.
- Alias: `Step down`, `Step-down`, `Nedsteg`, `Excentriskt nedsteg`. Aliasen ska inte innehålla "step-up".

**Steg**
1. `types.ts`: id i `ExerciseId` (nära rad 92).
2. `exerciseReferences.ts`: `'step-down': 'E96'`.
3. Post i `kneeStrengthExercises.ts` och rader i `kneeStrengthMetadata.ts` (`details`: utrustning, nivå, `technicalReason`, källtitel, utgivare, URL; `reviewedAt` = genomförandedatum).
4. Länkar: `easierExerciseId: 'step-up'` på nedsteg. Sätt `harderExerciseId: 'step-down'` på step-up bara om step-up inte redan har en svårare länk (kontrollera `exerciseMetadata.ts`). Gärna `kneeReasons`-rad om kneppurpose-etiketten ska visas.
5. `exerciseAliases.ts`.
6. `muscles.ts`.
7. `exerciseSideCues.ts`: `'step-down': plantedFoot`.
8. `src/rules/levelPolicy.ts`: lägg i `limitedExercises`.
9. `ExerciseCard.tsx` (~rad 32): stegtypsanteckningen "fråga fysioterapeuten om steghöjd" gäller även nedsteg. `SetScreen.tsx` (~rad 590): avgör om steghöjdsgrenen ska gälla.
10. Figurer i `src/figures/kneeStrengthPoses.ts`: sidovy med den stående foten fast på steget och den fria hälen som sänks förbi kanten. Återanvänd stegrekvisitan från step-up (`props.tsx`, `frontViews.tsx`). Lägg i listan i `constrainedLegs.ts` (stående benet får inte krympa).
11. Docs: lägg ett avsnitt i `docs/knee-strength-plan.md` med beslut och verifierad källa.

**Tester**
- `src/content/exerciseMetadata.test.ts` och `kneeStrength.test.ts`: E96 i listorna över permanenta referenser, kontrollera intervall, `kneeLoaded`, `perSide` och att E85, E86, E89 fortfarande är oanvända.
- Ny: finns inte i `generalSlots`, `runningEasier`, `movementSlots` eller knärehablistan. Länkarna pekar på existerande id. Step-up och step-down länkade åt båda hållen.
- `src/rules/progression.test.ts`: vid `pain === 'stop'` stannar nedsteg och progredierar inte.
- `src/figures/kneeStrengthPoses.test.tsx` och `catalogue.test.tsx`: varje katalogid har en pose, och den stående foten är fast på steget.
- `ExerciseLibrary.test.tsx`: sök på "nedsteg" hittar övningen.
- `src/test/inventory.ts`: uppdatera om den listar katalogid.

---

## E98 Sittande skenbensrotation (`seated-tibial-rotation`) (redaktionell)

Sittande på stol med ett block, en kudde eller ihopvikt handduk mellan knäna och ett gummiband runt framfötterna. Rotera underbenen inåt och utåt.

**Data**
- Placering som E96. `unit: 'reps'`, `perSide: false`, intervall `{start: 10, max: 20, step: 2}`, nivå `basic`.
- `kneeLoaded: true` som förval. Den bär ingen last. `kneeLoaded` är bara metadata och styr inget, så valet påverkar inte stopp. Alternativ `false` som E94 (öppen fråga nedan).
- Utrustning: stol (`chair`) och `band`. Etiketten "Gummiband" täcker miniband. Kudde eller handduk står bara i instruktionen. Ingen ny `EquipmentType`.
- Kodändring: fältet för utrustning i `details` i `kneeStrengthMetadata.ts` måste kunna ta `EquipmentType | EquipmentType[]`. Påverkar E90-E94, så kör befintliga tester.
- Muskler: "Insida lår", "Underben". Kontrollera att nycklarna finns i `muscles.ts` (`adductors`, `tibialis` eller liknande).
- Lättare: ta bort bandet och rotera ett litet intervall utan motstånd.
- Källa: ingen. Märk som redaktionell i källanoten (som woodchop) med appens förslag på dos och upplägg. Rehab Hero "Knee Counter Rotation" är en annan övning (halvknästående, band under stortån) och ska inte citeras.
- Alias: `Tibial rotation`, `Skenbensrotation`, `Tibiarotation`.

**Steg**
Som E96 steg 1-3, 5, 6 och 8 (id i `types.ts`, `'seated-tibial-rotation': 'E98'`, post, alias, muskler, `limitedExercises`) plus gear-array-ändringen. Ingen sidokue behövs.

**Animation**
Rörelsen sker i horisontalplanet och syns inte från sidan. Bygg en frontvy i `frontViews.tsx`: sittande figur, knän ihop med en liten cirkel emellan, bandet som en ögla runt framfötterna (återanvänd slappt band-logiken i `Figure.tsx:164` om det går), fötterna vinklas in och ut. Om det tar mer än ungefär en halv dag: använd en statisk sittande pose med en pil som cue.

**Tester**
Som för E96 (referens, intervall, ej i roster eller rehab, alias hittar den, "Avbryt – det gör ont" ger `pain_stop` som för övriga övningar). Dessutom `src/rules/equipment.test.ts`: saknar "Gummiband" utan band, passar med stol och band. Pose-test för den valda varianten.

---

## E97 Knäböj på tå (`toe-squat`) (pausad, bygg inte)

Behåll bara idén i den här planen tills en källa finns. Förslag om den byggs senare: `kneeLoaded: true`, nivå `technical`, utrustning `support` (stöd alltid i cue), tydlig varning att man stannar vid smärta framtill i knät, lättare steg `half-squat` (alternativt `goblet-chair-squat`), bara bibliotek, aldrig i roster. Kräver verifierad källa före bygge.

---

## Gemensamt

**ID-ordning:** E95, E96, E98. Om E95 inte landar först: numrera om, men återanvänd aldrig E85, E86, E89. ID är permanenta när de skickats.

**Risker**
- E95 belastar handled och axel (inte impact). Därför `technical`, inte i roster, låg dos. Tolkningen bygger på två stillbilder och är osäker.
- Nedsteg liknar uppsteg. Det skiljer sig genom kontrollerad sänkning på ett ben.
- Gear-array-ändringen berör E90-E94.
- Många handskrivna id-listor (`ReadyWorkout`, `FigureDev`, `reviewedAt`, `movementSlots`). Grep på `diamond-push-up` (E95) och `step-up` (E96) och ta ställning till varje träff.
- `Record<ExerciseId, ...>` kraschar typkontrollen tills alla poster finns. Använd det som checklista.

**Öppna frågor (förval inom hakparentes)**
1. Svenskt namn på E95? ["Blast off-armhävning"]
2. Ska E95 vara roster-kandidat i `horizontal-press`? [Nej]
3. `kneeLoaded` för E98? [true]
4. Frontvy eller statisk pose för E98? [Frontvy, annars statisk]
5. Ska E96 in i `split-leg`-sloten i allmänt roster efter step-up? [Nej, bara bibliotek]

**Modeller**
- Haiku: typer, referenser, alias, muskler, sidokurser, ReadyWorkout, docs, enkla listtillägg.
- Sonnet: övningsposterna, gear-array-refaktorn, länkar, `levelPolicy`, ExerciseCard/SetScreen-noteringar, poser och figurer, nya regler- och innehållstester.
- Opus (reviewer): säkerhetsgranskning efteråt (texter, smärtregel, impact, figurernas korrekthet).
- Efter implementation: kör typkontroll, tester och bygg, och granska mobilvy vid 320 och 390 px, även reducerad rörelse.
