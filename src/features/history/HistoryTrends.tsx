import { Link } from 'wouter';

import type { Session } from '../../domain/types';

import { addDays, formatShortDate, weekStart } from '../../lib/dates';

import { symptomText } from './CheckinHistory';

export function HistoryTrends({
  sessions,
  today,
}: {
  sessions: Session[];
  today: string;
}) {
  const weeks = [3, 2, 1, 0].map((n) => addDays(weekStart(today), -7 * n));

  const recent = sessions.filter((s) => s.programId).slice(0, 8);

  return (
    <section
      aria-labelledby="history-trends"
      className="flex flex-col gap-4 border-t-[3px] border-ink pt-5"
    >
      <h2 id="history-trends" className="m-0 text-3xl font-bold">
        Träningsvanor och besvär
      </h2>
      <p className="m-0 text-base text-ink-soft">
        Följer filtren ovan. Frekvens visar avslutade pass, inte medicinsk
        förbättring.
      </p>
      <table className="w-full border-collapse text-left text-base">
        <caption className="pb-2 text-left text-xl font-bold">
          Pass per vecka · senaste 4 veckorna
        </caption>
        <thead>
          <tr>
            <th scope="col" className="py-2">
              Vecka från
            </th>
            <th scope="col">Klara</th>
            <th scope="col">Avbrutna</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week} className="border-t-2 border-edge">
              <th scope="row" className="py-3 font-normal">
                {formatShortDate(week)}
              </th>
              <td>
                {
                  sessions.filter(
                    (s) =>
                      weekStart(s.date) === week && s.status === 'completed',
                  ).length
                }
              </td>
              <td>
                {
                  sessions.filter(
                    (s) => weekStart(s.date) === week && s.status === 'aborted',
                  ).length
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="m-0 text-xl font-bold">Besvär vid senaste passen</h3>
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
                {formatShortDate(session.date)} · Pass {session.templateId}
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
