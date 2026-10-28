import type { Exercise } from '../domain/types';
import type { EquipmentType, TechnicalLevel } from './exerciseMetadata';
import type { MuscleGroupId } from './muscles';

/** Library additions only. Doses are editable app proposals, not source prescriptions. */
function exercise(
  id: Exercise['id'],
  name: string,
  muscles: string[],
  tips: Exercise['tips'],
  commonMistake: string,
  easierVariant: string,
  start = 6,
  unit: Exercise['unit'] = 'reps',
  maxReps = 12,
): Exercise {
  return {
    id,
    name,
    muscles,
    tips,
    commonMistake,
    easierVariant,
    unit,
    perSide: false,
    range: {
      start,
      max: unit === 'seconds' ? 30 : maxReps,
      step: unit === 'seconds' ? 5 : 1,
    },
    loadLadder: [{ kg: 0, label: 'Kroppsvikt' }],
    startLoadIndex: 0,
    week1LoadIndex: 0,
    kneeLoaded: ['burpee', 'squat-jump', 'jumping-lunge'].includes(id),
    optional: true,
  };
}

export const bodyweightExercises: Exercise[] = [
  exercise(
    'push-up',
    'Armhävning',
    ['Bröst', 'Triceps', 'Axlar'],
    [
      'Sätt händerna något bredare än axlarna och stöd på tårna. Håll huvud, bål och ben i en sammanhängande linje.',
      'Böj armbågarna snett bakåt och sänk bröstet mot golvet så långt du kan med bibehållen kontroll.',
      'Pressa golvet ifrån dig tills armarna är raka. Ned och upp är en repetition.',
    ],
    'Höften sjunker eller huvudet skjuts fram före bröstet.',
    'Gör rörelsen med knäna i golvet eller händerna mot en vägg.',
  ),
  exercise(
    'pull-up',
    'Pull-up med överhandsgrepp',
    ['Rygg', 'Biceps', 'Underarmar'],
    [
      'Använd en fast monterad stång avsedd för kroppsvikt. Greppa med handflatorna från dig, ungefär axelbrett, och häng med fötterna fria.',
      'Spänn bålen och dra kroppen upp mot stången utan att svinga eller kasta med benen.',
      'Sänk dig lugnt tillbaka till utsträckta armar med kontroll i axlarna. Upp och ned är en repetition.',
    ],
    'Du får fart med benen eller skjuter fram hakan för att nå stången.',
    'Öva enarmsrodd med stöd och lätt vikt innan du provar hela kroppsvikten.',
    3,
  ),
  exercise(
    'chin-up',
    'Chins med underhandsgrepp',
    ['Rygg', 'Biceps', 'Underarmar'],
    [
      'Greppa en fast monterad chinsstång med handflatorna mot dig och händerna ungefär axelbrett. Håll fötterna fria från golvet.',
      'Dra armbågarna nedåt och lyft kroppen tills hakan når ungefär stångens höjd utan att sträcka fram nacken.',
      'Sänk kroppen kontrollerat tills armarna är utsträckta igen. Upp och ned är en repetition.',
    ],
    'Du svingar kroppen eller släpper ned dig utan att bromsa.',
    'Välj enarmsrodd med stöd och bygg upp dragstyrkan först.',
    3,
  ),
  exercise(
    'back-extension',
    'Rygglyft på golv',
    ['Rygg'],
    [
      'Ligg på mage med armarna längs sidorna och blicken mot underlaget. Låt bäcken och ben vila mot golvet.',
      'Spänn bålen lätt och lyft bröstkorgen en liten bit, med nacken i linje med ryggen. Håll armarna nära kroppen.',
      'Sänk överkroppen långsamt tillbaka. Ett litet lyft och en sänkning är en repetition.',
    ],
    'Du kastar huvudet bakåt eller försöker lyfta så högt att rörelsen blir obekväm.',
    'Minska lyfthöjden; välj Bird dog om den rörelsen passar dig bättre.',
  ),
  exercise(
    'parallel-dip',
    'Dips i parallella stänger',
    ['Triceps', 'Bröst', 'Axlar'],
    [
      'Använd en stabil dipsställning avsedd för kroppsvikt. Greppa stängerna och stöd kroppen på raka armar med fötterna fria.',
      'Böj armbågarna och sänk kroppen lugnt till ett bekvämt djup. Håll axlarna kontrollerade och undvik att sjunka ned mellan dem.',
      'Pressa genom händerna tillbaka till raka armar. Ned och upp är en repetition. Använd ställningens steg när du avslutar.',
    ],
    'Du faller djupt ned eller rycker kroppen upp med benen.',
    'Öva armhävningar mot vägg eller med knästöd först.',
    3,
  ),
  exercise(
    'lying-leg-raise',
    'Liggande benlyft med båda benen',
    ['Bål', 'Höftböjare'],
    [
      'Ligg på rygg med armarna längs sidorna och benen utsträckta. Håll huvudet avslappnat mot underlaget och spänn bålen lätt.',
      'Lyft båda benen tillsammans. Sänk dem sedan bara så långt du kan hålla bäcken och rygg stilla utan obehag.',
      'Återgå lugnt till startläget. Ett gemensamt lyft och en sänkning är en repetition; böj knäna om det behövs.',
    ],
    'Ryggen svankar mer när benen sänks eller benen får fart.',
    'Böj knäna och gör rörelsen mindre, eller välj Dead bug.',
  ),
  exercise(
    'burpee',
    'Burpee med armhävning och hopp',
    ['Bröst', 'Triceps', 'Bål', 'Framsida lår', 'Säte'],
    [
      'Stå med plats omkring dig. Böj höfter och knän och sätt händerna i golvet framför fötterna.',
      'Hoppa bak med fötterna till en rak armhävningsposition. Gör en kontrollerad armhävning och hoppa sedan in med fötterna igen.',
      'Res dig till ett litet upphopp med armarna uppåt och landa mjukt med böjda knän. Hela följden räknas som en repetition.',
    ],
    'Du tappar bålkontrollen eller landar stelt när tempot blir för högt.',
    'Kliv bak och fram en fot i taget; utelämna armhävningen och hoppet.',
    4,
  ),
  exercise(
    'plank',
    'Planka på underarmar',
    ['Bål'],
    [
      'Lägg underarmarna i golvet med armbågarna under axlarna och stöd på tårna.',
      'Lyft kroppen och håll huvud, bål och ben i en linje. Spänn magen utan att hålla andan.',
      'Håll läget under tiden som visas. Sätt sedan ned knäna och slappna av.',
    ],
    'Höften sjunker eller skjuts högt upp när du blir trött.',
    'Ha knäna i golvet och håll en kortare tid.',
    15,
    'seconds',
  ),
  exercise(
    'squat-jump',
    'Knäböj med hopp',
    ['Framsida lår', 'Säte', 'Vader'],
    [
      'Stå ungefär höft- till axelbrett med plats ovanför och omkring dig. Böj höfter och knän till en kontrollerad knäböj.',
      'Pressa genom fötterna till ett litet hopp. Låt armarna hjälpa till och håll benen i samma riktning som fötterna.',
      'Landa mjukt på båda fötterna och bromsa med höfter och knän. Ett hopp med landning är en repetition; hitta balansen före nästa.',
    ],
    'Knäna faller inåt eller du landar med stela ben.',
    'Gör en vanlig knäböj utan hopp.',
    5,
  ),
  exercise(
    'jumping-lunge',
    'Utfall med hopp och benbyte',
    ['Framsida lår', 'Säte', 'Vader'],
    [
      'Stå i en kontrollerad utfallsposition med ett ben framför det andra. Håll överkroppen upprätt.',
      'Hoppa en liten bit och byt benens position i luften så att det andra benet hamnar framför.',
      'Landa mjukt i utfall och bromsa rörelsen innan nästa hopp. Varje hopp med benbyte är en repetition totalt, inte per sida.',
    ],
    'Fötterna hamnar på en smal linje eller knäet faller inåt vid landningen.',
    'Gör stationärt utfall eller utfall bakåt utan hopp.',
    4,
  ),
  exercise(
    'mountain-climber',
    'Mountain climber',
    ['Bål', 'Höftböjare', 'Axlar'],
    [
      'Stöd på händer och tår med händerna under axlarna, raka armar och bålen i en stabil linje.',
      'För ett knä mot bröstet och för sedan tillbaka foten. Växla med det andra benet medan händerna ligger kvar.',
      'Fortsätt växelvis med kontrollerat tempo och stilla bäcken under tiden som visas. Sätt ned knäna när tiden är slut.',
    ],
    'Höften studsar eller händerna flyttas när du ökar tempot.',
    'För fram ett knä i taget långsamt och pausa mellan rörelserna.',
    15,
    'seconds',
  ),
  exercise(
    'knee-push-up',
    'Armhävning på knä',
    ['Bröst', 'Triceps', 'Axlar'],
    [
      'Lägg en hopvikt handduk under knäna. Gå ned på knä med händerna något bredare än axlarna och flytta fram händerna så att kroppen bildar en rak linje från knän till huvud.',
      'Böj armbågarna snett bakåt och sänk bröstet mot golvet. Håll magen spänd så att höften inte sjunker.',
      'Pressa golvet ifrån dig tills armarna är raka. Ned och upp är en repetition.',
    ],
    'Höften skjuts bakåt mot hälarna eller sjunker så att ryggen svankar.',
    'Gör armhävningen mot en vägg.',
  ),
  exercise(
    'wall-push-up',
    'Armhävning mot vägg',
    ['Bröst', 'Triceps', 'Axlar'],
    [
      'Stå en armlängd från en vägg med fötterna ungefär höftbrett. Lägg handflatorna mot väggen i axelhöjd, något bredare än axlarna.',
      'Böj armbågarna och för bröstet mot väggen med kroppen rak från huvud till hälar. Låt hälarna stå kvar i golvet.',
      'Pressa dig ifrån väggen tills armarna är raka. Mot och från väggen är en repetition.',
    ],
    'Höften skjuts bakåt eller hälarna lyfts när du kommer nära väggen.',
    'Stå närmare väggen så blir det lättare.',
  ),
  exercise(
    'calf-raise',
    'Tåhävning på två ben',
    ['Vader'],
    [
      'Stå med fötterna ungefär höftbrett. Håll i en vägg eller stolsrygg vid behov och se rakt fram.',
      'Pressa upp på tårna så högt du kan utan att fötterna vickar utåt eller inåt.',
      'Sänk hälarna långsamt tillbaka till golvet. Upp och ned är en repetition.',
    ],
    'Du studsar upp och ned eller faller åt sidan på fötterna.',
    'Ha ett stadigt stöd att hålla i och gå bara upp en liten bit på tårna.',
    10,
    'reps',
    15,
  ),
  exercise(
    'crunch',
    'Magcrunch',
    ['Bål'],
    [
      'Ligg på rygg med böjda knän och fötterna i golvet. Lägg händerna lätt vid tinningarna eller över bröstet.',
      'Spänn magen och lyft huvud och axlar en liten bit från golvet. Dra inte i nacken med händerna.',
      'Sänk lugnt tillbaka. Lyft och sänkning är en repetition.',
    ],
    'Du rycker i nacken eller lyfter hela ryggen från golvet.',
    'Lyft bara huvudet och axlarna en liten bit, eller korsa armarna över bröstet.',
    10,
    'reps',
    15,
  ),
  exercise(
    'decline-push-up',
    'Armhävning med fötterna upphöjda',
    ['Bröst', 'Axlar', 'Triceps'],
    [
      'Stöd händerna i golvet och tårna på en låg, stadig stol som inte kan glida. Håll kroppen rak.',
      'Sänk bröstet lugnt mellan händerna med armbågarna snett bakåt. Behåll samma linje genom höft och rygg.',
      'Pressa upp igen utan att kasta med kroppen. Ned och upp räknas som en repetition.',
    ],
    'Höften hänger ned eller stolen rör sig.',
    'Sätt fötterna i golvet och gör en vanlig armhävning.',
  ),
  exercise(
    'diamond-push-up',
    'Smala armhävningar',
    ['Triceps', 'Bröst', 'Axlar'],
    [
      'Stöd på tårna och sätt händerna tätt under bröstet. Låt tummar och pekfingrar bilda en diamant om det känns bekvämt.',
      'Böj armarna nära sidorna och sänk bröstet kontrollerat mot händerna. Håll höften i linje med kroppen.',
      'Tryck genom handflatorna och räta ut armarna. En sänkning och upppressning är en repetition.',
    ],
    'Armbågarna far ut åt sidorna eller ryggen svankar.',
    'Flytta händerna bredare och välj en vanlig armhävning.',
  ),
  exercise(
    'plank-arm-lift',
    'Planka med armlyft',
    ['Bål', 'Axlar'],
    [
      'Stöd på underarmar och tår. Håll nacke, rygg och ben i en linje och ha lite avstånd mellan fötterna.',
      'Sträck en arm framåt utan att vrida bäckenet. Stanna kort, sätt ned underarmen och växla arm.',
      'Räkna varje armlyft och återgång som en repetition totalt. Fortsätt växelvis och sätt ned knäna när setet är klart.',
    ],
    'Bäckenet vrids eller höften sjunker när armen lyfts.',
    'Behåll båda underarmarna i golvet och välj vanlig planka.',
    6,
  ),
];

export type BodyweightId = (typeof bodyweightIds)[number];
export const bodyweightIds = [
  'decline-push-up',
  'diamond-push-up',
  'plank-arm-lift',
  'push-up',
  'pull-up',
  'chin-up',
  'back-extension',
  'parallel-dip',
  'lying-leg-raise',
  'burpee',
  'plank',
  'squat-jump',
  'jumping-lunge',
  'mountain-climber',
  'knee-push-up',
  'wall-push-up',
  'calf-raise',
  'crunch',
] as const;

export const bodyweightDetails: Record<
  BodyweightId,
  {
    equipment: EquipmentType;
    level: TechnicalLevel;
    reason: string;
    primary: MuscleGroupId[];
    secondary: MuscleGroupId[];
    source: string;
    publisher: string;
    note: string;
  }
> = {
  'decline-push-up': {
    equipment: 'chair',
    level: 'technical',
    reason: 'Upphöjda fötter ökar kraven på press och bålkontroll.',
    primary: ['chest', 'shoulders'],
    secondary: ['triceps', 'core'],
    source:
      'https://www.nasm.org/resource-center/exercise-library/decline-push-up',
    publisher: 'NASM',
    note: 'Fötterna på en låg, stadig stol. Ingen extra vikt. Startdosen är appens förslag.',
  },
  'diamond-push-up': {
    equipment: 'bodyweight',
    level: 'technical',
    reason: 'Smalt handstöd kräver mer kontroll och tricepsstyrka.',
    primary: ['triceps', 'chest'],
    secondary: ['shoulders', 'core'],
    source:
      'https://www.puregym.com/exercises/chest/press-up/diamond-press-ups/',
    publisher: 'PureGym',
    note: 'Smalt handstöd under bröstet, med diamantform när det känns bekvämt. Ingen extra vikt.',
  },
  'plank-arm-lift': {
    equipment: 'bodyweight',
    level: 'practiced',
    reason: 'Bålen hålls stilla medan en arm i taget lämnar golvet.',
    primary: ['core'],
    secondary: ['shoulders', 'glutes'],
    source:
      'https://www.ucalgary.ca/shred-injuries/all-sports/soccer/front-plank-arm-lifts',
    publisher: 'University of Calgary',
    note: 'Underarmsplanka med växelvisa armlyft. Appen räknar varje armlyft totalt, medan källan anger repetitioner per arm.',
  },
  'push-up': {
    equipment: 'bodyweight',
    level: 'practiced',
    reason: 'Kroppen hålls stabil medan armarna bär kroppsvikten.',
    primary: ['chest', 'triceps'],
    secondary: ['shoulders', 'core'],
    source: 'https://www.nasm.org/resource-center/exercise-library/push-up',
    publisher: 'NASM',
    note: 'Kontrollerad golvvariant. Knästöd och vägg nämns som enklare alternativ, inte som den visade rörelsen.',
  },
  'pull-up': {
    equipment: 'pull-up-bar',
    level: 'technical',
    reason: 'Hela kroppsvikten dras upp med ett fast överhandsgrepp.',
    primary: ['back'],
    secondary: ['biceps', 'forearms', 'core'],
    source: 'https://www.nasm.org/resource-center/exercise-library/pull-up',
    publisher: 'NASM',
    note: 'Överhandsgrepp; separat från chins med underhandsgrepp.',
  },
  'chin-up': {
    equipment: 'pull-up-bar',
    level: 'technical',
    reason: 'Kroppsvikt, axelkontroll och grepp behöver samordnas.',
    primary: ['back', 'biceps'],
    secondary: ['forearms', 'core'],
    source:
      'https://www.acefitness.org/resources/everyone/exercise-library/190/chin-ups/',
    publisher: 'ACE',
    note: 'Underhandsgrepp, utan sving eller extra vikt.',
  },
  'back-extension': {
    equipment: 'bodyweight',
    level: 'basic',
    reason: 'Litet kontrollerat lyft med bäckenet kvar i golvet.',
    primary: ['back'],
    secondary: ['core'],
    source:
      'https://www.acefitness.org/resources/pros/expert-articles/7374/5-movements-to-improve-bone-and-joint-health/',
    publisher: 'ACE',
    note: 'Armar längs sidorna i stället för händer bakom huvudet. Ingen generell rekommendation för ryggrehab.',
  },
  'parallel-dip': {
    equipment: 'dip-bars',
    level: 'technical',
    reason: 'Hela kroppsvikten bärs av armarna med krav på axelkontroll.',
    primary: ['triceps', 'chest'],
    secondary: ['shoulders', 'core'],
    source: 'https://www.muscleandstrength.com/exercises/chest-dip.html',
    publisher: 'Muscle & Strength',
    note: 'Dipsställning krävs. Stol- och bänkvarianter visas inte.',
  },
  'lying-leg-raise': {
    equipment: 'bodyweight',
    level: 'practiced',
    reason: 'Bålen ska hållas stilla medan båda benen lyfts och sänks.',
    primary: ['hip-flexors', 'core'],
    secondary: [],
    source:
      'https://www.muscleandstrength.com/exercises/lying-floor-leg-raise.html',
    publisher: 'Muscle & Strength',
    note: 'Båda benen tillsammans; skiljer sig från AAOS ensidiga raka benlyft E31.',
  },
  burpee: {
    equipment: 'bodyweight',
    level: 'technical',
    reason: 'Flera rörelser, armhävning och landning behöver samordnas.',
    primary: ['quads', 'glutes', 'chest'],
    secondary: ['triceps', 'shoulders', 'core', 'calves'],
    source:
      'https://www.nasm.org/resource-center/exercise-library/squat-thrust-burpees',
    publisher: 'NASM',
    note: 'Appens uttryckliga variant har armhävning och ett litet upphopp. Dos och tempo är justerbara appförslag.',
  },
  plank: {
    equipment: 'bodyweight',
    level: 'basic',
    reason: 'Stilla position med underarmsstöd; hålltiden kan kortas.',
    primary: ['core'],
    secondary: ['shoulders', 'glutes'],
    source: 'https://www.nasm.org/resource-center/exercise-library/plank',
    publisher: 'NASM',
    note: 'Underarmsplanka med fri andning, separat från sidoplankan.',
  },
  'squat-jump': {
    equipment: 'bodyweight',
    level: 'technical',
    reason: 'Hopp och mjuk landning ställer högre krav än vanlig knäböj.',
    primary: ['quads', 'glutes', 'calves'],
    secondary: ['core'],
    source: 'https://www.nasm.org/resource-center/exercise-library/squat-jump',
    publisher: 'NASM',
    note: 'Kroppsvikt och litet hopp. Ingen extra vikt eller automatisk tilldelning till knärehab.',
  },
  'jumping-lunge': {
    equipment: 'bodyweight',
    level: 'technical',
    reason: 'Benbyte i luften och stabil landning kräver god kontroll.',
    primary: ['quads', 'glutes', 'calves'],
    secondary: ['core', 'hamstrings'],
    source: 'https://www.nasm.org/resource-center/exercise-library/lunge-jump',
    publisher: 'NASM',
    note: 'Varje benbyte räknas totalt. Övningen startas inte som separata höger- och vänsterset.',
  },
  'mountain-climber': {
    equipment: 'bodyweight',
    level: 'practiced',
    reason: 'Växelvisa benrörelser med stabilt handstöd och bäcken.',
    primary: ['core', 'hip-flexors'],
    secondary: ['shoulders', 'triceps'],
    source:
      'https://www.acefitness.org/resources/everyone/exercise-library/258/mountain-climbers/',
    publisher: 'ACE',
    note: 'Appen visar en lugnare växelvis variant, inte källans snabba samtidiga fotbyte. Tiden gäller båda benen tillsammans.',
  },
  'knee-push-up': {
    equipment: 'bodyweight',
    level: 'basic',
    reason: 'Knäna bär en del av kroppsvikten, vilket ger en lugnare start.',
    primary: ['chest', 'triceps'],
    secondary: ['shoulders', 'core'],
    source:
      'https://www.nasm.org/resource-center/exercise-library/modified-push-up',
    publisher: 'NASM',
    note: 'Knästödd armhävning (modified push-up) som steg mot den vanliga armhävningen.',
  },
  'wall-push-up': {
    equipment: 'bodyweight',
    level: 'basic',
    reason: 'Stående mot en vägg med lågt belastningskrav.',
    primary: ['chest', 'triceps'],
    secondary: ['shoulders', 'core'],
    source:
      'https://www.nasm.org/resource-center/exercise-library/incline-push-up',
    publisher: 'NASM',
    note: 'NASM beskriver lutande armhävning med händerna på en upphöjd yta, till exempel en vägg. Väggvarianten är det lättaste steget.',
  },
  'calf-raise': {
    equipment: 'bodyweight',
    level: 'basic',
    reason: 'Enkel, avgränsad rörelse på båda benen med valfritt stöd.',
    primary: ['calves'],
    secondary: [],
    source:
      'https://www.acefitness.org/resources/everyone/exercise-library/73/standing-calf-raises-wall/',
    publisher: 'ACE',
    note: 'Stående tåhävning med stöd mot vägg. Enklare steg före tåhävning på ett ben.',
  },
  crunch: {
    equipment: 'bodyweight',
    level: 'basic',
    reason: 'Litet lyft av huvud och axlar liggande på rygg.',
    primary: ['core'],
    secondary: [],
    source:
      'https://www.acefitness.org/resources/everyone/exercise-library/52/crunch/',
    publisher: 'ACE',
    note: 'Liten rörelse med kontrollerad nacke. Ingen extra belastning.',
  },
};

export function isBodyweightAddition(id: string): id is BodyweightId {
  return (bodyweightIds as readonly string[]).includes(id);
}
