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
| E42 bench-side-plank-leg-lift | Fot i steg-rekvisita i sidovyn (kollision) | todo, lämnas till Opus | |
| E29 hamstring-curl | 1,0 under golv | falskt positivt, ingen åtgärd | |
| E96 step-down | Befordra piloten till katalogfigur (steg 19 cm, räcke, IK, jämförelsesidan visar fryst Tidigare mot ny) | done, väntar på visuell granskning | (se nedan) |


Noter: övningstexten för E96 säger "Håll i väggen för stöd" men figuren har nu ett räcke. Texten ändrades inte (rapporterad till ledaren).
