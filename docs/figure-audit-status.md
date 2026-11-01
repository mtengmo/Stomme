# Status: figurgranskning (viewBox och E96)

Källa: audit av alla figurer med `checkPoseGeometry`. Test: `src/figures/framing.test.ts`
(båda sidor, verklig `FRAMING`). Spegelaxel x = 96 (`translate(192 0) scale(-1 1)`).

| Övning | Fel | Status | Commit |
|---|---|---|---|
| E49 quad-set | Vänster tå klipps 7,4 (ram `24 128 160 52`) | done | 9eca5d8 |
| E79 dumbbell-pullover | Ram osymmetrisk, vänster hand klipps 8,5 | done | 32a879a |
| E44 prone-on-forearms | Tå klipps 5 på båda sidor | done | fea50ad |
| E45 heel-slide | Klipps 2 till höger | done | 2933cf4 |
| E42 bench-side-plank-leg-lift | Sned vy klipps 4 | done | 6b16e75 |
| E42 bench-side-plank-leg-lift | Fot i steg-rekvisita i sidovyn (kollision) | done i W4 (bänk 32 bred, stödfoten på plattan) | (W4) |
| E29 hamstring-curl | 1,0 under golv | falskt positivt, ingen åtgärd | |
| E96 step-down | Befordra piloten till katalogfigur (steg 19 cm, räcke, IK, jämförelsesidan visar fryst Tidigare mot ny) | done, väntar på visuell granskning | b35f531 |


Noter: övningstexten för E96 säger "Håll i väggen för stöd" men figuren har nu ett räcke. Texten ändrades inte (rapporterad till ledaren).

## Rättningar enligt docs/figure-fix-specs.md

| Del | Innehåll | Status | Commit |
|---|---|---|---|
| W0 | Kontrollen: bänk 7, supports, allowlist, skipDrift, asymmetri över alla rutor, `applyEquipmentPose`, ratchet-test `figureGeometry.test.ts` med baslinje | done | 42c0e2b |
| W1 | E94 wall-tibialis-raise | done | a723c4c |
| W2 | E91 copenhagen-hold | done | cd411a0 |
| W3 | E02 step-up sidovy | done | cd7d4f9 |
| W3b | E02 step-up frontvy | done | a971f09 |
| W4 | E42 bench-side-plank-leg-lift (sido- och sned vy; ram `8 20 184 168`) | done | 1f8064f |
| W5 | Plankfamiljen (plank, plank-arm-lift, push-up, decline, diamond). Avvikelse: bortre knä IK-böjer åt -1 (spec: 1 gav knä under golvet), bortre fot 3 enheter vinkelrätt mot benet i stället för [-3,-3] så att benet inte knickar. Burpee ärver push-up-poser och får tillfälligt några tiondelar sämre baslinje (ersätts i W7). | done | 05d9a4b |
| W6 | E16 floor-press (avvikelse: delade `floorBase` fick bortre knä via IK så benen blir lika långa, krävdes för att kontrollen skulle bli []; gäller även dumbbell-pullover och kettlebell-floor-press) | done | bececf3 |
| W7 | E60 burpee (avvikelse: bortre knä böjs åt -1 för att knäna ska peka framåt; spec-nyckelrutorna fick extra nyckelruta 'Fötterna lyfter' (t0,15 och 0,6), hoppet bak/in med fötterna i luften (ankel y 130) och 0,63/0,75 flyttade till 0,66/0,78 annars gick knäna under golvet vid hopp bak) | done | (nästa commit) |
| W9 | Knäböjsfamiljen | todo | |
| E96-text | vägg eller räcke | todo | |
| W8, W10-W12 | Görs inte i denna körning | ej påbörjad | |

