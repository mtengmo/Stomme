import { useLiveQuery } from 'dexie-react-hooks';
import { type ReactNode, useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { isTrainingPreferences, trainingName } from '../../content/programmes';
import { getDb } from '../../db/db';
import { readTrainingProgram } from '../../db/program';
import { getMeta, listSessions } from '../../db/repo';
import { canReplaceTrainingPreparation } from '../../db/training';
import { nextTemplateId } from '../../rules/schedule';
import { Icon } from '../../ui/Icon';
import { ProgramRedoEnd } from './ProgramConfirm';

const rowClass =
  'flex min-h-14 w-full items-center gap-3 border-b-2 border-edge py-2 text-left text-ink no-underline focus-visible:outline-offset-[-4px]';

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg leading-tight font-bold">{label}</span>
        {hint ? <span className="text-base text-ink-soft">{hint}</span> : null}
      </span>
      {children}
      <Icon name="back" className="shrink-0 rotate-180" />
    </>
  );
}

/**
 * "/mitt-program": the programme-level actions that used to sit in Home's
 * "Ändra" drawer. For a general programme: redo, change direction, end, my
 * equipment. Without a programme (and for rehab): change direction, equipment
 * and the other A/B pass.
 */
export function MyProgram() {
  const [view, setView] = useState<'menu' | 'redo' | 'end'>('menu');
  const [, navigate] = useLocation();
  const data = useLiveQuery(async () => {
    const [preferences, sessions] = await Promise.all([
      getMeta(getDb(), 'training'),
      listSessions(getDb()),
    ]);
    const active = sessions.find((session) => session.status === 'in_progress');
    const preparationId =
      active && (await canReplaceTrainingPreparation(getDb(), active))
        ? active.id
        : undefined;
    const program =
      isTrainingPreferences(preferences) && preferences.programId === 'general'
        ? await readTrainingProgram(getDb())
        : null;
    return { preferences, sessions, program, preparationId };
  }, []);
  if (!data) return null;
  const preferences = isTrainingPreferences(data.preferences)
    ? data.preferences
    : undefined;
  if (!preferences) return <Redirect to="/" />;
  const active = data.sessions.find(
    (session) => session.status === 'in_progress',
  );
  const locked = !!active && active.id !== data.preparationId;
  const program = data.program;
  // The programme was just ended: back to Idag, which falls back to the plain Home.
  if (view === 'end' && !program) return <Redirect to="/" />;

  if (program && view !== 'menu')
    return (
      <ProgramRedoEnd
        mode={view}
        preferences={preferences}
        program={program}
        onKeep={() => setView('menu')}
        onRebuilt={() => navigate('/')}
      />
    );

  const recent = data.sessions.filter(
    (session) =>
      session.programId === preferences.programId &&
      (session.programId !== 'rehab' ||
        (session.rehabFocus ?? 'custom') ===
          (preferences.rehabFocus ?? 'custom')) &&
      session.status !== 'in_progress',
  );
  const nextId = nextTemplateId(recent, preferences.programId);
  const alternateId = (active?.templateId ?? nextId) === 'A' ? 'B' : 'A';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <h1 className="m-0 text-5xl leading-none font-extrabold">Mitt program</h1>
      <p className="m-0 text-lg font-bold">
        {trainingName(preferences)}
        {program
          ? ` · block ${program.block}, ${program.daysPerWeek} pass i veckan`
          : ''}
      </p>
      <ul className="m-0 flex list-none flex-col border-t-[3px] border-ink p-0">
        <li>
          <Link
            href="/installningar/utrustning?tillbaka=traning"
            className={rowClass}
          >
            <Row label="Min utrustning" hint="Vad du tränar med hemma" />
          </Link>
        </li>
        <li>
          {locked ? (
            <span aria-disabled="true" className={`${rowClass} opacity-50`}>
              <Row label="Byt inriktning" />
            </span>
          ) : (
            <Link
              href="/?andra=utrustning&tillbaka=mitt-program"
              className={rowClass}
            >
              <Row label="Byt inriktning" hint="Allmän träning eller rehab" />
            </Link>
          )}
        </li>
        {program ? (
          <>
            <li>
              <button
                type="button"
                disabled={locked}
                onClick={() => setView('redo')}
                className={`${rowClass} disabled:opacity-50`}
              >
                <Row
                  label="Gör om programmet"
                  hint="Nytt block med din utrustning nu"
                />
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={locked}
                onClick={() => setView('end')}
                className={`${rowClass} disabled:opacity-50`}
              >
                <Row label="Avsluta programmet" />
              </button>
            </li>
          </>
        ) : preferences.programId !== 'rehab' && !locked ? (
          <li>
            <Link href={`/traning/${alternateId}`} className={rowClass}>
              <Row label={`Visa pass ${alternateId} i stället`} />
            </Link>
          </li>
        ) : null}
      </ul>
      {locked ? (
        <p className="m-0 text-base text-ink-soft">
          {program
            ? 'Avsluta eller avbryt passet innan du ändrar programmet.'
            : 'Avsluta eller avbryt passet innan du byter inriktning.'}
        </p>
      ) : null}
    </div>
  );
}
