# Granskningslogg för övningar (text, animation, säkerhet)

Källa till sanning: `docs/exercise-audit-log.json`, en post per övning i katalogen (`exercises` i `src/content/exercises.ts`). Animationerna hör till appens viktigaste delar, så loggen är gemensam för Claude, Codex och människan. Testet `src/content/exerciseAudit.test.ts` håller loggen sund.

## Statusmodell

| Status | Betyder |
|---|---|
| `unreviewed` | Ingen granskning som räcker för godkännande. Det kan finnas äldre granskningar (t.ex. 2026-10-23) som är stickprov. |
| `needs-fix` | En granskning har hittat fel som ännu inte är rättade. |
| `fixed-awaiting-review` | Rättad (se `fixes`) men inte granskad av någon annan. |
| `approved` | Godkänd. Kräver en granskning enligt reglerna nedan. |

Fält per post: `id`, `name`, `group`, `risk` (`high` för rehab/AAOS/fysio/knä, belastade och ballistiska övningar, annars `normal`), `status`, `reviews`, `fixes`, `openIssues`, valfri `notes`, `fingerprint`.

- Granskning: `{date (ÅÅÅÅ-MM-DD), reviewer, scope, result, notes, commit?, evidence?}` där `result` är `ok` eller `issues`.
- Rättning: `{date, fixer, commit?, notes}`. Rättningar är en egen lista så att man ser vem som senast ändrade figuren.
- Tillåtna `reviewer`/`fixer`: `claude-opus`, `claude-sonnet`, `claude-fable`, `unknown-claude`, `codex:gpt6astra`, `codex:gpt61sol`, `human`.
- `unknown-claude` används bara för granskningen 2026-10-23 i `docs/exercise-animation-audit.md`, där dokumentet inte anger vilken modell som gjorde den. Uppfinn aldrig en granskare: saknas uppgiften, skriv `unknown-claude` (eller lämna posten ogranskad).
- `scope`: `text`, `animation`, `safety` eller `all`.

## Vem får göra vad (ingen självgodkännande)

- Alla får lägga till granskningar och rättningar med sitt eget id.
- `approved` kräver minst en granskning med `scope: all`, eller tre med `text`, `animation` och `safety`, alla `result: ok`, daterade samma dag som eller efter senaste rättningen.
- Den som godkänner får inte vara den som senast rättade (testet jämför id exakt). Önskat: en övning som Claude rättat godkänns av en Codex-modell eller människan, och tvärtom. En annan modell från samma leverantör är tillåten men svagare; skriv det i `notes`.
- En övning med `openIssues` får inte vara `approved`. Ta bort en punkt först när den är åtgärdad och granskad.
- Sätt aldrig `approved` utan en granskningspost som säger det. Ogranskat förblir `unreviewed`.

## Granskningschecklista

1. Text mot rörelse: stämmer varje steg i `tips` med startläge, rörelseriktning, vändning och återgång i animationen?
2. Sida och spegling: höger/vänster, vald sida mot vilken lem som rör sig och vilken som stödjer (se `exerciseSideCues.ts`). Sidoknappen speglar samma geometri.
3. Kontakter och rekvisita: händer, fötter, bänk, steg, vägg, stol, kettlebell/hantel/band. Inget genom golv, ingen svävande utrustning, konstanta lemlängder.
4. Loopens start och slut: inget hopp vid sömmen, rimlig paus, hålltider som i texten.
5. Reducerad rörelse: stillbilden (Start/Slut) visar rätt läge.
6. Vy: räcker sidovyn, eller behövs frontvy/sned vy för knäriktning, sidolutning eller bäckenrotation?
7. Säkerhetssignaler: varningar, smärtgräns, vad som är lämpligt vid knäbesvär, ballistiska och belastade moment.
8. Utrustningsvarianter: alla varianter (kroppsvikt, hantel, kettlebell, band) ser rätt ut och följer texten.

## Bevis: bilder

Kör `npm run shots:exercises`. Kontaktblad med start, mitt och slut skrivs till `.impeccable/review/exercises/` (ej incheckat). För faser över hela loopen finns `scripts/animation-fix-shots.ts`. Ange i `evidence` en sökväg som finns kvar (checka in bilden om den ska vara bevis), annars beskriv i `notes` vad som sågs. Stillbilder räcker inte för `scope: all` på rörelse: titta på flera faser av loopen.

## Lägga till en granskning eller rättning

1. Öppna `docs/exercise-audit-log.json` och hitta övningen.
2. Granskning: lägg till sist i `reviews` med dagens datum, ditt id, `scope`, `result`, korta `notes` och ev. `commit`/`evidence`.
3. Rättning: lägg till i `fixes` (datum, ditt id, commit) och sätt `status` till `fixed-awaiting-review`. Hittade du fel utan att rätta: `needs-fix` och skriv punkten i `openIssues`.
4. Godkänner du: `result: ok`, uppfyll reglerna ovan, töm `openIssues`, sätt `status: approved`.
5. Kör `npm run audit:fingerprints -- --write` om figuren ändrats, sedan `npm run test`.

## Omgranskning när figuren ändras (fingerprint)

`fingerprint` är en kort hash av hur figuren ritas: poser vid nio tidpunkter, sidovy, frontvy och sned vy för båda sidor och alla utrustningsvarianter, ramen och rekvisitan, avrundat till en decimal (`src/figures/auditFingerprint.ts`, samma uppräkning som `figureGeometry.test.ts`).

- `npm run audit:fingerprints` listar godkända övningar vars figur ändrats sedan loggen skrevs. De är `stale`; exit-koden är 1 och testet misslyckas.
- Gör så här: granska om figuren, lägg till en rättning (om du ändrade den) och en ny granskning från rätt person, kör sedan `npm run audit:fingerprints -- --write`. Ändringen som kräver ny granskning ska sätta `status` till `fixed-awaiting-review` i samma commit.
- `--write` ändrar aldrig status. Det uppdaterar bara hashen.
- Ändringar i texten fångas inte av fingerprint. Lägg då en ny granskning med `scope: text`.

## Kö och arbetssätt

Ordning: (1) hög risk först, sedan normal; inom varje grupp (2) `needs-fix`, (3) `fixed-awaiting-review`, (4) `unreviewed`; vid lika, färre granskningar först. `npm run audit:summary` skriver antal per status, ej godkända högriskövningar, stale och de tio nästa i kön.

Ta en sats på cirka 8-10 övningar per session. Varje sats avslutas med att loggen är uppdaterad i samma commit som eventuella rättningar. Ändrar du en animation: uppdatera loggen i samma commit.

## Seedning och kända luckor

Loggen seedades 2026-11-03 från `docs/exercise-animation-audit.md` (granskning 2026-10-23 av E01-E53, granskare okänd: `unknown-claude`, stickprov av statisk källa, inte fullständig loop), `docs/figure-audit-status.md` och `docs/figure-fix-specs.md` (rättningar med commit av `claude-sonnet`; specen kommer från en Opus-granskning 2026-11-01: `claude-opus`) samt `docs/animation-fix-handoff.md`. Ingen övning är `approved`.

Kända öppna punkter: `kettlebell-deadlift` och `dumbbell-rdl` saknar W9-rättningen; `step-down` (E96) väntar på visuell granskning; `supported-row` (E15) är bara täckt av gruppraden E11-E17; övningarna i handoffen 2026-10-24 saknar nybörjartest. W8 och W10-W12 i `figure-fix-specs.md` (global interpolation, bryggor, benlyft, sidoutfall) är inte påbörjade och är inte kopplade till enskilda poster. `hamstring-curl` (E29): falskt positivt i geometrigranskningen, ingen åtgärd.
