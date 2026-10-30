import type { Exercise } from '../domain/types';

/** Editable editorial starting ranges, not a treatment prescription. */
export const kneeStrengthExercises: Exercise[] = [
  {
    id: 'bosu-squat',
    name: 'Knäböj på BOSU',
    muscles: ['Framsida lår', 'Säte'],
    tips: [
      'Placera BOSU med kupolen uppåt på halkfritt underlag. Ställ den nära en vägg eller ett stabilt stöd som du kan ta tag i. Kliv på och hitta en stabil fotställning.',
      'Böj höfter och knän i ett grunt, kontrollerat knäböj. Behåll kontakten med kupolen.',
      'Pressa genom fötterna och res dig lugnt. Ned och upp är en repetition.',
    ],
    commonMistake:
      'Du ställer dig på den platta sidan eller tappar balansen i ett för djupt knäböj.',
    easierVariant: 'Gör knäböj på stabilt golv, med stol som stöd vid behov.',
    unit: 'reps',
    perSide: false,
    range: { start: 8, max: 12, step: 1 },
    loadLadder: [{ kg: 0, label: 'Kroppsvikt' }],
    startLoadIndex: 0,
    week1LoadIndex: 0,
    kneeLoaded: true,
  },
  {
    id: 'copenhagen-hold',
    name: 'Copenhagen-håll med knästöd',
    muscles: ['Insida lår', 'Bål'],
    tips: [
      'Ligg på sidan med underarmen under axeln och det övre böjda knät på en stadig, vadderad bänk. Den valda sidan är benet som ligger på bänken.',
      'Pressa övre knät ned i bänken och lyft bäckenet. Håll kroppen rak från axel till knä och det undre benet fritt från golvet.',
      'Håll stilla under tiden som visas, sänk sedan bäckenet kontrollerat. Avbryt vid smärta i ljumsken eller på insidan av knät.',
    ],
    commonMistake:
      'Du lyfter det undre benet upprepade gånger i stället för att hålla, eller låter bäckenet sjunka.',
    easierVariant:
      'Håll kortare tid med det undre benet lätt i golvet som avlastning.',
    unit: 'seconds',
    perSide: true,
    sideKind: 'ben',
    range: { start: 10, max: 20, step: 5 },
    loadLadder: [{ kg: 0, label: 'Kroppsvikt' }],
    startLoadIndex: 0,
    week1LoadIndex: 0,
    kneeLoaded: true,
  },
  {
    id: 'nordic-hamstring-curl',
    name: 'Nordic hamstring med handhjälp',
    muscles: ['Baksida lår'],
    tips: [
      'Stå på knä på en mjuk matta med anklarna säkert fixerade i utrustning avsedd för Nordic. Kontrollera att fixeringen håller innan du lutar dig.',
      'Håll höft och bål sträckta och bromsa långsamt framåt från knäna. Ha händerna redo och ta emot mot golvet innan du tappar kontrollen.',
      'Tryck ifrån med händerna, böj höften och hjälp dig tillbaka till knästående. Sänkning och assisterad återgång är en repetition; räkna själv. Avbryt vid smärta eller hugg i baksida lår eller knä. Räkna med träningsvärk 1–3 dagar efter de första passen.',
    ],
    commonMistake:
      'Du har osäker fotledsfixering, faller fritt eller försöker dra tillbaka kroppen utan handhjälp.',
    easierVariant:
      'Minska lutningen och ta emot tidigare med händerna; välj stående lårcurl om fixering saknas.',
    unit: 'reps',
    perSide: false,
    range: { start: 3, max: 6, step: 1 },
    loadLadder: [{ kg: 0, label: 'Kroppsvikt' }],
    startLoadIndex: 0,
    week1LoadIndex: 0,
    kneeLoaded: true,
  },
  {
    id: 'bent-knee-calf-hold',
    name: 'Statisk tåhävning med böjt knä',
    muscles: ['Vader (soleus)'],
    tips: [
      'Stå på det valda benet och håll i en vägg. Lyft den andra foten och böj stödbenets knä lätt.',
      'Behåll det böjda knät och framfoten i golvet. Lyft hälen till ett läge du kan hålla utan att vackla.',
      'Håll hälen uppe och knät böjt under tiden som visas, sänk sedan hälen lugnt.',
    ],
    commonMistake: 'Du sträcker knät under hållet eller studsar med hälen.',
    easierVariant:
      'Använd båda benen och håll kortare tid med händerna mot väggen.',
    unit: 'seconds',
    perSide: true,
    sideKind: 'ben',
    range: { start: 20, max: 30, step: 5 },
    loadLadder: [{ kg: 0, label: 'Kroppsvikt' }],
    startLoadIndex: 0,
    week1LoadIndex: 0,
    kneeLoaded: true,
  },
  {
    id: 'wall-tibialis-raise',
    name: 'Tålyft mot vägg (tibialis)',
    muscles: ['Framsida underben'],
    tips: [
      'Luta ryggen mot en vägg med fötterna en bit framför kroppen och båda hälarna i golvet.',
      'Behåll hälarna på samma plats och lyft framfötter och tår mot smalbenen. Ryggen har kvar kontakten med väggen.',
      'Sänk framfötterna långsamt. Upp och ned är en repetition.',
    ],
    commonMistake:
      'Du lyfter hälarna som i en tåhävning eller flyttar fötterna mellan repetitionerna.',
    easierVariant:
      'Flytta fötterna närmare väggen och lyft framfötterna mindre.',
    unit: 'reps',
    perSide: false,
    range: { start: 15, max: 25, step: 1 },
    loadLadder: [{ kg: 0, label: 'Kroppsvikt' }],
    startLoadIndex: 0,
    week1LoadIndex: 0,
    kneeLoaded: false,
  },
];
