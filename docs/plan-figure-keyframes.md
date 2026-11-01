# Plan: nyckelrutor + IK för figurerna (pilot E96 nedsteg)

Skriven 2026-11-01. Gäller bara om piloten på `/#/dev/figurer-jamforelse` ser bättre ut än dagens figur.
Piloten ändrar ingen övning i katalogen. E96 är oförändrad.

## Vad piloten visade

- `src/figures/keyframes.ts`: nyckelrutor med lättnad, tvåbens-IK (höft-knä-fotled, axel-armbåge-handled) och `checkPoseGeometry`.
- `src/figures/stepDownKeyframes.ts`: E96 som sex nyckelrutor (fyra olika poser, hållet vid hälnedslaget och loopen sluter).
- Dagens E96 klarar inte grinden: höger och vänster ben är olika långa (63 mot 78) och den närmaste armen ändrar längd med cirka 2 enheter under rörelsen. Hälen når heller aldrig golvet, eftersom steget är 32 enheter högt (cirka hälften av benlängden).

## Steg

1. **Bestäm om vi går vidare.** Användaren tittar på piloten i mobilen. Om den inte är tydligt bättre: stopp, ta bort de tre filerna och sidan.
2. **Lyft grinden till alla figurer, utan att ändra någon figur.** Kör `checkPoseGeometry` över `movementPose(id, t)` för alla övningar i ett test som först bara loggar (allowlist med dagens avvikelser). Det ger en lista över vad som är trasigt. Ändra inget annat.
3. **Gemensamma kroppsmått.** En fil med segmentlängder (lår, underben, överarm, underarm, torso) som alla nya nyckelruteposer delar. Dagens poser har olika mått per övning.
4. **Migrera grupp för grupp**, i denna ordning (enklast och mest synliga först):
   1. Knäövningarna (E85-E98) med fot i golv eller steg: step-up, step-down, bosu-squat, split-squat, lunges.
   2. Ståendeövningar med fasta fötter: knäböj, marklyft, goblet-squat.
   3. Liggande och golv: brygga, bird dog, dead bug, planka, armhävning.
   4. Hopp och sekvenser sist (burpee, boxhopp): de har flera faser och egen tidslinje.
   Per övning: skriv nyckelrutor, lägg `xxxKeyframePose` bredvid den gamla posen, visa båda på jämförelsesidan, byt först när användaren godkänt.
5. **Byt i `movementPose`** per övning bakom en liten tabell (`id -> keyframe-funktion`). Start- och slutposen i `figures[id]` hämtas från samma funktion så att stillbilder och reducerad rörelse följer med.
6. **Grinden blir krav.** När en grupp är migrerad tas dess ID bort från allowlisten och testet blir skarpt för gruppen.
7. **Städa.** Ta bort `constrainedLegs.ts` och de handskrivna `joint`-funktionerna när inga övningar använder dem.

## Risker

- Fronten och snedvyerna (`frontViews.tsx`) är handskrivna SVG-former med egen geometri. Nyckelrutor gäller bara sidovyn. Dessa vyer migreras inte i första omgången.
- Stegets höjd och andra rekvisitor delas av flera övningar. Ändrad rekvisita ändrar alla bilder som använder den (piloten har därför egen rekvisitalista).
- Tvåbens-IK ger ingen fotledsvinkel eller bålrotation. Fot- och bålvinklar skrivs för hand per nyckelruta.
- Hälften av kvaliteten är konstnärlig. Grinden hittar ogiltiga poser, inte fula poser. Varje grupp behöver granskas av ögat på mobil, ljust och mörkt läge.
- Samma loopar i kortet som idag (`cycleProgress` med håll) måste behållas för att inte ändra tempot som texterna beskriver.
- Fler poser ger mer kod. Håll nyckelrutorna som tal, inte koordinater, och låt IK räkna.

## Vad som stannar

- `Pose`-typen och `FigureFrame`/`Figure` som renderare. Inget nytt ritsystem, inget 3D, inga nya beroenden.
- Katalogen, ID:n, texter, doser och alla användarvända beteenden.
- Frontvyer och sneda vyer (handritade) tills vidare.
- Reducerad rörelse: stillbilder som idag.
- Sidan `/#/dev/figurer-jamforelse` stannar som granskningsverktyg under migreringen och kan tas bort efteråt.
