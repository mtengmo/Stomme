import type { ExerciseId } from '../domain/types';
import type {
  EquipmentType,
  ExerciseMetadata,
  TechnicalLevel,
} from './exerciseMetadata';
import { kneeStrengthExercises } from './kneeStrengthExercises';

const details: Record<
  string,
  [EquipmentType, TechnicalLevel, string, string, string, string]
> = {
  'bosu-squat': [
    'bosu',
    'technical',
    'Instabilt underlag kräver god balans och kontrollerad knäböj.',
    'BOSU FAQs',
    'BOSU',
    'https://bosu.com/pages/faqs',
  ],
  'copenhagen-hold': [
    'bench',
    'practiced',
    'Övre knät bär kroppsvikt medan bäckenet hålls uppe.',
    'Short Copenhagen isometric',
    'Fysio Fitaal',
    'https://fysiofitaal.nl/en/exercise/short-copenhagen-isometric/',
  ],
  'nordic-hamstring-curl': [
    'nordic-anchor',
    'technical',
    'Stor excentrisk belastning kräver säker fixering och kontrollerad mottagning med händerna.',
    'SHARP study protocol',
    'SHARP / PubMed Central',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC9664273/',
  ],
  'bent-knee-calf-hold': [
    'support',
    'practiced',
    'Enbenshåll med fortsatt knäböj och handstöd.',
    'Bent Knee Single Leg Calf Raise Isometric',
    'Foundation Podiatry',
    'https://www.foundationpodiatry.com.au/bent-knee-single-leg-calf-raise-isometric/',
  ],
  'wall-tibialis-raise': [
    'support',
    'basic',
    'Väggen stöder ryggen medan hälarna ligger stilla.',
    'Tibialis raises',
    'Hinge Health',
    'https://www.hingehealth.com/resources/articles/tibialis-raises/',
  ],
};

export const kneeStrengthMetadata: Partial<
  Record<ExerciseId, ExerciseMetadata>
> = Object.fromEntries(
  kneeStrengthExercises.map((exercise) => {
    const [gear, technicalLevel, technicalReason, title, publisher, url] =
      details[exercise.id] ??
      (() => {
        throw new Error(`Missing knee metadata: ${exercise.id}`);
      })();
    const doseNote =
      'Appens startintervall är redaktionella, redigerbara förslag och inte individuell ordination eller generell behandling av knäsmärta.';
    return [
      exercise.id,
      {
        kind: 'strength',
        purposes: {
          general: `Tränar ${exercise.muscles.join(' och ').toLocaleLowerCase('sv')}.`,
        },
        variants: [
          {
            id: 'bodyweight',
            label: 'Kroppsvikt med stödutrustning',
            equipment: [
              { type: 'bodyweight', count: 1 },
              { type: gear, count: 1 },
            ],
            technicalLevel,
            technicalReason,
            setup: exercise.tips[0],
            cue: exercise.tips[1],
            easierOption: exercise.easierVariant,
            defaultLoadIndex: 0,
            loadIndices: [0],
          },
        ],
        sources: [
          {
            title,
            publisher,
            url,
            note: `${exercise.id === 'bosu-squat' ? 'Tillverkaren avråder från att stå på plattformsidan. Appen visar kupolen uppåt. ' : exercise.id === 'nordic-hamstring-curl' ? 'Fixerade anklar, bromsad sänkning och handassisterad återgång. ' : ''}${doseNote}`,
          },
        ],
        reviewedAt: '2026-10-30',
        sidePolicy: exercise.perSide ? 'choose-side' : 'both',
        ...(exercise.id === 'bosu-squat'
          ? { easierExerciseId: 'goblet-chair-squat' }
          : {}),
        ...(exercise.id === 'nordic-hamstring-curl'
          ? { easierExerciseId: 'hamstring-curl' }
          : {}),
      } satisfies ExerciseMetadata,
    ];
  }),
);
