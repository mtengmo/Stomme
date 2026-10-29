# Plan: hitta rätt övning i ett stort bibliotek

Datum: 2026-10-29. Planering med en avgränsad granskning av Astra. Ingen implementation ingår ännu.

## Rekommendation

Prioritera sortering och sökrelevans före fler övningar. Biblioteket täcker redan de flesta stora rörelsemönstren. Fler kombinationsövningar eller fyllda E-nummerluckor är inte ett mål i sig.

Detta är en produktbedömning utifrån katalogen, inte en forskningsbaserad rangordning av vilka övningar som är bäst eller vanligast.

## Övningsluckor att utreda

1. **Horisontell rodd med gummiband.** Ger dragträning till användare som har band men saknar hantlar och chinsstång. Utred först om det bör vara en utrustningsvariant i befintlig roddfamilj. Krav på band och eventuellt säkert fäste ska framgå; anta inte att alla band fungerar för alla varianter.
2. **En enkel rörlighetsövning för bröstrygg/axlar**, exempelvis liggande bröstryggsrotation. Belastade rotationer och halo ersätter inte detta användningsfall. Välj högst en komplettering efter kontroll av källa, instruktioner och illustration.

Ingen av dessa ska byggas före sorteringsarbetet. Separat källgranskning krävs före övningsimplementation; denna genomgång fastställer inte dosering eller medicinsk lämplighet.

## Popularitet och personlig användning

Appen har inte underlag för en global popularitetslista. Använd inte etiketten ”Populärast” eller påhittade popularitetspoäng.

- **Passar mig** betyder relevans utifrån profil, utrustning och egna val, inte medicinsk lämplighet.
- **Gillade först** använder befintliga likes/favoriter: gillade övningar visas först och övriga finns kvar. Det skiljer sig från favoritfiltret, som bara visar gillade övningar. Ingen ny datalagring behövs.
- **Senast tränade** bygger på senaste faktiska setloggen, inte på att en övning lades i ett planerat pass.
- **Mest tränade av mig**, i ett senare steg, räknar distinkta pass med minst ett faktiskt loggat set under de senaste 90 dagarna. Flera set ger inte fler användningstillfällen. Även ett avbrutet pass kan innehålla utförda set. Visa perioden tydligt och håll alla data lokalt.
- Ett framtida redaktionellt urval kan heta **Basövningar**. Det måste vara ett motiverat urval, inte framställas som uppmätt popularitet.

## MVP: en sorteringsväljare

Alternativ: **Passar mig**, **Gillade först**, **Namn A–Ö**, **Senast tränade**. Behåll befintliga filter, favoritfilter och kompakt/detaljerad visning.

Regler:

1. Filtrera först. Behåll ”Tränar främst” och ”Hjälper till” som separata grupper och sortera inom respektive grupp. Sorteringen får aldrig återinföra bortfiltrerade övningar eller kringgå rehaburval.
2. Med ”Passar mig” och söktext: exakt E-nummer först, exakt namn därefter, sedan namn-/aliasträffar och övriga delträffar. Andra uttryckliga sorteringsval respekteras även under sökning.
3. Därefter prioriteras övningar där **en och samma variant** passar både utrustning och erfarenhetsnivå. Två olika varianter får inte tillsammans skapa en falsk matchning.
4. Bland likvärdiga träffar prioriteras favoriter och övningar i användarens pass. Avsluta med svensk alfabetisk ordning och stabilt E-nummer som skiljeregel. Använd tydliga skäl som ”Favorit” och ”Passar din utrustning”, inte ett ogenomskinligt poängtal.
5. Utan profil används sökrelevans och därefter A–Ö. Vid ”Senast tränade” läggs övningar utan loggar sist, alfabetiskt. Finns ingen historik alls används A–Ö med en kort förklaring.
6. ”Gillade först” delar träffarna i gillade och övriga inom respektive muskelgrupp. Sortera alfabetiskt inom varje del, med stabilt E-nummer som skiljeregel. Om inga övningar är gillade blir ordningen A–Ö. En like är en personlig ja/nej-markering, inte ett globalt antal röster.
7. Spara sorteringen i URL:en, exempelvis `sort=fit|liked|name|recent`, tillsammans med befintliga filter. Guidebesök och webbläsarens Tillbaka ska återställa valet. Okända värden ger standardvalet.

## Genomförande och verifiering

1. Lägg till en liten ren sorteringsfunktion efter befintlig filtrering. Använd befintlig metadata, favoriter, pass och setloggar; ändra inga träningsprogram eller databasscheman.
2. Koppla en tillgänglig väljare till biblioteket och dess URL-parametrar. Bevara den befintliga svenska utformningen.
3. Kontrollera exakt sökträff, samma-variant-matchning, svensk sortering, tom historik, saknade/ogiltiga sorteringsvärden och oförändrade filtergrupper. Kontrollera även att ”Gillade först” behåller ogillade träffar, fungerar utan likes och uppdaterar ordningen när en like ändras. Webbläsartest täcker guide → Tillbaka, omladdning och smal mobil.
4. Gör en samlad granskning och en avgränsad korrigeringsrunda före commit. Ingen full animationsgranskning behövs när figurerna inte ändras.

Senare, endast vid behov: ”Mest tränade av mig” och ett litet redaktionellt basurval. Utvärdera först om MVP:n faktiskt gör det lättare att välja övning.

## Utanför planen

Global användarspårning, serverbaserad popularitet, maskininlärning, nya komplexa kettlebellövningar och ett stort nytt taggsystem ingår inte. Programmets `generalSlots.pull` ska inte återanvändas som kvalitetsranking; det innehåller även ryggresning och bird-dog, som inte är likvärdiga med rodd/chins som dragövningar.
