import type { ExerciseId } from '../domain/types';
import { exerciseList, exercises } from './exercises';

export type Purpose = 'general' | 'knee' | 'running';
export type TechnicalLevel = 'basic' | 'practiced' | 'technical';
export type EquipmentType =
  | 'bodyweight'
  | 'dumbbell'
  | 'kettlebell'
  | 'support'
  | 'step'
  | 'chair'
  | 'band';
export const purposeLabels: Record<Purpose, string> = {
  general: 'Allmän styrka',
  knee: 'Knäfokus',
  running: 'Löpstyrka',
};
export const technicalLevelLabels: Record<TechnicalLevel, string> = {
  basic: 'Grundläggande',
  practiced: 'Viss vana',
  technical: 'Teknikkrävande',
};
export const equipmentLabels: Record<EquipmentType, string> = {
  bodyweight: 'Kroppsvikt',
  dumbbell: 'Hantlar',
  kettlebell: 'Kettlebell',
  support: 'Stabilt stöd / vägg',
  step: 'Steg',
  chair: 'Stol',
  band: 'Gummiband',
};
export interface EquipmentRequirement {
  type: EquipmentType;
  count: number;
}
export interface ExerciseVariant {
  id: string;
  label: string;
  equipment: EquipmentRequirement[];
  technicalLevel: TechnicalLevel;
  technicalReason: string;
  setup: string;
  cue: string;
  easierOption: string;
  defaultLoadIndex: number;
  /** Stable existing ladder indices belonging to this implement variant. */
  loadIndices: number[];
}
export interface ExerciseSource {
  title: string;
  url: string;
  publisher: string;
  note: string;
  page?: number;
}
export interface ExerciseMetadata {
  kind: 'strength' | 'mobility';
  purposes: Partial<Record<Purpose, string>>;
  variants: ExerciseVariant[];
  sources: ExerciseSource[];
  reviewedAt: string;
  sidePolicy: 'both' | 'choose-side' | 'alternating';
  /** Pause inside each repetition, never a whole-set countdown. */
  holdSeconds?: number;
  relaxSeconds?: number;
  easierExerciseId?: ExerciseId;
}

const aaosUrl =
  'https://orthoinfo.aaos.org/globalassets/pdfs/2017-rehab_knee.pdf';
const aceUrl =
  'https://www.acefitness.org/resources/everyone/exercise-library/';
const aaosPages: Partial<Record<ExerciseId, number>> = {
  'single-leg-calf-raise': 5,
  'half-squat': 4,
  'hamstring-curl': 4,
  'seated-knee-extension': 5,
  'straight-leg-raise': 6,
  'prone-leg-raise': 6,
  'side-lying-hip-abduction': 7,
  'side-lying-hip-adduction': 7,
  'calf-stretch': 2,
  'quadriceps-stretch': 2,
  'hamstring-stretch': 3,
  'band-leg-press': 8,
};
const aceSources: Partial<Record<ExerciseId, string>> = {
  'goblet-squat': '362/goblet-squat/',
  'supported-row': '126/single-arm-row/',
  'floor-press': '19/chest-press/',
  'farmer-carry': '359/farmer-s-carry/',
  'hammer-curl': '10/hammer-curl/',
  'triceps-kickback': '55/triceps-kickback/',
  'single-leg-rdl': '127/single-arm-single-leg-romanian-dead-lift/',
  'biceps-curl': '44/seated-biceps-curl/',
  'lateral-raise': '26/lateral-raise/',
  'glute-bridge': '49/glute-bridge/',
  'forward-lunge': '94/forward-lunge/',
};
const kneeReasons: Partial<Record<ExerciseId, string>> = {
  'goblet-chair-squat':
    'Kontrollerad knä- och höftsträckning med tydlig sitthöjd.',
  'step-up': 'Tränar kontrollerad uppstigning och nedsänkning på ett ben.',
  'split-squat': 'Tränar knä- och höftsträckning med fötterna kvar på plats.',
  'wall-sit': 'Statisk träning av framsida lår i ett självvalt djup.',
};
const runningReasons: Partial<Record<ExerciseId, string>> = {
  'goblet-chair-squat': 'Benstyrka genom knä- och höftsträckning.',
  'step-up': 'Enbensstyrka och kontroll vid uppstigning.',
  'single-leg-rdl': 'Höftstyrka och balans på ett stödben.',
  'dead-bug': 'Bålkontroll medan armar och ben rör sig.',
  'side-plank': 'Bålens och höftens sidokontroll.',
  'split-squat': 'Benstyrka i delad fotställning.',
  'single-leg-hip-thrust': 'Höftsträckning på ett stödben.',
  'single-leg-calf-raise': 'Vadstyrka på ett ben.',
  'suitcase-carry': 'Bålkontroll under gång med ensidig last.',
  'bird-dog': 'Kontroll av bål och bäcken vid motsatt arm- och benrörelse.',
  'glute-bridge': 'Grundläggande höftsträckning för säte och baksida lår.',
  'reverse-lunge': 'Kontrollerad benstyrka med steg bakåt.',
  'forward-lunge': 'Benstyrka och inbromsning av ett steg framåt.',
};
type VariantSeed = [EquipmentType, number, number[], string, EquipmentType?];
const variantSeeds: Record<ExerciseId, VariantSeed[]> = {
  'goblet-chair-squat': [
    [
      'bodyweight',
      1,
      [0],
      'Armarna framför kroppen, sitt och res dig utan extra vikt.',
      'chair',
    ],
    [
      'dumbbell',
      1,
      [1],
      'Håll hanteln med båda händerna nära bröstet.',
      'chair',
    ],
    [
      'kettlebell',
      1,
      [2],
      'Håll kettlebellen med båda händerna nära bröstet.',
      'chair',
    ],
  ],
  'step-up': [
    ['bodyweight', 1, [0], 'Utan extra vikt, hela foten på steget.', 'step'],
    [
      'dumbbell',
      2,
      [1, 2],
      'Håll en hantel i varje hand längs sidorna.',
      'step',
    ],
  ],
  'single-leg-rdl': [
    ['bodyweight', 1, [0], 'Låt armarna följa kroppen utan extra vikt.'],
    ['dumbbell', 1, [1], 'Håll hanteln i samma sidas hand som stödbenet.'],
    [
      'kettlebell',
      1,
      [2],
      'Håll kettlebellen i samma sidas hand som stödbenet.',
    ],
  ],
  'dead-bug': [['bodyweight', 1, [0], 'Arbeta utan extra vikt.']],
  'side-plank': [['bodyweight', 1, [0], 'Stöd på underarm och fötter.']],
  'split-squat': [
    [
      'bodyweight',
      1,
      [0],
      'Håll händerna mot väggen eller ett stabilt stöd.',
      'support',
    ],
    [
      'dumbbell',
      2,
      [1, 2],
      'Håll en hantel i varje hand; händerna kan då inte ge stöd.',
    ],
  ],
  'single-leg-hip-thrust': [
    [
      'bodyweight',
      1,
      [0],
      'Utan extra vikt, övre ryggen på det låga stödet.',
      'step',
    ],
    [
      'dumbbell',
      1,
      [1],
      'Ha övre ryggen mot ett lågt stöd och håll hanteln stadigt på höften.',
      'step',
    ],
    [
      'kettlebell',
      1,
      [2],
      'Ha övre ryggen mot ett lågt stöd och håll kettlebellen stadigt på höften.',
      'step',
    ],
  ],
  'single-leg-calf-raise': [
    ['bodyweight', 1, [0], 'Ta stöd mot väggen med händerna.', 'support'],
    [
      'dumbbell',
      1,
      [1],
      'Håll hanteln i en hand och stöd med den andra.',
      'support',
    ],
  ],
  'suitcase-carry': [
    ['dumbbell', 1, [0], 'Håll hanteln i den valda handen.'],
    ['kettlebell', 1, [1], 'Håll kettlebellen i den valda handen.'],
  ],
  'bird-dog': [
    ['bodyweight', 1, [0], 'Utgå från händer och knän utan extra vikt.'],
  ],
  'wall-sit': [
    [
      'bodyweight',
      1,
      [0],
      'Ryggen har hela tiden kontakt med väggen.',
      'support',
    ],
  ],
  'goblet-squat': [
    ['bodyweight', 1, [0], 'Håll armarna framför kroppen utan vikt.'],
    ['dumbbell', 1, [1], 'Håll hanteln med båda händerna vid bröstet.'],
    ['kettlebell', 1, [2], 'Håll kettlebellen med båda händerna vid bröstet.'],
  ],
  'kettlebell-deadlift': [
    ['kettlebell', 1, [0, 1], 'Greppa samma kettlebell med båda händerna.'],
  ],
  'dumbbell-rdl': [
    ['dumbbell', 2, [0, 1], 'Håll en hantel i varje hand framför benen.'],
    [
      'kettlebell',
      1,
      [2, 3],
      'Håll samma kettlebell med båda händerna framför låren.',
    ],
  ],
  'supported-row': [
    [
      'dumbbell',
      1,
      [0],
      'En hand bär hanteln, den andra vilar på ett stabilt stöd.',
      'support',
    ],
    [
      'kettlebell',
      1,
      [1],
      'En hand bär kettlebellen, den andra vilar på ett stabilt stöd.',
      'support',
    ],
  ],
  'floor-press': [
    [
      'dumbbell',
      2,
      [0, 1],
      'En hantel i varje hand; överarmarna når golvet i botten.',
    ],
  ],
  'shoulder-press': [
    [
      'dumbbell',
      2,
      [0, 1],
      'En hantel i varje hand, från axelhöjd till över huvudet.',
    ],
  ],
  'farmer-carry': [
    ['dumbbell', 2, [0], 'Håll en hantel i varje hand.'],
    ['kettlebell', 2, [1], 'Håll en kettlebell i varje hand.'],
  ],
  'biceps-curl': [
    ['dumbbell', 2, [0, 1], 'En hantel i varje hand, handflatorna framåt.'],
  ],
  'hammer-curl': [
    [
      'dumbbell',
      2,
      [0, 1],
      'En hantel i varje hand, handflatorna mot varandra.',
    ],
  ],
  'lateral-raise': [['dumbbell', 2, [0, 1], 'En lätt hantel i varje hand.']],
  'triceps-kickback': [
    [
      'dumbbell',
      1,
      [0, 1],
      'En hantel i den valda handen, den fria handen på stabilt stöd.',
      'support',
    ],
  ],
  'glute-bridge': [
    ['bodyweight', 1, [0], 'Båda fötterna och övre ryggen i golvet.'],
    [
      'dumbbell',
      1,
      [1],
      'Placera hanteln tvärs över höften och håll den med båda händerna.',
    ],
  ],
  'reverse-lunge': [
    ['bodyweight', 1, [0], 'Utan extra vikt; det valda benet stannar fram.'],
    [
      'dumbbell',
      2,
      [1],
      'En hantel i varje hand; det valda benet stannar fram.',
    ],
    [
      'kettlebell',
      1,
      [2, 3, 4],
      'Håll en kettlebell med båda händerna nära bröstet. Det valda benet stannar fram.',
    ],
  ],
  'forward-lunge': [
    ['bodyweight', 1, [0], 'Utan extra vikt; kliv fram med det valda benet.'],
    [
      'dumbbell',
      2,
      [1],
      'En hantel i varje hand; kliv fram med det valda benet.',
    ],
    [
      'kettlebell',
      1,
      [2, 3, 4],
      'Håll en kettlebell med båda händerna nära bröstet. Kliv fram med det valda benet.',
    ],
  ],
  'kettlebell-swing': [
    [
      'kettlebell',
      1,
      [0, 1],
      'Båda händerna greppar samma kettlebell; kraften kommer från höften.',
    ],
  ],
  'kettlebell-press': [
    [
      'kettlebell',
      1,
      [0, 1],
      'Kettlebellen vilar mot underarmen i startläget; använd den valda armen.',
    ],
  ],
  'half-squat': [
    [
      'bodyweight',
      1,
      [0],
      'Ta lätt handstöd och gör en grund knäböj.',
      'support',
    ],
  ],
  'hamstring-curl': [
    ['bodyweight', 1, [0], 'Stå med handstöd utan ankelvikt.', 'support'],
  ],
  'seated-knee-extension': [
    ['bodyweight', 1, [0], 'Sitt på en stabil stol utan ankelvikt.', 'chair'],
  ],
  'straight-leg-raise': [
    [
      'bodyweight',
      1,
      [0],
      'Underarmarna stödjer överkroppen; ingen ankelvikt.',
    ],
  ],
  'prone-leg-raise': [['bodyweight', 1, [0], 'Ligg på mage utan ankelvikt.']],
  'side-lying-hip-abduction': [
    ['bodyweight', 1, [0], 'Det valda benet är det övre; ingen ankelvikt.'],
  ],
  'side-lying-hip-adduction': [
    ['bodyweight', 1, [0], 'Det valda benet är det undre; ingen ankelvikt.'],
  ],
  'calf-stretch': [
    [
      'bodyweight',
      1,
      [0],
      'Det valda benet står bakom; händerna mot väggen.',
      'support',
    ],
  ],
  'quadriceps-stretch': [
    [
      'bodyweight',
      1,
      [0],
      'Stöd en hand mot väggen, den andra håller fotleden.',
      'support',
    ],
  ],
  'hamstring-stretch': [
    ['bodyweight', 1, [0], 'Händerna håller bakom låret, inte i knäleden.'],
  ],
  'band-leg-press': [
    [
      'band',
      1,
      [0],
      'Ett helt gummiband runt hålfoten med en ände i varje hand.',
    ],
  ],
  'kettlebell-floor-press': [
    [
      'kettlebell',
      1,
      [0, 1, 2],
      'En kettlebell i vald hand; den fria handen hjälper till vid start och avslut.',
    ],
  ],
  'kettlebell-rack-carry': [
    [
      'kettlebell',
      1,
      [0, 1, 2],
      'Greppa handtaget med en hand vid övre bröstet. Kulan vilar mot underarmens utsida; armbågen är nära revbenen.',
    ],
  ],
};

const technical: Partial<Record<ExerciseId, [TechnicalLevel, string]>> = {
  'half-squat': [
    'basic',
    'Två fötter i golvet och handstöd; sänk och res dig med kontroll.',
  ],
  'hamstring-curl': [
    'basic',
    'Handstödet hjälper balansen medan du böjer ett knä och håller låren stilla.',
  ],
  'single-leg-calf-raise': [
    'practiced',
    'Enbensbalans och en kontrollerad tåhävning, även med handstöd.',
  ],
  'seated-knee-extension': [
    'basic',
    'Stolen stödjer kroppen medan du sträcker ett knä.',
  ],
  'straight-leg-raise': [
    'basic',
    'Underarmarna stödjer kroppen; håll det lyfta knäet rakt.',
  ],
  'prone-leg-raise': [
    'basic',
    'Liggande med stöd från golvet; lyft benet utan att vrida bäckenet.',
  ],
  'side-lying-hip-abduction': [
    'basic',
    'Liggande med det undre benet som stöd; håll bäckenet stilla.',
  ],
  'side-lying-hip-adduction': [
    'practiced',
    'Placera det övre benet som stöd och lyft det undre utan att rulla kroppen.',
  ],
  'calf-stretch': [
    'basic',
    'Två fötter i golvet och händerna mot väggen ger stöd.',
  ],
  'quadriceps-stretch': [
    'practiced',
    'Balans på ett ben medan en hand håller fotleden och den andra tar stöd.',
  ],
  'hamstring-stretch': [
    'basic',
    'Liggande med golvstöd; händerna håller bakom låret.',
  ],
  'single-leg-rdl': [
    'technical',
    'Balans på ett ben samtidigt som höften fälls.',
  ],
  'side-plank': ['practiced', 'Kroppsvikten bärs på en underarm och fötterna.'],
  'split-squat': ['practiced', 'Kontroll av båda knäna i delad fotställning.'],
  'single-leg-hip-thrust': [
    'practiced',
    'Bäckenet hålls rakt med ett stödben.',
  ],
  'goblet-squat': ['practiced', 'Självvalt djup och kontroll utan stol.'],
  'kettlebell-deadlift': [
    'practiced',
    'Höftfällning och golvstart behöver samordnas.',
  ],
  'dumbbell-rdl': [
    'practiced',
    'Höftfällning med vikten nära benen och kontrollerad rygg.',
  ],
  'supported-row': ['practiced', 'Håll överkroppen stilla medan armen drar.'],
  'floor-press': [
    'practiced',
    'Två vikter måste sättas upp och sänkas kontrollerat.',
  ],
  'shoulder-press': [
    'practiced',
    'Två vikter över huvudet kräver bålkontroll.',
  ],
  'reverse-lunge': [
    'practiced',
    'Balans och steg bakåt samtidigt som knäna böjs.',
  ],
  'forward-lunge': [
    'practiced',
    'Kliv fram och bromsa kroppsvikten med kontroll.',
  ],
  'kettlebell-swing': [
    'technical',
    'Snabb höftfällning och timing av en svängande vikt.',
  ],
  'kettlebell-press': [
    'technical',
    'Ensidig last över huvudet och kontroll med vikten nära axeln.',
  ],
  'band-leg-press': [
    'practiced',
    'Bandets läge och motstånd kontrolleras under hela rörelsen.',
  ],
  'kettlebell-floor-press': [
    'practiced',
    'Ensidig press och kontrollerad förflyttning av vikten till och från golvet.',
  ],
  'kettlebell-rack-carry': [
    'practiced',
    'Håll axelposition och upprätt bål medan du går med ensidig last.',
  ],
};

function sourceFor(id: ExerciseId): ExerciseSource[] {
  if (id === 'kettlebell-floor-press')
    return [
      {
        title: 'Angles and Arches—Using the Floor to Strengthen Your Press',
        publisher: 'StrongFirst · Piers Kwan',
        url: 'https://www.strongfirst.com/using-the-floor-to-strengthen-your-press/',
        note: 'Enarms golvpress och start med rullning mot vikten. Appen visar böjda knän utan höftlyft; vikter och dos är justerbara appförslag.',
      },
    ];
  if (id === 'kettlebell-rack-carry')
    return [
      {
        title: 'Two Important Carries for the Clinician · Front Rack',
        publisher: 'StrongFirst · Travis Jewett',
        url: 'https://www.strongfirst.com/two-important-carries-clinician/',
        note: 'Gång med en kettlebell i axelposition. Appens sträcka och vikter är egna förslag; ingen individuell rehabiliteringsrekommendation.',
      },
    ];
  if (id === 'dumbbell-rdl')
    return [
      {
        title: 'Dumbbell Romanian Deadlift',
        publisher: 'National Academy of Sports Medicine',
        url: 'https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift',
        note: 'Höftfällning med två hantlar. Appen har även en variant med en kettlebell i båda händerna. Startvikter och dos är justerbara appförslag.',
      },
    ];
  if (id === 'reverse-lunge')
    return [
      {
        title: 'Reverse Lunge',
        publisher: 'Catalyst Athletics',
        url: 'https://www.catalystathletics.com/exercise/735/Reverse-Lunge/',
        note: 'Steg bakåt och kontrollerad sänkning; appen visar kroppsvikt, två hantlar eller en kettlebell vid bröstet.',
      },
      {
        title:
          'Fitness Matters, January/February 2010 · Kettlebell Walking Lunge',
        publisher: 'American Council on Exercise',
        url: 'https://contentcdn.eacefitness.com/cp/pdfs/FitnessMatters/Jan10.pdf',
        page: 10,
        note: 'Källan visar framåtriktade gångutfall med vikten vid bröstet. Appens bakåtutfall är en separat variant med samma grepp.',
      },
    ];
  if (id === 'forward-lunge')
    return [
      {
        title:
          'Fitness Matters, January/February 2010 · Kettlebell Walking Lunge',
        publisher: 'American Council on Exercise',
        url: 'https://contentcdn.eacefitness.com/cp/pdfs/FitnessMatters/Jan10.pdf',
        page: 10,
        note: 'Källan visar gångutfall med en kettlebell vid bröstet. Appen återgår till start efter varje framåtutfall och erbjuder även kroppsvikt eller hantlar.',
      },
    ];
  if (id === 'kettlebell-press')
    return [
      {
        title:
          'Fitness Matters, January/February 2010: Kettlebell Shoulder Press',
        publisher: 'American Council on Exercise',
        url: 'https://www.acefitness.org/cp/pdfs/FitnessMatters/Jan10.pdf',
        note: 'Handleden hålls rak med vikten nära axeln inför en press utan benhjälp. Appens variant börjar med vikten vid axeln.',
      },
    ];
  if (id === 'single-leg-rdl')
    return [
      {
        title: 'Single-arm, single-leg Romanian deadlift',
        publisher: 'American Council on Exercise',
        url: `${aceUrl}127/single-arm-single-leg-romanian-dead-lift/`,
        note: 'Källan visar vikt i motsatt hand mot stödbenet. Appens animation och instruktion visar vikten i samma sidas hand; detta är en egen variant.',
      },
    ];
  if (id === 'shoulder-press')
    return [
      {
        title: 'Standing Shoulder Press',
        publisher: 'American Council on Exercise',
        url: `${aceUrl}71/standing-shoulder-press/`,
        note: 'Källans pressprincip är stående med skivstång; appen använder en hantel i varje hand och kräver separat kontroll av vikterna.',
      },
    ];
  const page = aaosPages[id];
  if (page)
    return [
      {
        title: 'Knee Conditioning Program',
        publisher: 'AAOS / OrthoInfo',
        url: `${aaosUrl}#page=${page}`,
        page,
        note:
          id === 'single-leg-calf-raise'
            ? 'Motsvarar källans enbens tåhävning med stöd. Appens dos och tidigare belastningssteg är separata.'
            : 'Egen svensk sammanfattning av rörelsen. Val av övning, sida och dos görs med behandlare. Biblioteket lägger inte till ankelvikter eller kopierar källans träningsdos.',
      },
    ];
  if (id === 'kettlebell-swing' || id === 'kettlebell-deadlift')
    return [
      {
        title: 'How to Get Started With Kettlebells',
        publisher: 'American Council on Exercise',
        url: 'https://www.acefitness.org/resources/pros/expert-articles/5269/how-to-get-started-with-kettlebells/',
        note: 'Rörelseprinciper; appens startvikter och träningsdos är egna val. Pressen utförs strikt från axeln utan benhjälp.',
      },
    ];
  return [
    {
      title: 'Exercise Library',
      publisher: 'American Council on Exercise',
      url: `${aceUrl}${aceSources[id] ?? ''}`,
      note:
        id === 'floor-press'
          ? 'Pressprinciper från bröstpress; här begränsar golvet överarmarnas sänkning i stället för en bänk.'
          : 'Rörelseprinciper och anatomisk orientering. Appens varianter och tekniska nivå är redaktionella bedömningar, inte personliga rekommendationer.',
    },
  ];
}

export const exerciseMetadata = Object.fromEntries(
  exerciseList.map((exercise) => {
    const id = exercise.id;
    const [technicalLevel, technicalReason] = technical[id] ?? [
      'basic',
      'Lugn, avgränsad rörelse med en tydlig utgångsposition.',
    ];
    const page = aaosPages[id];
    const purposes: ExerciseMetadata['purposes'] = {};
    if (!page || id === 'single-leg-calf-raise')
      purposes.general = `Tränar ${exercise.muscles.slice(0, 2).join(' och ').toLocaleLowerCase('sv')}.`;
    if (kneeReasons[id]) purposes.knee = kneeReasons[id];
    if (page)
      purposes.knee =
        'Ingår som rörelse i AAOS knäkonditionering; övningsval och dos behöver anpassas med behandlare.';
    if (runningReasons[id]) purposes.running = runningReasons[id];
    const variants = variantSeeds[id].map(
      ([type, count, loadIndices, cue, support]): ExerciseVariant => ({
        id: type,
        label: `${type === 'bodyweight' ? 'Kroppsvikt' : type === 'dumbbell' ? `${count} ${count === 1 ? 'hantel' : 'hantlar'}` : type === 'kettlebell' ? `${count} ${count === 1 ? 'kettlebell' : 'kettlebells'}` : equipmentLabels[type]}${support ? ` + ${equipmentLabels[support].toLocaleLowerCase('sv')}` : ''}`,
        equipment: [
          { type, count },
          ...(support ? [{ type: support, count: 1 }] : []),
        ],
        technicalLevel:
          id === 'goblet-squat' && type === 'bodyweight'
            ? 'basic'
            : technicalLevel,
        technicalReason,
        setup: cue,
        cue,
        easierOption: exercise.easierVariant,
        defaultLoadIndex: loadIndices[0] ?? 0,
        loadIndices,
      }),
    );
    const metadata: ExerciseMetadata = {
      kind: id.endsWith('-stretch') ? 'mobility' : 'strength',
      purposes,
      variants,
      sources: sourceFor(id),
      reviewedAt: '2026-10-20',
      sidePolicy: exercise.perSide ? 'choose-side' : 'both',
    };
    if (page && exercise.unit === 'reps' && id !== 'single-leg-calf-raise')
      metadata.holdSeconds = id === 'band-leg-press' ? 2 : 5;
    if (
      [
        'prone-leg-raise',
        'side-lying-hip-abduction',
        'side-lying-hip-adduction',
      ].includes(id)
    )
      metadata.relaxSeconds = 2;
    if (id === 'kettlebell-swing')
      metadata.easierExerciseId = 'kettlebell-deadlift';
    if (id === 'single-leg-hip-thrust')
      metadata.easierExerciseId = 'glute-bridge';
    return [id, metadata];
  }),
) as Record<ExerciseId, ExerciseMetadata>;

export function variantForLoad(
  exerciseId: ExerciseId,
  index: number,
  variantId?: string,
): ExerciseVariant {
  const variants = exerciseMetadata[exerciseId].variants;
  const variant =
    variants.find((v) => v.id === variantId) ??
    variants.find((v) => v.loadIndices.includes(index)) ??
    variants[0];
  if (!variant) throw new Error('Exercise has no equipment variant');
  return variant;
}

export function variantEquipment(
  exerciseId: ExerciseId,
  index: number,
  variantId?: string,
) {
  const variant = variantForLoad(exerciseId, index, variantId);
  const tool = variant.equipment.find(
    (e) =>
      e.type === 'dumbbell' || e.type === 'kettlebell' || e.type === 'band',
  );
  const equipment: 'dumbbell' | 'kettlebell' | 'band' | null =
    tool?.type === 'dumbbell'
      ? 'dumbbell'
      : tool?.type === 'kettlebell'
        ? 'kettlebell'
        : tool?.type === 'band'
          ? 'band'
          : null;
  return {
    variant,
    equipment,
    load: exercises[exerciseId].loadLadder[index] ??
      exercises[exerciseId].loadLadder[variant.defaultLoadIndex] ?? {
        kg: 0,
        label: 'Kroppsvikt',
      },
  };
}
