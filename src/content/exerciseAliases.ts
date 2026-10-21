import type { ExerciseId } from '../domain/types';

/** Searchable names and common terms; stable catalogue IDs stay unchanged. */
export const exerciseAliases: Record<ExerciseId, string[]> = {
  'goblet-chair-squat': ['Stolknäböj', 'Gobletknäböj till stol', 'Chair squat'],
  'step-up': ['Uppsteg på låda', 'Uppsteg', 'Step up', 'Step-up'],
  'single-leg-rdl': [
    'Enbensmarklyft',
    'Enbens rumänskt marklyft',
    'Single-leg Romanian deadlift',
  ],
  'dead-bug': ['Dead bug', 'Döda insekten'],
  'side-plank': ['Sidoplanka', 'Side plank'],
  'split-squat': ['Stationärt utfall', 'Split squat', 'Utfall på stället'],
  'single-leg-hip-thrust': [
    'Enbens bäckenlyft med ryggstöd',
    'Enbens höftlyft mot bänk',
    'Single-leg hip thrust',
  ],
  'single-leg-calf-raise': ['Enbens tåhävning', 'Tåhävning på ett ben'],
  'suitcase-carry': ['Väskbärning', 'Suitcase carry', 'Ensidig bärövning'],
  'bird-dog': ['Fågelhund', 'Bird dog'],
  'wall-sit': ['Väggsittning', 'Wall sit'],
  'goblet-squat': ['Gobletknäböj', 'Knäböj med vikt framför bröstet'],
  'kettlebell-deadlift': ['Marklyft med kettlebell', 'Kettlebellmarklyft'],
  'dumbbell-rdl': ['Rumänskt marklyft med hantlar', 'Hantel-RDL'],
  'supported-row': ['Enarmsrodd med stöd', 'Stödd rodd', 'Supported row'],
  'floor-press': ['Bröstpress på golv', 'Hantelpress på golv', 'Floor press'],
  'shoulder-press': ['Axelpress', 'Hantelpress över huvudet'],
  'farmer-carry': ['Farmarbärning', 'Farmer carry', 'Bära hantlar'],
  'biceps-curl': ['Bicepscurl', 'Bicepscurl med hantlar'],
  'hammer-curl': ['Hammercurl', 'Hammer curl'],
  'lateral-raise': ['Sidolyft', 'Hantellyft åt sidan'],
  'triceps-kickback': ['Tricepskickback', 'Tricepssträck bakåt'],
  'glute-bridge': ['Bäckenlyft', 'Höftlyft på golv', 'Glute bridge'],
  'reverse-lunge': ['Utfall bakåt', 'Bakåtutfall', 'Reverse lunge'],
  'forward-lunge': ['Utfall framåt', 'Framåtutfall', 'Forward lunge'],
  'kettlebell-swing': ['Kettlebellsving', 'Sving med kettlebell'],
  'kettlebell-press': ['Enarms axelpress med kettlebell', 'Kettlebellpress'],
  'half-squat': ['Halvknäböj', 'Knäböj med kort rörelse'],
  'hamstring-curl': ['Lårcurl', 'Böjning av knä mot motstånd'],
  'seated-knee-extension': ['Sittande knästräckning', 'Knäextension sittande'],
  'straight-leg-raise': ['Rakt benlyft', 'Lyft av rakt ben'],
  'prone-leg-raise': ['Magliggande benlyft', 'Benlyft liggande på mage'],
  'side-lying-hip-abduction': [
    'Sidliggande höftabduktion',
    'Benlyft åt sidan liggande',
  ],
  'side-lying-hip-adduction': [
    'Sidliggande höftadduktion',
    'Undre benlyft liggande på sidan',
  ],
  'calf-stretch': ['Vadstretch', 'Stretch av vadmuskeln'],
  'quadriceps-stretch': ['Framsida lår-stretch', 'Quadricepsstretch'],
  'hamstring-stretch': ['Baksida lår-stretch', 'Hamstringsstretch'],
  'band-leg-press': ['Benpress med gummiband', 'Gummibandsbenpress'],
  'kettlebell-floor-press': [
    'Bröstpress med kettlebell på golv',
    'Kettlebell floor press',
  ],
  'kettlebell-rack-carry': [
    'Rackbärning med kettlebell',
    'Kettlebell rack carry',
    'Bära kettlebell i rack',
  ],
  'rear-foot-split-squat': [
    'Bulgariskt utfall',
    'Bulgarian split squat',
    'Bulgarian squats med fot på stol',
    'Bakre fot upphöjd split squat',
  ],
  'bench-side-plank-leg-lift': [
    'Sidoplanka på bänk m. benlyft',
    'Sidoplanka på bänk med benlyft',
    'Copenhagen lower-leg lift',
  ],
  'kneeling-hip-flexor-stretch': [
    'Höftböjare 2',
    'Halvknästående höftböjarstretch',
    'Half-kneeling hip flexor stretch',
  ],
  'prone-on-forearms': [
    'Höftböjaren 8',
    'Magliggande på underarmar',
    'Prone on elbows',
  ],
  'heel-slide': ['Liggande korsrygg-kontroll 2', 'Hälglidning', 'Heel slide'],
  'balance-pendulum': [
    'Balans-pendel på ett ben',
    'Enbenspendel',
    'Single-leg balance hinge to knee drive',
  ],
  'single-leg-chair-squat': [
    'Enbensknäböj till stol',
    'Single-leg sit-to-stand',
  ],
  'single-leg-floor-bridge': [
    'Ettbens bäckenlyft',
    'Enbens bäckenlyft på golv',
    'Single-leg floor bridge',
  ],
};

/** Preferred catalogue labels for existing entries; applying these is a separate UI/content change. */
export const preferredExerciseNames: Partial<Record<ExerciseId, string>> = {
  'step-up': 'Uppsteg på låda (step-up)',
  'split-squat': 'Stationärt utfall (split squat)',
  'reverse-lunge': 'Utfall bakåt',
  'forward-lunge': 'Utfall framåt',
  'single-leg-hip-thrust': 'Enbens bäckenlyft med ryggstöd',
  'rear-foot-split-squat': 'Bulgariskt utfall på bänk',
  'bench-side-plank-leg-lift': 'Sidoplanka på bänk med benlyft',
  'kneeling-hip-flexor-stretch': 'Höftböjarstretch i halvknästående',
  'prone-on-forearms': 'Magliggande på underarmar',
  'heel-slide': 'Hälglidning med bålkontroll',
  'balance-pendulum': 'Balanspendel på ett ben',
  'single-leg-chair-squat': 'Enbensknäböj till stol',
  'single-leg-floor-bridge': 'Enbens bäckenlyft på golv',
};

/** Text used by catalogue search, including names, aliases and stable identifiers. */
export function exerciseSearchText(id: ExerciseId): string {
  return [preferredExerciseNames[id], ...exerciseAliases[id], id]
    .filter((part): part is string => Boolean(part))
    .join(' ');
}
