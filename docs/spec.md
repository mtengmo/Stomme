# Stomme – specifikation (källa: Claude-dokumentet "Styrke-app – byggplan", 2026-10-18)

## Mål
Lokal, offline-app (PWA) för Android som guidar användaren genom 2 styrkepass i veckan, loggar det som faktiskt görs och visar framsteg. Komplement till löpning. Nybörjarvänlig: varje övning visar hur den görs. Används på telefon under passet, allt ska gå att trycka på med en hand.

## Bakgrund
Programmet börjar försiktigt och följer smärtan i höger knä (se smärtregeln nedan).
- Utrustning: hantlar 2×5 kg och 2×10 kg, kettlebell 16 kg, stol/bänk, vägg.
- 2 pass/vecka, 25–30 min, minst 48 h emellan, helst inte dagen före hårt pass/långpass.
- Första veckan kroppsvikt. Svenska, kg, meter.

## Pass (båda ben lika många reps, börja alltid med höger, sänk 3 s per rep)
Pass A
| Övning | Set × reps | Vikt | Tänk på |
|---|---|---|---|
| Sitta ner och resa sig från stol (goblet) | 2×10 | 10 kg hantel mot bröstet | Sätt dig på stolen, knäna följer tårnas riktning |
| Step-up (20–30 cm) | 2×8 per ben | 2×5 kg | Höger ben jobbar hela vägen upp, sänk långsamt |
| Enbens rumänskt marklyft | 2×8 per ben | 1×10 kg | Rak rygg, höften bakåt, lätt böjt knä |
| Dead bug | 2×8 per sida | kroppsvikt | Ländryggen kvar i golvet |
| Sidoplanka | 2×20–30 s per sida | kroppsvikt | Rak linje huvud–fot |

Pass B
| Övning | Set × reps | Vikt | Tänk på |
|---|---|---|---|
| Split squat (stöd vägg/stol) | 2×8 per ben | 2×5 kg | Kort steg, bakre knäet mot golvet med kontroll |
| Enbens bäckenlyft | 2×10 per ben | 10 kg på höften | Pressa upp med klacken, inte ländryggen |
| Enbens tåhävning | 2×12 per ben | kroppsvikt | Hela rörelsen upp och ner |
| Väskbärning (suitcase carry) | 3×20–30 m per sida | 16 kg kettlebell | Stå rak, luta dig inte åt sidan |
| Bird dog | 2×8 per sida | kroppsvikt | Höften stilla, långsam rörelse |

Valfri vid retligt knä: väggsittning 3×30 s.

Progression: 2 set vecka 1–2, 3 set vecka 3–4. När 3×12 känns lätt, gå upp en vikt. Hantlarna räcker inte för benen: kettlebell används till marklyft och goblet.

Smärtregel höger knä (0–10): 0–3 okej om inte värre dagen efter. Skarp smärta, svullnad eller att knäet låser sig = stopp. Programmet bör visas för fysioterapeut en gång (särskilt step-up och split squat).

## Funktioner v1 (lokal, ingen inloggning, ingen server)
1. Veckovy: två pass, nästa markerat, klara bockade.
2. Passläge: en övning i taget, helskärm, set-räknare, vilotimer (60 s), stora knappar "Klar set", reps/vikt förifyllda från förra gången.
3. Övningskort: namn, muskler, tre tekniktips, vanligt fel, enklare variant, illustration.
4. Smärtlogg: 0–10 före, efter, dagen efter. Varna vid >3 eller värre än dagen före.
5. Progression: förslag på nästa vikt/set enligt reglerna ovan.
6. Historik och diagram: volym/vecka, vikt/övning, knäsmärta över tid.
7. Offline + installerbar på hemskärmen.
Senare: Garmin-koppling (t.ex. varna om långpass dagen efter benpass), CSV-export, påminnelser, fler program.

## Visuell design
Tydlig träningsguide, inte kalkylblad. Mobil först (360–430 px). En sak per skärm. Egna SVG-linjeteckningar med två nyckelpositioner (start/slut) som växlar långsamt. Grönt = klart, gult = dagens pass, grått = kommande; aldrig bara färg som bärare. Ring per pass, veckokalender, diagram. Ljust/mörkt tema efter telefonen. Tryckytor ≥48 px, text ≥16 px, hög kontrast.

## Datamodell
- Exercise: id, namn, muskelgrupper, tekniktips, enklare variant, enhet (reps/sekunder/meter), per ben (ja/nej)
- WorkoutTemplate: id, namn (A/B), lista med övning, set, reps, startvikt, vila (s)
- Session: id, datum, mall, smärta före, smärta efter, anteckning
- SetLog: session, övning, setnummer, sida (höger/vänster/båda), reps, vikt kg
- PainLog: datum, tidpunkt (före/efter/dagen efter), skala 0–10, plats (höger knä)

## Teknik (förslag, får ifrågasättas)
Vite + React + TypeScript + Tailwind; IndexedDB via Dexie med JSON export/import; SVG-diagram eller Recharts; PWA via vite-plugin-pwa; Vitest för progressions- och smärtregler.

## Milstolpar
1. Skelett och data (seed A/B, veckovy)
2. Passläge (set, vilotimer, loggning, lokalt, offline)
3. Övningskort och SVG-bilder
4. Smärtlogg och progression (enhetstester)
5. Historik och diagram
6. PWA och finish (installerbar, offline, export/import, mörkt tema)

## Regler för bygget
Bygg en milstolpe i taget, kör appen, visa skärmdumpar. Regler som kod: progression och smärta i egen modul med enhetstester, inte i UI. Inga medicinska råd utöver reglerna; vid osäkerhet visa "Fråga fysioterapeuten". Inte i v1: konton, server, Garmin, sociala funktioner. All text på svenska.

## Beslut (2026-10-18)
- Telefon: Android. Hosting: GitHub Pages, domän stomme.tengmo.com (DNS/CNAME sätts av ägaren).
- Ingen synk mellan enheter. Garmin kanske senare.
- MVP: börja litet, endast de 10 övningarna i dokumentet.
- Allt GUI-arbete görs med skillen /impeccable.
- Arbetsfördelning: architect-einstein planerar, Sonnet bygger, Haiku för enkla uppgifter.
