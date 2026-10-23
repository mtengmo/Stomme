import { useLiveQuery } from 'dexie-react-hooks';

import { useState } from 'react';

import { Link } from 'wouter';

import { exerciseMetadata } from '../../content/exerciseMetadata';

import { exercises } from '../../content/exercises';

import { trainingName } from '../../content/programmes';

import { getDb } from '../../db/db';

import type { ExerciseId } from '../../domain/types';

import { formatShortDate } from '../../lib/dates';

import { loggedVariant } from '../../rules/history';
import { sideLabels, symptomText } from './CheckinHistory';
import { amountText, EFFORT_LABEL } from './labels';

export function ExerciseHistory({ id }: { id: string }) {
  const [variant, setVariant] = useState('');

  const [side, setSide] = useState('');

  const data = useLiveQuery(
    async () => ({
      sessions: await getDb().sessions.toArray(),
      logs: await getDb()
        .setLogs.where('[exerciseId+loggedAt]')
        .between([id, ''], [id, '\uffff'])
        .toArray(),
    }),
    [id],
  );

  if (!data) return null;

  if (!Object.hasOwn(exercises, id))
    return (
      <div className="mx-auto max-w-md px-5 pt-5">
        <h1 className="text-4xl font-bold">Övningen finns inte</h1>
        <Link href="/historik" className="flex min-h-12 items-center underline">
          Till historiken
        </Link>
      </div>
    );

  const exercise = exercises[id as ExerciseId];

  const sessions = new Map(data.sessions.map((s) => [s.id, s]));

  const logs = data.logs.filter((l) => sessions.has(l.sessionId));

  const variants = [...new Set(logs.map(loggedVariant))];

  const selected = variants.includes(variant) ? variant : (variants[0] ?? '');

  const sides = [
    ...new Set(
      logs.filter((l) => loggedVariant(l) === selected).map((l) => l.side),
    ),
  ];

  const selectedSide = sides.includes(side as (typeof sides)[number])
    ? side
    : (sides[0] ?? '');

  const matching = logs.filter(
    (l) => loggedVariant(l) === selected && l.side === selectedSide,
  );

  const history = [...new Set(matching.map((l) => l.sessionId))]
    .flatMap((sessionId) => {
      const session = sessions.get(sessionId);
      return session
        ? [
            {
              session,
              logs: matching
                .filter((l) => l.sessionId === sessionId)
                .sort((a, b) => a.setNumber - b.setNumber),
            },
          ]
        : [];
    })
    .sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt))
    .slice(0, 20);

  const variantLabel = (value: string) =>
    exerciseMetadata[exercise.id].variants.find((v) => v.id === value)?.label ??
    'Okänd utrustning';

  const inputClass =
    'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-4 pb-28">
      <Link
        href="/historik"
        className="flex min-h-12 items-center text-base font-bold underline"
      >
        Till historiken
      </Link>
      <h1 className="m-0 text-4xl font-extrabold">{exercise.name}</h1>
      <p className="m-0 text-base">
        Jämför samma utrustning och arbetande sida. Alla faktiskt loggade set
        visas; inga mål räknas som utförda set.
      </p>
      {logs.length ? (
        <>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Utrustning
            <select
              className={inputClass}
              value={selected}
              onChange={(e) => {
                setVariant(e.target.value);
                setSide('');
              }}
            >
              {variants.map((v) => (
                <option key={v} value={v}>
                  {variantLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Arbetande sida
            <select
              className={inputClass}
              value={selectedSide}
              onChange={(e) => setSide(e.target.value)}
            >
              {sides.map((s) => (
                <option key={s} value={s}>
                  {s === 'both' ? 'Båda samtidigt' : sideLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <p className="m-0 text-base text-ink-soft">
            {history.length} senaste pass med detta val. Vikten är total extern
            vikt.
          </p>
          <ol className="m-0 list-none p-0">
            {history.map(({ session, logs: rows }) => (
              <li
                key={session.id}
                className="flex flex-col gap-2 border-t-2 border-edge py-4"
              >
                <Link
                  href={`/historik/${session.id}`}
                  className="flex min-h-12 items-center text-xl font-bold underline"
                >
                  {formatShortDate(session.date)} ·{' '}
                  {session.customWorkoutName ?? `Pass ${session.templateId}`}
                </Link>
                <p className="m-0 text-base text-ink-soft">
                  {trainingName(session)}
                </p>
                <ul className="m-0 list-none p-0">
                  {rows.map((l) => (
                    <li key={l.id} className="text-lg">
                      Set {l.setNumber}: {amountText(l.amount, exercise.unit)} ·{' '}
                      {l.weightKg > 0
                        ? `${l.weightKg} kg`
                        : variantLabel(loggedVariant(l))}
                    </li>
                  ))}
                </ul>
                <p className="m-0 text-base">
                  Ansträngning:{' '}
                  {session.feedback[exercise.id]?.effort
                    ? EFFORT_LABEL[
                        session.feedback[exercise.id]?.effort ?? 'ok'
                      ]
                    : 'Svar saknas'}
                </p>
                <p className="m-0 text-base">
                  Besvär under övningen:{' '}
                  {symptomText(session.feedback[exercise.id]?.symptoms)}
                </p>
                <p className="m-0 text-base text-ink-soft">
                  Efter passet: {symptomText(session.checkins?.after?.symptoms)}
                </p>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="m-0 text-lg">
          Inga set sparade för den här övningen ännu.
        </p>
      )}
      <Link
        href={`/ovning/${id}`}
        className="flex min-h-12 items-center text-base font-bold underline"
      >
        Visa övningsguiden
      </Link>
    </div>
  );
}
