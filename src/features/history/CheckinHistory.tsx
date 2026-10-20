import { exercises } from '../../content/exercises';
import type { Session, SymptomReport } from '../../domain/types';
import { EFFORT_LABEL } from './labels';

export const sideLabels = {
  right: 'höger',
  left: 'vänster',
  both: 'båda',
  unspecified: 'ej angiven',
};

export function symptomText(report: SymptomReport | null | undefined) {
  return report === undefined
    ? 'Svar saknas'
    : report === null
      ? 'Inga besvär'
      : `${report.area} · ${sideLabels[report.side]} · ${report.score}/10`;
}

const feelings = {
  ready: 'Redo att träna',
  tired: 'Trött',
  good: 'Bra',
  mixed: 'Blandat',
  difficult: 'Jobbigt',
};

export function CheckinHistory({ session }: { session: Session }) {
  const during = Object.entries(session.feedback).filter(
    ([, f]) => f?.symptoms !== undefined,
  );

  const nextDayExpected =
    session.programId === 'rehab' ||
    Object.values(session.checkins ?? {}).some((c) => c.symptoms !== null) ||
    during.some(([, f]) => f?.symptoms);

  return (
    <section aria-labelledby="checkin-history" className="flex flex-col gap-3">
      <h2 id="checkin-history" className="m-0 text-3xl font-bold">
        Känsla och besvär
      </h2>
      <p className="m-0 text-base text-ink-soft">
        Ansträngning och besvär är separata svar. Ett saknat svar betyder inte
        noll besvär.
      </p>
      <dl className="m-0">
        {(['before', 'after', 'dayAfter'] as const).map((timing) => {
          const check = session.checkins?.[timing];

          return (
            <div key={timing} className="border-b-2 border-edge py-3">
              <dt className="text-lg font-bold">
                {
                  {
                    before: 'Före passet',
                    after: 'Efter passet',
                    dayAfter: 'Dagen efter',
                  }[timing]
                }
              </dt>
              <dd className="m-0 text-base">
                {check
                  ? `${feelings[check.feeling]} · ${symptomText(check.symptoms)}`
                  : timing === 'dayAfter' && !nextDayExpected
                    ? 'Inte efterfrågat'
                    : 'Svar saknas'}
              </dd>
            </div>
          );
        })}
      </dl>
      <h3 className="m-0 text-xl font-bold">Under övningarna</h3>
      {during.length ? (
        <ul className="m-0 list-none p-0">
          {during.map(([id, feedback]) => (
            <li key={id} className="border-b-2 border-edge py-2 text-base">
              {exercises[id as keyof typeof exercises].name}:{' '}
              {symptomText(feedback?.symptoms)}
              {feedback?.effort
                ? ` · Ansträngning: ${EFFORT_LABEL[feedback.effort]}`
                : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-base text-ink-soft">
          Inga separata besvärsrapporter sparade under övningarna.
        </p>
      )}
    </section>
  );
}
