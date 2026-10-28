import { Link } from 'wouter';

import type { Session } from '../../domain/types';

import { formatShortDate } from '../../lib/dates';

import { symptomText } from './CheckinHistory';

export function HistoryTrends({ sessions }: { sessions: Session[] }) {
  const recent = sessions.filter((s) => s.programId).slice(0, 8);

  return (
    <section
      aria-labelledby="history-trends"
      className="flex flex-col gap-4 border-t-[3px] border-ink pt-5"
    >
      <h2 id="history-trends" className="m-0 text-3xl font-bold">
        Besvär vid senaste passen
      </h2>
      <p className="m-0 text-base text-ink-soft">
        Läs samma kroppsdel och sida över tid. Olika besvär slås inte ihop till
        ett genomsnitt. Saknade svar räknas inte som besvärsfria.
      </p>
      {recent.length ? (
        <ol className="m-0 list-none p-0">
          {recent.map((session) => (
            <li
              key={session.id}
              className="border-t-2 border-edge py-3 text-base"
            >
              <Link
                href={`/historik/${session.id}`}
                className="flex min-h-12 items-center font-bold underline"
              >
                {formatShortDate(session.date)} ·{' '}
                {session.customWorkoutName ?? `Pass ${session.templateId}`}
              </Link>
              <p className="m-0">
                Före: {symptomText(session.checkins?.before?.symptoms)}
              </p>
              <p className="m-0">
                Efter: {symptomText(session.checkins?.after?.symptoms)}
              </p>
              <p className="m-0">
                Dagen efter:{' '}
                {session.checkins?.dayAfter
                  ? symptomText(session.checkins.dayAfter.symptoms)
                  : session.programId === 'rehab' ||
                      Object.values(session.checkins ?? {}).some(
                        (c) => c.symptoms,
                      ) ||
                      Object.values(session.feedback).some((f) => f?.symptoms)
                    ? 'Svar saknas'
                    : 'Inte efterfrågat'}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-base">
          Inga svar från nya träningspass ännu. Det ursprungliga programmets
          knäsmärta visas separat nedan.
        </p>
      )}
    </section>
  );
}
