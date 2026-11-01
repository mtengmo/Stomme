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

## E96 Nedsteg från steg

Tillagd 2026-11-01 efter att användaren bekräftat instruktionstexten från [InStep Physiotherapy: Steps downs](https://education.instepphysio.ca/Injuries-Conditions/Knee/Exercises/Steps-downs/a~1087/article.html); sidan gav 403 vid egen kontroll. Stå på ett lågt steg med ena benet stadigt, håll i väggen vid behov och böj det stående knät kontrollerat medan den fria hälen sänks mot golvet. Stanna när hälen är 2–3 tum under steget och pressa tillbaka upp med stående ben. Håll knät i linje med andra tån; undvik att falla snabbt eller låta knät falla inåt. Lättare alternativ: lägre steg och handstöd. Repetitionsdosen är appens förslag, eftersom källan inte anger dos.

E96 (`step-down`) är `kneeLoaded: true`, nivå `practiced`, utrustning `step`, och en biblioteksövning utan automatisk plats i rehab eller roster. Sidvalet avser benet som står kvar på steget. Referensen E96 är permanent; E85, E86 och E89 är fortfarande reserverade. E97 `toe-squat` förblir pausad tills en källa finns.

## E98 Sittande skenbensrotation

Tillagd 2026-11-01 som en redaktionell övning; ingen källa hittades för sittande skenbensrotation med band. Sitt på en stol med ett block, en kudde eller en vikt handduk mellan knäna och ett gummiband runt framfötterna. Rotera underbenen inåt och utåt. Övningen är bilateral (`perSide: false`), nivå `basic`, utrustning stol och band, och `kneeLoaded: true` så befintlig smärtregel kan stoppa övningen. Dosen 10–20 repetitioner i steg om 2 är appens förslag. Lättare alternativ: ta bort bandet och rotera genom ett litet rörelseomfång utan motstånd.

E98 (`seated-tibial-rotation`) är endast en biblioteksövning och läggs inte automatiskt i rehab eller roster. Referensen E98 är permanent; E85, E86 och E89 är fortsatt reserverade. E97 `toe-squat` förblir pausad i väntan på källa.

