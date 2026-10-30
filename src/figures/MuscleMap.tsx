import { useId } from 'react';
import { Link } from 'wouter';
import type { MuscleGroupId } from '../content/muscles';
import {
  exerciseMuscles,
  muscleFilterHref,
  muscleGroups,
  trainingQualities,
} from '../content/muscles';
import type { ExerciseId } from '../domain/types';

const ids: MuscleGroupId[] = [
  'tibialis',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'hip-abductors',
  'back',
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'hip-adductors',
  'hip-flexors',
];

const BODY_OUTLINE =
  'M51 30 L43 34 L35 59 L42 64 L44 84 L42 103 L39 137 L36 164 L47 164 L53 137 L60 112 L67 137 L73 164 L84 164 L81 137 L78 103 L76 84 L78 64 L85 59 L77 34 L69 30 Z';

const shapes: Record<MuscleGroupId, { side: 'front' | 'back'; d: string }[]> = {
  tibialis: [
    {
      side: 'front',
      d: 'M44 137 L49 137 L45 160 L40 160 Z M71 137 L76 137 L80 160 L75 160 Z',
    },
  ],
  quads: [
    { side: 'front', d: 'M42 104 Q50 100 58 104 L57 132 Q51 137 46 133 Z' },
    { side: 'front', d: 'M62 104 Q70 100 78 104 L74 133 Q69 137 63 132 Z' },
  ],
  hamstrings: [
    { side: 'back', d: 'M43 104 Q51 100 58 104 L56 133 Q50 137 45 132 Z' },
    { side: 'back', d: 'M62 104 Q70 100 78 104 L74 132 Q69 137 63 133 Z' },
  ],
  glutes: [{ side: 'back', d: 'M43 82 Q60 77 77 82 L75 101 Q60 106 45 101 Z' }],
  calves: [
    {
      side: 'back',
      d: 'M43 136 Q48 132 52 137 L47 158 Q43 163 40 159 L41 148 Z',
    },
    {
      side: 'back',
      d: 'M68 137 Q72 132 77 136 L79 148 L80 159 Q77 163 73 158 Z',
    },
  ],
  core: [{ side: 'front', d: 'M49 62 Q60 59 71 62 L72 81 Q60 85 48 81 Z' }],
  'hip-abductors': [
    {
      side: 'front',
      d: 'M41 82 Q46 79 50 83 L48 100 Q44 103 41 99 Z M70 83 Q75 79 79 82 L79 99 Q76 103 72 100 Z',
    },
  ],
  back: [{ side: 'back', d: 'M49 53 Q60 50 71 53 L73 82 Q60 86 47 82 Z' }],
  chest: [{ side: 'front', d: 'M46 39 Q60 34 74 39 L73 56 Q60 61 47 56 Z' }],
  shoulders: [
    {
      side: 'front',
      d: 'M43 34 Q48 34 49 42 L43 53 L37 49 Z M77 34 Q72 34 71 42 L77 53 L83 49 Z',
    },
    {
      side: 'back',
      d: 'M43 34 Q48 34 49 42 L43 53 L37 49 Z M77 34 Q72 34 71 42 L77 53 L83 49 Z',
    },
  ],
  biceps: [
    {
      side: 'front',
      d: 'M37 50 L44 52 L41 65 L36 63 Z M76 52 L83 50 L84 63 L79 65 Z',
    },
  ],
  triceps: [
    {
      side: 'back',
      d: 'M37 50 L44 52 L41 65 L36 63 Z M76 52 L83 50 L84 63 L79 65 Z',
    },
  ],
  forearms: [
    {
      side: 'front',
      d: 'M36 64 L41 66 L44 82 L39 83 Z M79 66 L84 64 L81 83 L76 82 Z',
    },
    {
      side: 'back',
      d: 'M36 64 L41 66 L44 82 L39 83 Z M79 66 L84 64 L81 83 L76 82 Z',
    },
  ],
  'hip-adductors': [
    {
      side: 'front',
      d: 'M53 103 L59 107 L57 130 L52 129 Z M61 107 L67 103 L68 129 L63 130 Z',
    },
  ],
  'hip-flexors': [
    {
      side: 'front',
      d: 'M48 82 Q53 79 58 82 L56 94 L51 99 L47 94 Z M62 82 Q67 79 72 82 L73 94 L69 99 L64 94 Z',
    },
  ],
};

function rolesFor(exerciseId: ExerciseId) {
  const mapping = exerciseMuscles[exerciseId];
  return new Map<MuscleGroupId, 'primary' | 'secondary'>([
    ...mapping.primary.map((id) => [id, 'primary'] as const),
    ...mapping.secondary.map((id) => [id, 'secondary'] as const),
  ]);
}

function Body({
  side,
  roles,
}: {
  side: 'front' | 'back';
  roles: Map<MuscleGroupId, 'primary' | 'secondary'>;
}) {
  const patternId = `support-${side}-${useId().replace(/:/g, '')}`;
  const clipId = `${patternId}-body`;
  return (
    <svg
      viewBox="0 0 120 174"
      role="img"
      aria-label={side === 'front' ? 'Kropp framifrån' : 'Kropp bakifrån'}
      className="h-44 w-full"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BODY_OUTLINE} />
        </clipPath>
        <pattern
          id={patternId}
          width="5"
          height="5"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="5" height="5" fill="var(--paper)" />
          <path d="M0 0V5" stroke="var(--accent)" strokeWidth="2" />
        </pattern>
      </defs>
      <g
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        <circle cx="60" cy="19" r="10" />
        <path d={BODY_OUTLINE} />
        <path d="M43 36 L30 43 L20 68 L25 72 L39 58 M77 36 L90 43 L100 68 L95 72 L81 58" />
      </g>
      {ids.flatMap((id) => {
        const role = roles.get(id);
        if (!role) return [];
        return shapes[id]
          .filter((shape) => shape.side === side)
          .map(({ d }) => (
            <path
              key={`${id}-${d}`}
              d={d}
              clipPath={`url(#${clipId})`}
              fill={role === 'primary' ? 'var(--accent)' : `url(#${patternId})`}
              fillOpacity={role === 'primary' ? 0.48 : 1}
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          ));
      })}
    </svg>
  );
}

export function MuscleMap({ exerciseId }: { exerciseId: ExerciseId }) {
  const roles = rolesFor(exerciseId);
  const titleId = `muscle-map-title-${useId().replace(/:/g, '')}`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="m-0 text-2xl font-bold">
        Muskler
      </h2>
      <p className="m-0 text-base text-ink-soft">
        Ungefärliga områden som övningen tränar.
      </p>
      <div className="grid grid-cols-2 gap-2" aria-hidden="false">
        <figure className="m-0 min-w-0">
          <Body side="front" roles={roles} />
          <figcaption className="text-center text-base font-bold">
            Framifrån
          </figcaption>
        </figure>
        <figure className="m-0 min-w-0">
          <Body side="back" roles={roles} />
          <figcaption className="text-center text-base font-bold">
            Bakifrån
          </figcaption>
        </figure>
      </div>
      <div className="flex flex-col gap-2 text-base">
        <p className="m-0 flex items-center gap-2">
          <LegendSwatch kind="primary" />
          Heldragen yta: tränar främst
        </p>
        <p className="m-0 flex items-center gap-2">
          <LegendSwatch kind="secondary" />
          Streckad yta: hjälper till
        </p>
      </div>
    </section>
  );
}

function LegendSwatch({ kind }: { kind: 'primary' | 'secondary' }) {
  const patternId = `legend-${kind}-${useId().replace(/:/g, '')}`;
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0">
      <defs>
        <pattern
          id={patternId}
          width="4"
          height="4"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="4" height="4" fill="var(--paper)" />
          <path d="M0 0V4" stroke="var(--accent)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
        fill={kind === 'primary' ? 'var(--accent)' : `url(#${patternId})`}
        stroke="var(--accent)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function MuscleFocus({ exerciseId }: { exerciseId: ExerciseId }) {
  const mapping = exerciseMuscles[exerciseId];
  const qualities = mapping.qualities;
  return (
    <section aria-label="Träningsfokus" className="flex flex-col gap-2">
      <GroupLinks label="Tränar främst" ids={mapping.primary} />
      {mapping.secondary.length > 0 ? (
        <GroupLinks label="Hjälper till" ids={mapping.secondary} />
      ) : (
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-base font-bold">Hjälper till</h2>
          <p className="m-0 text-base">Inga särskilda muskelgrupper.</p>
        </div>
      )}
      {qualities.length > 0 ? (
        <p className="m-0 text-base">
          <strong>Tränar också:</strong>{' '}
          {qualities.map((id) => trainingQualities[id].label).join(', ')}
        </p>
      ) : null}
    </section>
  );
}

function GroupLinks({
  label,
  ids: groupIds,
}: {
  label: string;
  ids: MuscleGroupId[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-base font-bold">{label}</h2>
      <div className="flex flex-wrap gap-2">
        {groupIds.map((id) => (
          <Link
            key={id}
            href={muscleFilterHref(id)}
            className="inline-flex min-h-12 items-center rounded-md border-2 border-edge px-3 text-base font-bold underline decoration-2 underline-offset-4"
          >
            {muscleGroups[id].label}
          </Link>
        ))}
      </div>
    </div>
  );
}
