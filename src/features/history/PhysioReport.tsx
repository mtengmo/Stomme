import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'wouter';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { trainingName } from '../../content/programmes';
import { getDb } from '../../db/db';
import type { Session, TrainingCheckin } from '../../domain/types';
import { addDays, formatLongDate, toLocalDate } from '../../lib/dates';
import {
  buildPhysioReport,
  type ReportExercise,
  type ReportProgramme,
  reportProgrammeLabels,
} from '../../rules/physioReport';
import { Button } from '../../ui/Button';
import { sideLabels, symptomText } from './CheckinHistory';
import { amountText, EFFORT_LABEL } from './labels';

const fieldClass =
  'min-h-12 min-w-0 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';
const timingLabels = {
  before: 'Före passet',
  after: 'Efter passet',
  dayAfter: 'Dagen efter',
} as const;
const feelingLabels: Record<TrainingCheckin['feeling'], string> = {
  ready: 'Redo att träna',
  tired: 'Trött',
  good: 'Bra',
  mixed: 'Blandat',
  difficult: 'Jobbigt',
};
const timestamp = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const kilograms = (kg: number) => `${kg.toLocaleString('sv-SE')} kg totalt`;

function statusText(session: Session) {
  if (session.status === 'completed') return 'Avslutat pass';
  if (session.status === 'in_progress') return 'Pågående pass';
  return {
    pain_stop: 'Stoppat på grund av besvär',
    timeout: 'Avslutat automatiskt efter uppehåll',
    user: 'Avbrutet pass',
  }[session.abortReason ?? 'user'];
}

function ReportExerciseRow({ row }: { row: ReportExercise }) {
  const exercise = exercises[row.exerciseId];
  const planned = row.planned;
  const feedback = row.feedback;
  const variantLabel = (id: string | undefined) =>
    exerciseMetadata[row.exerciseId].variants.find(
      (variant) => variant.id === id,
    )?.label ??
    (id ? `Okänd utrustningsvariant (${id})` : 'Utrustningsvariant ej sparad');
  return (
    <section
      data-report-exercise={row.exerciseId}
      className="report-exercise flex flex-col gap-2 border-t-2 border-edge py-4"
    >
      <h3 className="m-0 break-words text-2xl font-bold">
        {exerciseReferences[row.exerciseId]} · {exercise.name}
      </h3>
      <p className="m-0 text-base text-ink-soft">
        {planned ? (
          <>
            Planerat: {planned.sets} set ×{' '}
            {amountText(planned.target, exercise.unit)}
            {exercise.perSide ? ' per vald sida' : ''} ·{' '}
            {kilograms(planned.weightKg)} · {variantLabel(planned.variantId)} ·
            vila {planned.restSec} s.
            {planned.sides
              ? ` Sidor: ${planned.sides.map((side) => sideLabels[side]).join(', ')}.`
              : ''}
          </>
        ) : (
          'Planerad dosering saknas.'
        )}
      </p>
      <h4 className="m-0 text-base font-bold">Loggade set</h4>
      {row.logs.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {row.logs.map((log) => (
            <li key={log.id} className="report-set text-base">
              Set {log.setNumber} · {sideLabels[log.side]}:{' '}
              <strong>{amountText(log.amount, exercise.unit)}</strong> ·{' '}
              {kilograms(log.weightKg)} · {variantLabel(log.variantId)}
              {log.endedEarly ? ' · Avslutat i förtid' : ''}
              {log.counting
                ? ` · ${log.counting === 'manual' ? 'Manuell räkning' : 'Automatisk räkning'}`
                : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-base">Inga loggade set.</p>
      )}
      {feedback?.skipped ? (
        <p className="m-0 text-base font-bold">
          Övningen markerades som överhoppad.
        </p>
      ) : null}
      <p className="m-0 text-base">
        Ansträngning:{' '}
        {feedback?.effort
          ? EFFORT_LABEL[feedback.effort]
          : feedback?.effortSkipped
            ? 'Överhoppat svar'
            : 'Svar saknas'}
        . Besvär under övningen: {symptomText(feedback?.symptoms)}.
      </p>
    </section>
  );
}

async function loadReport() {
  const db = getDb();
  return db.transaction(
    'r',
    [db.sessions, db.setLogs, db.painLogs],
    async () => ({
      sessions: await db.sessions.toArray(),
      setLogs: await db.setLogs.toArray(),
      painLogs: await db.painLogs.toArray(),
    }),
  );
}

export function PhysioReport() {
  const data = useLiveQuery(loadReport, []);
  const [created] = useState(() => new Date());
  const [from, setFrom] = useState(() => addDays(toLocalDate(created), -27));
  const [to, setTo] = useState(() => toLocalDate(created));
  const [programme, setProgramme] = useState<ReportProgramme>('all');
  const [printError, setPrintError] = useState('');
  if (!data)
    return (
      <p role="status" className="p-5 text-base">
        Hämtar träningshistoriken…
      </p>
    );
  const report = buildPhysioReport(data.sessions, data.setLogs, data.painLogs, {
    from,
    to,
    programme,
  });
  return (
    <div
      data-print-report
      className="physio-report mx-auto flex max-w-3xl flex-col gap-5 px-5 pt-6 pb-28 break-words"
    >
      <Link
        href="/historik"
        className="report-controls flex min-h-12 items-center self-start text-base font-bold underline"
      >
        Till historiken
      </Link>
      <header>
        <h1 className="m-0 text-5xl font-extrabold">Till fysioterapeuten</h1>
        <p className="m-0 mt-3 text-lg">
          Sammanställning av din registrerade träning och dina svar om kroppen.
        </p>
      </header>
      <section
        aria-label="Välj rapportens innehåll"
        className="report-controls flex flex-col gap-4 border-y-[3px] border-ink py-4"
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-2 text-base font-bold">
            Från datum
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
              aria-invalid={!report.valid}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-base font-bold">
            Till datum
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
              aria-invalid={!report.valid}
            />
          </label>
        </div>
        <label className="flex min-w-0 flex-col gap-2 text-base font-bold">
          Träningsinriktning
          <select
            value={programme}
            onChange={(event) =>
              setProgramme(event.target.value as ReportProgramme)
            }
            className={fieldClass}
          >
            {Object.entries(reportProgrammeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="m-0 text-base text-ink-soft">
          Rapporten skapas på din enhet. Välj själv om du vill skriva ut eller
          spara den som PDF i utskriftsdialogen.
        </p>
        <Button
          disabled={!report.valid || report.sessions.length === 0}
          onClick={() => {
            setPrintError('');
            try {
              window.print();
            } catch {
              setPrintError(
                'Utskriftsdialogen kunde inte öppnas. Försök med webbläsarens meny för utskrift.',
              );
            }
          }}
        >
          Skriv ut eller spara PDF
        </Button>
        {printError ? (
          <p role="alert" className="m-0 text-base font-bold">
            {printError}
          </p>
        ) : null}
      </section>
      {!report.valid ? (
        <p role="alert" className="m-0 text-base font-bold">
          Välj ett giltigt datumintervall.
        </p>
      ) : (
        <>
          <section
            aria-label="Rapportens omfattning"
            className="flex flex-col gap-2"
          >
            <p className="m-0 text-lg font-bold">
              {from} – {to} · {reportProgrammeLabels[programme]}
            </p>
            <p className="m-0 text-base">
              {report.sessions.length} registrerade pass. Skapad{' '}
              {timestamp.format(created)}.
            </p>
            <p className="m-0 text-base text-ink-soft">
              Planerat och loggat visas var för sig. Endast sparade set räknas
              som loggade. Vikter avser extern totalvikt; 0 kg betyder ingen
              extern vikt. Ett saknat svar betyder inte att besvär saknades.
              Alla frågor behöver inte ha ställts.
            </p>
          </section>
          {!report.sessions.length ? (
            <p role="status" className="m-0 text-lg">
              Inga registrerade pass under perioden.
            </p>
          ) : (
            report.sessions.map((row) => (
              <article
                key={row.session.id}
                data-report-session={row.session.id}
                className="report-session flex flex-col gap-4 border-t-[3px] border-ink pt-5"
              >
                <header className="report-session-heading">
                  <h2 className="m-0 text-3xl font-bold">
                    {formatLongDate(row.session.date)}{' '}
                    {row.session.date.slice(0, 4)} ·{' '}
                    {row.session.customWorkoutName ??
                      `Pass ${row.session.templateId}`}
                  </h2>
                  <p className="m-0 mt-2 text-base font-bold">
                    {trainingName(row.session)} · {statusText(row.session)}
                    {row.session.workoutMode === 'short' ? ' · Kortpass' : ''}
                    {row.session.customWorkoutId ? ' · Eget pass' : ''}
                  </p>
                  {row.session.equipmentOverride ? (
                    <p className="m-0 mt-2 text-base">
                      Tillfällig utrustning användes. Redskapen i varje set
                      visas nedan.
                    </p>
                  ) : null}
                </header>
                <section
                  aria-label="Känsla och besvär"
                  className="report-checkins flex flex-col gap-2"
                >
                  <h3 className="m-0 text-2xl font-bold">Känsla och besvär</h3>
                  {row.session.programId ? (
                    <dl className="m-0 flex flex-col gap-2">
                      {(['before', 'after', 'dayAfter'] as const).map(
                        (timing) => {
                          const check = row.session.checkins?.[timing];
                          return (
                            <div key={timing}>
                              <dt className="inline text-base font-bold">
                                {timingLabels[timing]}:{' '}
                              </dt>
                              <dd className="m-0 inline text-base">
                                {check ? (
                                  <>
                                    {feelingLabels[check.feeling]} ·{' '}
                                    {symptomText(check.symptoms)}{' '}
                                    <span className="text-ink-soft">
                                      (registrerat{' '}
                                      {timestamp.format(
                                        new Date(check.recordedAt),
                                      )}
                                      )
                                    </span>
                                  </>
                                ) : (
                                  'Svar saknas'
                                )}
                              </dd>
                            </div>
                          );
                        },
                      )}
                    </dl>
                  ) : (
                    <p className="m-0 text-base">
                      Äldre program: knäsmärtskattningar visas separat.
                    </p>
                  )}
                </section>
                {row.painLogs.length || !row.session.programId ? (
                  <section
                    aria-label="Äldre knäsmärtskattningar"
                    className="report-checkins flex flex-col gap-2"
                  >
                    <h3 className="m-0 text-2xl font-bold">
                      Äldre knäsmärtskattningar
                    </h3>
                    <p className="m-0 text-base">
                      Höger knä. Dessa skattningar redovisas separat från de nya
                      frågorna om besvär.
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {(['before', 'after', 'dayAfter'] as const).map(
                        (timing) => {
                          const pain = row.painLogs.filter(
                            (log) => log.timing === timing,
                          );
                          return (
                            <li key={timing} className="text-base">
                              <strong>{timingLabels[timing]}: </strong>
                              {pain.length
                                ? pain.map((log) => (
                                    <span key={log.id}>
                                      {log.score}/10
                                      {log.redFlags.sharp
                                        ? ' · Skarp smärta'
                                        : ''}
                                      {log.redFlags.swelling
                                        ? ' · Svullnad'
                                        : ''}
                                      {log.redFlags.locking ? ' · Låsning' : ''}{' '}
                                      (registrerat{' '}
                                      {timestamp.format(
                                        new Date(log.createdAt),
                                      )}
                                      ){' '}
                                    </span>
                                  ))
                                : 'Svar saknas'}
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </section>
                ) : null}
                <div className="flex flex-col">
                  {row.exercises.map((exercise) => (
                    <ReportExerciseRow
                      key={exercise.exerciseId}
                      row={exercise}
                    />
                  ))}
                </div>
                {row.session.note ? (
                  <section className="report-note">
                    <h3 className="m-0 text-2xl font-bold">Anteckning</h3>
                    <p className="m-0 mt-2 whitespace-pre-wrap break-words text-base">
                      {row.session.note}
                    </p>
                  </section>
                ) : null}
              </article>
            ))
          )}
        </>
      )}
    </div>
  );
}
