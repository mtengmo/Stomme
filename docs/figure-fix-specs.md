# Rättningar av figurer: specifikation per övning

Skriven 2026-11-01 efter Opus-granskning (architect-einstein) av figurrevisionen (`docs/figure-audit-status.md`, `docs/plan-figure-keyframes.md`). Alla mått är enheter i figurens koordinatsystem. Skala enligt E96-piloten: 14 enheter ≈ 19 cm, alltså ca 1,36 cm per enhet (redaktionell uppskattning). Källa för rörelsen är appens egna tips i `src/content/*`. Det som är markerat "redaktionellt" är bedömning, inte källa.

Mönster: nyckelrutor med `solveTwoBone` från `src/figures/keyframes.ts`, klonat från `src/figures/stepDownKeyframes.ts`. Konstanter: THIGH 34, SHIN 33, TORSO 40 (44 för burpee och squat-familjen), UPPER_ARM 25, FOREARM 25, NECK_TO_HEAD 15, FOOT 13. Ben böjs åt -1, armar åt +1. Rörelsetypen `controlled` spelas framåt och bakåt, så nyckelrutorna måste gå monotont från start (t=0) till topp (t=1). Bara `sequence` (burpee) loopar inom t.

## Orsaker som ger de flesta fynden

- A. `Figure.tsx:70-80` interpolerar start och slut led för led, så varje lem som roterar krymper mitt i rörelsen ("gummiben"). `constrainLegInterpolation` täcker bara sex id och bara knän.
- B. Dåliga baspositioner som all interpolation ärver: `squatBottom` (far thigh 18 mot 39), `floorBase` (far elbow 5,7 från axeln), sidoplankor och plankor där "överarmen" är en 38–48 enheter lång stolpe från axel till golv.
- C. Kontrollens luckor: bänkplattan är 4 hög i kontrollen men ritas 7 hög (`props.tsx`), ingen känd stödkontakt, ingen projektionsregel för frontvyer, asymmetri mäts bara på ruta 0, och revisionen mäter `movementPose` men `FigureFrame` skriver om armar vid utrustning (`Figure.tsx:300-371`).

## Arbetsordning (denna körning: W0–W7, W9)

W8 (global kinematisk interpolation i `Figure.tsx`) och W10–W12 (bryggor, benlyft, sidoutfall) görs INTE nu. De är riskabla eller produktbeslut och tas separat.

- **W0 Kontrollen (Sonnet):** bänkplatta 7. Stöd: `supports: {joint, prop, maxGap: 4}[]`. `allowlist[id|view][par] = skäl`. `maxLengths`/`skipDrift` för frontvy. Händer mot vägg. Mät den ritade posen (extrahera `applyEquipmentPose(id, pose, equipment)` som ren funktion). Asymmetri över alla rutor. Nytt `figureGeometry.test.ts` med en **ratchet-baslinje**: de nuvarande värsta värdena per `id|vy|segment` committas. Testet faller vid ökning eller vid ny figur över standardtolerans. Varje rättning tar bort sin egen baslinjerad.
- **W1 E94 wall-tibialis-raise:** huvud [70,58]; eR [69,97], hR [73,121], eL [67,97], hL [70,121]; båda ben `joint(hip, a, 37, 36, -1)`. Test: kontrollen ger [] med minHeadClearance 9; alla leder har x ≥ vägg.x + 3.
- **W2 E91 copenhagen-hold (`kneeStrengthPoses.ts:119-135`):** `joint(hip, eL, 46, 25, 1)`; hip = `polar(kR, 38, Math.PI - 0.25 - 0.52*(1-q))`; eR = `polar(neck, 25, -0.7)`; kL = `polar(hip, 38, 0.75)`; aR = [kR.x+12, 127], tR = [aR.x+8, 127]. Kontakten är avsiktlig (knät vilar på bänken), men foten ska inte sjunka in i plattan. Allowlist: paren kR–aR/kL–aL och aR–tR/aL–tL (böjt underben pekar bort från kameran). Test: kropp knä→höft inom 0,05 rad av höft→nacke; kR.y mellan bänk.y − 4 och bänk.y; aL och tL y ≤ 170.
- **W3 E02 step-up, sidovy (`poses.ts:157-198`):** nytt `stepUpKeyframes.ts`. Steg `{type:'step', x:104, y:159, w:44}` (19 enheter ≈ 26 cm). Planterad fotled [118,156], tåvinkel atan2(3,13). Nyckelrutor (hipX, hipY, lean, footX, footY, footAngle): t0 'Fot på steget' 92,109,0.15,86,175,0.226; t0.3 'Trycker upp' 101,103,0.12,90,168,0.6; t0.6 'Fria benet följer med' 112,94,0.08,93,148,0.4; t1 'Stående på steget' 117,90,0.03,104,146,0.25. Armar: nära målar neck+[3,46], bortre neck+[-1,46]. Tån får inte gå in i stegets hörn (toe x ≤ 105 tills toe y är 153). Koppla in i `movementPose` före generiska vägen, sätt `figures['step-up']` start/slut därifrån, ta bort 'step-up' ur `constrainedLegs.ts`. Test: kontrollen [] båda sidor över 200 rutor med props [step]; aR konstant och tR.y ≈ 159; t=0 tL.y ≈ 178, t=1 aL/tL y < 156; stegets höjd 15–22; höft-knä-fotled-vinkel vid t=0 95–120°. Uppdatera `frontViews.test.tsx` (146→159) och `constrainedLegs.test.ts`.
  **W3b step-up frontvy (`frontViews.tsx:379-436`):** underbenet är lodrätt och fast 33 (knä.x = fotled.x), låret får bara förkortas (max 36). knäY = fotledY − 33. Vald fotled y 156, tå y 159. hipY 110→92. Andra benets fotled [120,174→150]. Stegets front-rektangel y=159, höjd 18; dela rekt-logiken (`frontViews.tsx:810-823`) så att step-down får egen höjd. Test: underben konstanta, lår ≤ 36.
- **W4 E42 bench-side-plank-leg-lift (`rehabPoses.ts:83-112`, rekvisita rad ~303):** byt rekvisita till `{type:'bench', x:152, y:143, w:32}`. neck [49,147], head [35,139], hip [102,143]. Stödben: kL = mittpunkt mellan hip och aL [163,139]. Rörligt ben: längd 61,1, vinkel `mix(0.551, 0.198, t)` (slut: fotled [161.9,155] under plattan; start: tån vid golvet). Armar: eR [52,173], hR [78,173], eL [66,127], hL [88.5,140]. FRAMING `'bench-side-plank-leg-lift': '8 20 184 168'`. Sned vy (`frontViews.tsx:625-665`): neck [52,150], head [34,142], hip [106,136]; stödknä = mittpunkt hip/[163,122]; rörligt knä = hip + 29,35·unit([32,10]); underben 29,35 vinkel `mix(1.15, -0.42, t)`; eR [56,176], hR [86.4,176], eL [70,131], hL [97,145]. Test: kontrollen [] efter bänkfixen; stöd aL/tL inom bänkens band [topp−4, topp]; t=0 tR.y ≥ 175; t=1 aR/tR y ≥ 153 och x inom bänken; |neck–eR − neck–eL| ≤ 1; kontrollera `rehabPoses.test.ts:98-101`. Uppdatera FRAMING-testet från del 1 om den ändras.
- **W5 plankfamiljen (E71 plank-arm-lift, plank, armhävning, decline, mountain climber; `bodyweightPoses.ts:66-74,161-179`):** underarmsplank vinkel −2.912 (nacke ca [57.8,149]). Arm: eR = `polar(neck, 25, mix(π/2, π-0.08, lift))`, hR = `polar(eR, 23, π + mix(0, -0.08, lift))`. Bortre knä = `joint(hip, farAnkle, 32, 32, 1)` i pushUp, decline, plank och climber. Test: kontrollen [] vid 0,5 för plank, plank-arm-lift och push-up.
- **W6 E16 floor-press (`additionalPoses.ts:113-131,565-576`):** kopiera `kettlebellFloorPressPose` (`additionalPoses.ts:134-148`) för båda armar: armbåge = `polar(neck, 26, vinkel(t))`, hand = armbåge+[0,-26]; bortre arm samma med vinkel − 0.16. Koppla in i `movementPose`. Test: kontrollen [] vid 0,5; hand.x − armbåge.x = 0 för alla t; `catalogue.test.tsx:236` (eR y = 174) ska fortfarande gälla.
- **W7 E60 burpee (`bodyweightPoses.ts:359-394`):** keyframe-modul, `sequence`. Konstanter THIGH 34, SHIN 33, TORSO 44, ARM 23/23, NECK_HEAD 14. Värden (hip, lean, ankle, händer): t0 Stå [100,108], 0.05, [108,174], neck+[4,44]; t0.12 Händer i golvet [92,150], 1.1, [108,174], [134,174]; t0.18 Hoppar bak ankle [70,160]; t0.25 Plankläge [93.8,146.9], 1.152, [33.1,174], [134,174]; t0.37 Armhävning nere [98.5,162], 1.388, [33.1,174], [134,174]; t0.5 Plankläge (som 0.25); t0.56 Hoppar in (fötterna lyfta); t0.63 Händer i golvet (som 0.12); t0.75 Stå (som 0); t0.84 Upphopp hip y 88, ankle y 154, händer neck+[6,-44]; t0.92 Landning hip y 114; t1 Stå. Bortre lemmar samma IK med målförskjutning [+3,−3] (håller `bodyweightPoses.test.ts:126-130` och reducerad-rörelse-faserna vid `Figure.tsx:604-609`). Test: kontrollen [] vid 0,5 över 400 rutor; händer fasta för t i [0,12;0,63]; neck.y vid 0,37 > neck.y vid 0,25 + 15; ankle y < 165 vid 0,84.
- **W9 knäböjsfamiljen (E72 squat-curl, E73 thruster, E74 single-arm-thruster, goblet-squat, kettlebell-goblet-squat; helst även kettlebell-deadlift och dumbbell-rdl):** delad `squatFamilyPose(id, t)` (som `kettlebellFloorPressPose`). Höft lerpar [98,118]→[81,140]; lean `fromAngle(hip, 44, mix(0, 0.6))`. Ben: fasta fotleder, `solveTwoBone(hip, ankle, 30.8, 26.3, -1)`; aR [108,174], aL [86,174]. Armar: thruster IK-mål neck + lerp([13,-2],[8,-43], press), press 0 till mittpunkten, överarm 23, underarm 22, böj +1; curl eR = `polar(neck, 24, π/2-0.1)`, hR = `polar(eR, 23, mix(1.52, -0.95, 1-depth))`; goblet IK-mål neck+[13,6], 24/20, böj +1; kettlebell-goblet samma med eL=eR och hL=hR; single-arm bortre arm IK-mål neck+[-3,44]. kettlebell-deadlift: bortre knä genom IK, slutarmar hand [102,121]; samma omskrivning av `hinge`. Test: kontrollen [] vid 0,5; fotleder konstanta; i botten hip.y ≥ knä.y − 10; thruster rack |hR − (neck+[13,-2])| < 0,5, t=1 hR.y ≤ head.y − 15 och |hR.x − neck.x| ≤ 12; kontrollera `thrusterGeometry.test.ts`.
- **E96-texten:** tipset "Håll i väggen för stöd" stämmer inte med räcket i figuren. Ändra texten till att nämna vägg eller ledstång/räcke ("Håll i väggen eller ett räcke för stöd"). Redaktionell kopia, ingen ny källa.

## Gemensamma tester och ordning

- Kör hela `npm run test:cov` efter varje del. Tidigare körningar i den här sessionen gav spridda fel när flera agenter körde parallellt (resurskonflikt); en ensam körning gav 142 filer, 2365 tester och 100 % grenar.
- En commit per övning (och per W-del), uppdatera `docs/figure-audit-status.md` i varje commit med SHA.
- Ändra aldrig övningens id, E-nummer, text (utom ovan), dos, säkerhetsflaggor eller urval. Bara figurer, ramar, rekvisita, kontrollen och deras tester.
- Granska varje ny figur på 390 px (ljust och mörkt) och verifiera både höger och vänster sida.

## Toleranser när kontrollen blir blockerande (efter alla rättningar)

| Grupp | Segmentdrift | Asymmetri nära/bortre |
|---|---|---|
| Bål (huvud–nacke, nacke–höft), alla vyer | 0,5 | – |
| IK/nyckelrutemoduler (step-up, step-down, burpee, knäböjsfamiljen, plank) | 0,5 | 0,5 |
| Generisk interpolation, sidovy, efter W8 | 1,0 | 1,5 |
| Liggande/sittande | 1,0 | 2,0 + allowlist |
| Sned vy | 1,0 | 3,0 |
| Front: underben och armar | 1,0 | 3,0 (bara tvåsidiga övningar) |
| Front: lår | bara maxlängd (≤ vila + 0,5) | hoppa över |
| Håll | – | som sidovy + allowlist |

## Öppna beslut (förval)

Stegupp-steg 19 enheter (≈26 cm); bänk för E42 som i W4; side-lunge som enbart frontvy (görs inte nu); squatBottoms bortre fotled [86,174]; nyckelrutemönstret in i produktion (step-down och step-up först).
