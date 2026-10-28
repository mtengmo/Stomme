import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { exercises } from '../../content/exercises';
import { isTrainingPreferences } from '../../content/programmes';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import type {
  ExerciseId,
  PlannedExercise,
  Session,
  SetLog,
  TrainingPreferences,
} from '../../domain/types';
import { harderExerciseSuggestions } from '../../rules/exerciseProgression';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';

export function NextLevelSuggestions({
  plan,
  preferences,
  sessions,
  logs,
  onChoose,
}: {
  plan: PlannedExercise[];
  preferences: TrainingPreferences;
  sessions: Session[];
  logs: SetLog[];
  onChoose?: (from: ExerciseId, to: ExerciseId) => void;
}) {
  const suggestions = plan.flatMap((item) =>
    harderExerciseSuggestions(item.exerciseId, preferences, sessions, logs)
      .filter((id) => !plan.some((entry) => entry.exerciseId === id))
      .map((id) => ({ from: item.exerciseId, to: id })),
  );
  if (!suggestions.length) return null;
  return (
    <section
      aria-labelledby="next-level-title"
      className="flex flex-col gap-3 border-t-[3px] border-ink pt-4"
    >
      <h2 id="next-level-title" className="m-0 text-2xl font-bold">
        Prova nästa nivå
      </h2>
      <p className="m-0 text-base">
        Två avslutade pass med alla set i övre delen av intervallet och
        ansträngning lätt. Du väljer själv om du vill byta.
      </p>
      <ul className="m-0 list-none p-0">
        {suggestions.map(({ from, to }) => (
          <li
            key={`${from}-${to}`}
            className="flex flex-col gap-2 border-t-2 border-edge py-3"
          >
            <p className="m-0 text-base">
              Efter {exercises[from].name.toLocaleLowerCase('sv')}:
            </p>
            <Link
              href={`/ovning/${to}`}
              className="flex min-h-12 items-center text-lg font-bold underline"
            >
              {exercises[to].name}
            </Link>
            <ExerciseDifficulty exerciseId={to} />
            {onChoose ? (
              <button
                type="button"
                className="min-h-12 rounded-sm border-2 border-ink px-3 text-base font-bold"
                onClick={() => onChoose(from, to)}
              >
                Byt till {exercises[to].name.toLocaleLowerCase('sv')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="m-0 text-base text-ink-soft">
        Börja med den nya övningens startdos och granska tekniken. Du kan alltid
        behålla den nuvarande övningen.
      </p>
    </section>
  );
}

export function SummaryNextLevel({ session }: { session: Session }) {
  const data = useLiveQuery(
    async () => ({
      preferences: await getMeta(getDb(), 'training'),
      sessions: await listSessions(getDb()),
      logs: await getDb().setLogs.toArray(),
    }),
    [],
  );
  if (
    !data ||
    session.status !== 'completed' ||
    !isTrainingPreferences(data.preferences) ||
    session.programId !== data.preferences.programId
  )
    return null;
  return (
    <NextLevelSuggestions
      plan={session.plan}
      preferences={data.preferences}
      sessions={data.sessions}
      logs={data.logs}
    />
  );
}
