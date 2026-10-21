import { useMemo, useState } from 'react';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { programmeNames, trainingName } from '../../content/programmes';
import type {
  ExerciseId,
  ProgramId,
  Session,
  SetLog,
} from '../../domain/types';
import { daysBetween, formatShortDate } from '../../lib/dates';
import {
  exerciseResults,
  progressExerciseIds,
  variantLabel,
  weeklyProgress,
} from '../../rules/progressOverview';
import { sideLabels, symptomText } from './CheckinHistory';
import { amountText, EFFORT_LABEL } from './labels';

const programmeLabel: Record<ProgramId | 'legacy', string> = {
  general: programmeNames.general,
  running: programmeNames.running,
  rehab: programmeNames.rehab,
  legacy: 'Äldre pass utan programuppgift',
};
const inputClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink';

export function ProgressOverview({
  sessions,
  logs,
  today,
}: {
  sessions: Session[];
  logs: SetLog[];
  today: string;
}) {
  const [weeksCount, setWeeksCount] = useState<4 | 12>(4);
  const [exerciseId, setExerciseId] = useState('');
  const [programme, setProgramme] = useState('');
  const [variant, setVariant] = useState('');
  const [side, setSide] = useState('');
  const [weight, setWeight] = useState('');
  const ids = useMemo(
    () => progressExerciseIds(sessions, logs),
    [sessions, logs],
  );
  const selectedId = (
    ids.includes(exerciseId as ExerciseId) ? exerciseId : ids[0]
  ) as ExerciseId | undefined;
  const weeks = useMemo(
    () => weeklyProgress(sessions, today, weeksCount),
    [sessions, today, weeksCount],
  );
  const rangeStart = weeks[0]?.start ?? today;
  const allResults = selectedId
    ? exerciseResults(selectedId, sessions, logs).filter(
        ({ session }) => session.date >= rangeStart && session.date <= today,
      )
    : [];
  const programmes = [
    ...new Set(allResults.map(({ session }) => session.programId ?? 'legacy')),
  ];
  const newestProgramme = allResults.at(-1)?.session.programId ?? 'legacy';
  const selectedProgramme =
    programme === 'all'
      ? 'all'
      : programmes.includes(programme as ProgramId | 'legacy')
        ? programme
        : programmes.length === 1
          ? programmes[0]
          : newestProgramme;
  const filteredByProgramme = allResults.filter(
    ({ session }) =>
      selectedProgramme === 'all' ||
      (session.programId ?? 'legacy') === selectedProgramme,
  );
  const variants = [
    ...new Set(filteredByProgramme.map((result) => result.variant)),
  ];
  const selectedVariant = variants.includes(variant)
    ? variant
    : (variants[0] ?? '');
  const variantResults = filteredByProgramme.filter(
    (result) => result.variant === selectedVariant,
  );
  const sides = [...new Set(variantResults.map((result) => result.side))];
  const selectedSide = sides.includes(side as SetLog['side'])
    ? side
    : (sides[0] ?? '');
  const results = variantResults.filter(
    (result) => result.side === selectedSide,
  );
  const weights = [
    ...new Set(
      results.flatMap(({ logs: setLogs }) =>
        setLogs.map((log) => log.weightKg),
      ),
    ),
  ].sort((a, b) => a - b);
  const latestWeight = results.at(-1)?.logs.at(-1)?.weightKg;
  const selectedWeight =
    weight !== '' && weights.includes(Number(weight))
      ? Number(weight)
      : (latestWeight ?? weights[0] ?? 0);
  const weightResults = results
    .map((result) => ({
      ...result,
      logs: result.logs.filter((log) => log.weightKg === selectedWeight),
    }))
    .filter((result) => result.logs.length > 0);
  const plotLogs = weightResults.flatMap(({ session, logs: setLogs }) =>
    setLogs.map((log) => ({ session, log })),
  );
  const minAmount = Math.min(...plotLogs.map(({ log }) => log.amount));
  const maxAmount = Math.max(...plotLogs.map(({ log }) => log.amount));
  const firstDate = weightResults[0]?.session.date ?? today;
  const lastDate = weightResults.at(-1)?.session.date ?? firstDate;
  const dateSpan = Math.max(1, daysBetween(firstDate, lastDate));
  const amountSpan = Math.max(1, maxAmount - minAmount);
  const maxWeekCount = Math.max(1, ...weeks.map((week) => week.completed));

  const changeExercise = (value: string) => {
    setExerciseId(value);
    setProgramme('');
    setVariant('');
    setSide('');
    setWeight('');
  };
  const changeProgramme = (value: string) => {
    setProgramme(value);
    setVariant('');
    setSide('');
    setWeight('');
  };
  const changeVariant = (value: string) => {
    setVariant(value);
    setSide('');
    setWeight('');
  };

  return (
    <section
      aria-labelledby="progress-overview-title"
      className="flex min-w-0 max-w-full flex-col gap-4 border-t-[3px] border-ink pt-5"
    >
      <h2 id="progress-overview-title" className="m-0 text-3xl font-bold">
        Din utveckling
      </h2>
      <p className="m-0 text-base text-ink-soft">
        Översikten har egna filter och visar sparade träningsresultat. Fler
        repetitioner eller högre vikt betyder inte i sig återhämtning eller
        jämförbar utveckling.
      </p>
      <fieldset className="flex flex-wrap gap-2 border-0 p-0">
        <legend className="mb-2 text-base font-bold">Visa veckor</legend>
        {([4, 12] as const).map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={weeksCount === count}
            className="min-h-12 rounded-sm border-2 border-edge px-4 font-bold aria-pressed:bg-ink aria-pressed:text-paper"
            onClick={() => setWeeksCount(count)}
          >
            {count} veckor
          </button>
        ))}
      </fieldset>
      {weeks.some((week) => week.completed || week.incomplete) ? (
        <>
          <div
            role="img"
            aria-label={`Stapeldiagram: antal avslutade pass per vecka, ${weeksCount} veckor`}
            className="overflow-x-auto"
          >
            <svg
              viewBox={`0 0 ${weeks.length * 56} 132`}
              className="h-36 min-w-full"
              aria-hidden="true"
            >
              {weeks.map((week, index) => {
                const height = (week.completed / maxWeekCount) * 88;
                return (
                  <g key={week.start}>
                    <rect
                      x={index * 56 + 10}
                      y={98 - height}
                      width="34"
                      height={height}
                      fill="currentColor"
                    />
                    <text
                      x={index * 56 + 27}
                      y={92 - height}
                      textAnchor="middle"
                      fontSize="12"
                    >
                      {week.completed}
                    </text>
                    <text
                      x={index * 56 + 27}
                      y="119"
                      textAnchor="middle"
                      fontSize="11"
                    >
                      {formatShortDate(week.start)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <table className="w-full border-collapse text-left text-base">
            <caption className="pb-2 text-left text-xl font-bold">
              Pass per kalendervecka · måndag till söndag
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-2">
                  Vecka från
                </th>
                <th scope="col">Avslutade</th>
                <th scope="col">Ej avslutade</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.start} className="border-t-2 border-edge">
                  <th scope="row" className="py-3 font-normal">
                    {formatShortDate(week.start)}
                  </th>
                  <td className="py-3 pr-2">
                    <strong>{week.completed}</strong>
                    {Object.entries(week.byProgramme)
                      .filter(([, count]) => count > 0)
                      .map(([key, count]) => (
                        <div key={key}>
                          {programmeLabel[key as keyof typeof programmeLabel]}:{' '}
                          {count}
                        </div>
                      ))}
                  </td>
                  <td>{week.incomplete}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 text-base text-ink-soft">
            Pass räknas i sin programkontext. Avbrutna och pågående pass visas
            separat och räknas inte som avslutade.
          </p>
        </>
      ) : (
        <p className="m-0 text-base">
          Inga sparade pass under de här {weeksCount} veckorna.
        </p>
      )}

      <h3 className="m-0 text-2xl font-bold">Resultat per övning</h3>
      {ids.length > 0 && selectedId ? (
        <>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Övning
            <select
              className={inputClass}
              value={selectedId}
              onChange={(event) => changeExercise(event.target.value)}
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {exerciseReferences[id]} · {exercises[id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Program
            <select
              className={inputClass}
              value={selectedProgramme}
              onChange={(event) => changeProgramme(event.target.value)}
            >
              <option value="all">Alla program</option>
              {programmes.map((id) => (
                <option key={id} value={id}>
                  {programmeLabel[id as keyof typeof programmeLabel]}
                </option>
              ))}
            </select>
          </label>
          {variants.length > 0 && (
            <label className="flex flex-col gap-2 text-lg font-bold">
              Utrustningsvariant
              <select
                className={inputClass}
                value={selectedVariant}
                onChange={(event) => changeVariant(event.target.value)}
              >
                {variants.map((id) => (
                  <option key={id} value={id}>
                    {variantLabel(selectedId, id)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {sides.length > 0 && (
            <label className="flex flex-col gap-2 text-lg font-bold">
              Arbetande sida
              <select
                className={inputClass}
                value={selectedSide}
                onChange={(event) => setSide(event.target.value)}
              >
                {sides.map((value) => (
                  <option key={value} value={value}>
                    {value === 'both' ? 'Båda samtidigt' : sideLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {weights.length > 0 && (
            <label className="flex flex-col gap-2 text-lg font-bold">
              Total vikt
              <select
                className={inputClass}
                value={String(selectedWeight)}
                onChange={(event) => setWeight(event.target.value)}
              >
                {weights.map((value) => (
                  <option key={value} value={value}>
                    {value > 0 ? `${value} kg totalt` : 'Kroppsvikt · 0 kg'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="m-0 text-base text-ink-soft">
            Resultaten omfattar de valda {weeksCount} kalenderveckorna till och
            med idag. Diagrammet visar set med vald totalvikt; datumavstånd
            bevaras. Saknade svar visas som saknade.
          </p>
          {weightResults.length ? (
            <>
              <div
                role="img"
                aria-label={`Diagram med loggade setvärden i ${exercises[selectedId].unit}. Tabellen nedan innehåller datumen och varje värde.`}
                className="overflow-x-auto"
              >
                <svg
                  viewBox="0 0 600 180"
                  className="h-48 min-w-full"
                  aria-hidden="true"
                >
                  <text x="12" y="18" fontSize="12">
                    {amountText(maxAmount, exercises[selectedId].unit)}
                  </text>
                  <text x="12" y="166" fontSize="12">
                    {amountText(minAmount, exercises[selectedId].unit)}
                  </text>
                  {plotLogs.map(({ session, log }, index) => {
                    const sameDayIndex = plotLogs
                      .slice(0, index)
                      .filter(
                        (point) => point.session.date === session.date,
                      ).length;
                    const x =
                      68 +
                      (daysBetween(firstDate, session.date) / dateSpan) * 510;
                    const y =
                      150 - ((log.amount - minAmount) / amountSpan) * 120;
                    return (
                      <circle
                        key={log.id}
                        cx={x + sameDayIndex * 5}
                        cy={y}
                        r="5"
                        fill="currentColor"
                      >
                        <title>{`${formatShortDate(session.date)} · set ${log.setNumber}: ${amountText(log.amount, exercises[selectedId].unit)}`}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-base">
                  <caption className="pb-2 text-left text-xl font-bold">
                    {exercises[selectedId].name} ·{' '}
                    {variantLabel(selectedId, selectedVariant)} ·{' '}
                    {selectedSide === 'both'
                      ? 'båda samtidigt'
                      : sideLabels[selectedSide as SetLog['side']]}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="py-2">
                        Datum och program
                      </th>
                      <th scope="col">Set</th>
                      <th scope="col">Ansträngning</th>
                      <th scope="col">Besvär och tidpunkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightResults.map(({ session, logs: setLogs }) => {
                      const planned = session.plan
                        .filter((item) => item.exerciseId === selectedId)
                        .reduce((sum, item) => sum + item.sets, 0);
                      const feedback = session.feedback[selectedId];
                      return (
                        <tr
                          key={`${session.id}-${selectedVariant}-${selectedSide}`}
                          className="border-t-2 border-edge align-top"
                        >
                          <th scope="row" className="py-3 font-normal">
                            <strong>{formatShortDate(session.date)}</strong>
                            <br />
                            {trainingName(session)}
                            <br />
                            {session.status === 'completed'
                              ? 'Avslutat pass'
                              : session.status === 'aborted'
                                ? 'Avbrutet pass'
                                : 'Pågående pass'}
                            <br />
                            {setLogs.length} av {planned} planerade set loggade
                          </th>
                          <td className="py-3">
                            {setLogs.map((log) => (
                              <div key={log.id}>
                                Set {log.setNumber}:{' '}
                                {amountText(
                                  log.amount,
                                  exercises[selectedId].unit,
                                )}{' '}
                                ·{' '}
                                {log.weightKg > 0
                                  ? `${log.weightKg} kg totalt`
                                  : 'kroppsvikt'}
                              </div>
                            ))}
                          </td>
                          <td className="py-3">
                            {feedback?.effort
                              ? EFFORT_LABEL[feedback.effort]
                              : 'Svar saknas'}
                          </td>
                          <td className="py-3">
                            Vid övningen: {symptomText(feedback?.symptoms)}
                            <p className="my-2">
                              Före:{' '}
                              {symptomText(session.checkins?.before?.symptoms)}
                            </p>
                            <p className="my-2">
                              Efter:{' '}
                              {symptomText(session.checkins?.after?.symptoms)}
                            </p>
                            <p className="my-2">
                              Dagen efter:{' '}
                              {symptomText(
                                session.checkins?.dayAfter?.symptoms,
                              )}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="m-0">Inga resultat med de valda filtren.</p>
          )}
          <p className="m-0 text-sm text-ink-soft">
            Saknade pass betyder saknade mätningar, inte noll styrka. Äldre
            loggar utan känd utrustning hålls samlade under “Okänd utrustning”.
          </p>
        </>
      ) : (
        <p className="m-0 text-base">
          Inga sparade set ännu. När du loggar ett träningspass visas resultaten
          här.
        </p>
      )}
    </section>
  );
}
