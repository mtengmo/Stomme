# Sex knärelaterade styrkeövningar: granskning och byggplan

2026-10-30. Isolerad gren `feature/knee-strength`, worktree `.worktrees/knee-strength`. Onboarding, huvudgrenen och Claudes pågående arbete ändras inte. Ingen merge eller push ingår.

## Inventering och beslut före implementation

Astra gjorde en avgränsad innehållsgranskning före kodning.

| Förlagan | Befintligt | Beslut |
|---|---|---|
| BOSU squat | Saknas | E90 `bosu-squat`, kupolen uppåt, kroppsvikt. Förlagans platta sida uppåt används inte. |
| Copenhagen | E42 är upprepat nedre benlyft, inte samma övning | E91 `copenhagen-hold`: statiskt kort hävarm, övre böjda knät på vadderad bänk. Vald sida betyder det övre stödda benet. |
| Wall sit | E11 `wall-sit` motsvarar övningen | Återanvänd ID, historik, figur och befintligt 30-sekundersförslag. Ingen dubblett. |
| Nordic hamstring | Saknas | E92 `nordic-hamstring-curl`, långsam excentrisk sänkning, händerna tar emot och hjälper tillbaka. Kräver ordentlig fotledsfixering. |
| Böjt knä, statisk vadpress | E08/E67 är andra varianter | E93 `bent-knee-calf-hold`, en sida, lätt böjt knä, fast framfot och upplyft häl under hålltiden. |
| Tibialis raises | Saknas | E94 `wall-tibialis-raise`, häl i golvet medan framfoten lyfts. |

E85/E86/E89 är reserverade av den äldre planen och återanvänds inte.

## Källor och korrigeringar

- [BOSU:s tillverkar-FAQ](https://bosu.com/pages/faqs): tillverkaren avråder från att stå på plattformsidan. Det beskrivs inte som ett absolut förbud för alla modeller. Appen visar kupolen uppåt och erbjuder stabil knäböj som lättare alternativ.
- [Fysio Fitaal: Short Copenhagen isometric](https://fysiofitaal.nl/en/exercise/short-copenhagen-isometric/): övre knät på bänk och statiskt håll. Repetitioner och sekunder blandas inte i samma övning.
- [SHARP-studiens protokoll](https://pmc.ncbi.nlm.nih.gov/articles/PMC9664273/): Nordic med fixerade anklar, bromsad sänkning, mottagning med händerna och assisterad återgång. Ersätter en NHS-länk som Astra hittade men som gav 404; den trasiga länken används inte i appen.
- [Foundation Podiatry: Bent Knee Single Leg Calf Raise Isometric](https://www.foundationpodiatry.com.au/bent-knee-single-leg-calf-raise-isometric/): stående, böjt knä, handstöd och statisk vadpress. Ingen generell regel om att knän aldrig får passera tårna införs.
- [Hinge Health: Tibialis raises](https://www.hingehealth.com/resources/articles/tibialis-raises/): ryggstöd mot vägg, fötter framför och hälkontakten kvar.

## Byggomfattning

Fem katalogposter med svenska instruktioner, muskler, teknikfel, lättare alternativ, källnoteringar, siddefinitioner och tydliga startintervall. Copenhagen 10–20 s/sida, Nordic 3–6 repetitioner, vadpress 20–30 s/ben, tibialis 15–25 repetitioner och BOSU 8–12 repetitioner är redaktionella förslag som användaren kan anpassa, inte individuella ordinationer. Befintliga smärt-/symtomregler ska gälla även de nya posterna. Ingen automatisk placering i rehabprogram eller påstående om generell behandling av knäsmärta.

Ny utrustning modelleras uttryckligen: BOSU, stadig vadderad bänk och säker Nordic-fotledsfixering. Lägg val i befintliga inställningar och tillfällig passutrustning; ändra inte onboarding. Säkerhetskopiering måste acceptera de nya utrustningsvärdena och behålla gammal kompatibilitet.

Figurerna byggs i en separat modul: fast stöd/korrekta kontakter, Copenhagen med övre arbetsbenet, Nordic med assisterad återgång, böjt knä under hela vadpresshållet och tibialis med hälen kvar. Hållövningar ska visa hållpositionen även i passets stillbild.

Verifiering: en fokuserad uppsättning innehålls-, utrustnings-, backup-, timer- och geometriprov; därefter check, produktionsbygge och en samlad mobilgranskning vid 320/390 px inklusive minskad rörelse. Högst en riktad korrigeringsrunda om granskningen hittar fel. Ingen installation av nya beroenden eller omgranskning av hela gamla biblioteket.

Tokenrapport sparas separat med mätbara lokala räknare, cache särredovisad och uttryckliga luckor. Ingen uppskattning presenteras som uppmätt kontoförbrukning.

## Genomfort och verifierat

Fem nya poster E90–E94 byggda; E11 ateranvands. Tre nya utrustningsval, totalt tio stodval, med kompatibel backupvalidering. Onboardingfiler ar ororda. 266 riktade tester passerade; efter kodnings- och hallbildskorrigeringen passerade ytterligare 101 riktade tester. Typkontroll och produktionsbygge passerade. Biome har fem befintliga varningar. Mobilkontroll vid 320/390 px gav ingen horisontell overflow for nagon av de fem; samlad figurgranskning omfattade rorelsefaser, sidval och minskad rorelse. Testloggar och bilder finns lokalt i `.impeccable/review/knee-strength/`.
