# Status: figurgranskning (viewBox och E96)

Källa: audit av alla figurer med `checkPoseGeometry`. Test: `src/figures/framing.test.ts`
(båda sidor, verklig `FRAMING`). Spegelaxel x = 96 (`translate(192 0) scale(-1 1)`).

| Övning | Fel | Status | Commit |
|---|---|---|---|
| E49 quad-set | Vänster tå klipps 7,4 (ram `24 128 160 52`) | todo | |
| E79 dumbbell-pullover | Ram osymmetrisk, vänster hand klipps 8,5 | todo | |
| E44 prone-on-forearms | Tå klipps 5 på båda sidor | todo | |
| E45 heel-slide | Klipps 2 till höger | todo | |
| E42 bench-side-plank-leg-lift | Sned vy klipps 4 | todo | |
| E42 bench-side-plank-leg-lift | Fot i steg-rekvisita i sidovyn (kollision) | todo, lämnas till Opus | |
| E29 hamstring-curl | 1,0 under golv | falskt positivt, ingen åtgärd | |
| E96 step-down | Befordra piloten till katalogfigur | todo | |
