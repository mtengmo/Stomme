import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'wouter';
import {
  equipmentChoices,
  experienceLabels,
  isTrainingPreferences,
  programmeNames,
  trainingName,
} from '../../content/programmes';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import {
  canReplaceTrainingPreparation,
  saveTrainingPreferences,
} from '../../db/training';
import type {
  EquipmentChoice,
  ProgramId,
  TrainingPreferences,
} from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { trainingDayAfterDue } from '../../rules/training';
import { Button, buttonClass } from '../../ui/Button';
import { WeekView } from '../week/WeekView';
import { QuickStart } from './QuickStart';

const inputClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';

export { inputClass };

export function TrainingSetup({
  current,
  onSaved,
  onCancel,
}: {
  current?: TrainingPreferences;
  onSaved(): void;
  onCancel?(): void;
}) {
  const [programId, setProgramId] = useState<ProgramId>(
    current?.programId ?? 'general',
  );
  const [equipment, setEquipment] = useState<EquipmentChoice[]>(
    current?.equipment ?? ['bodyweight'],
  );
  const [experience, setExperience] = useState<
    TrainingPreferences['experience']
  >(current?.experience ?? 'new');
  const [rehabFocus, setRehabFocus] = useState<'custom' | 'knee'>(
    current?.rehabFocus ?? 'custom',
  );
  const [rehabSide, setRehabSide] = useState<'right' | 'left' | 'both'>(
    current?.rehabSide ?? 'both',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section
      className="flex flex-col gap-4 border-b-[3px] border-ink pb-6"
      aria-labelledby="training-direction"
    >
      <h2 id="training-direction" className="m-0 text-4xl font-bold">
        Vad vill du träna?
      </h2>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="sr-only">Träningsinriktning</legend>
        {(Object.keys(programmeNames) as ProgramId[]).map((id) => (
          <label
            key={id}
            className={`flex min-h-12 items-center gap-3 rounded-sm border-2 px-3 py-3 text-lg font-bold ${programId === id ? 'border-accent' : 'border-edge'}`}
          >
            <input
              type="radio"
              name="programId"
              value={id}
              checked={programId === id}
              onChange={() => setProgramId(id)}
              className="size-6"
            />
            {programmeNames[id]}
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 grid grid-cols-1 gap-1 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-2 text-xl font-bold">
          Vilken utrustning har du?
        </legend>
        {(Object.entries(equipmentChoices) as [EquipmentChoice, string][])
          .filter(([key]) => key !== 'bodyweight')
          .map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-12 items-center gap-3 text-base"
            >
              <input
                type="checkbox"
                checked={equipment.includes(key)}
                onChange={(event) =>
                  setEquipment((values) =>
                    event.target.checked
                      ? [...values, key]
                      : values.filter((value) => value !== key),
                  )
                }
                className="size-6"
              />
              {label}
            </label>
          ))}
      </fieldset>
      {programId !== 'rehab' ? (
        <label className="flex flex-col gap-2 text-lg font-bold">
          Hur van är du vid styrketräning?
          <select
            value={experience}
            onChange={(event) =>
              setExperience(
                event.target.value as TrainingPreferences['experience'],
              )
            }
            className={inputClass}
          >
            <option value="new">Ny eller på väg tillbaka</option>
            <option value="some">Viss vana</option>
            <option value="regular">Tränar regelbundet</option>
          </select>
        </label>
      ) : null}
      {programId === 'rehab' ? (
        <>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Rehabinriktning
            <select
              className={inputClass}
              value={rehabFocus}
              onChange={(e) =>
                setRehabFocus(e.target.value as 'custom' | 'knee')
              }
            >
              <option value="custom">Mitt eget rehabprogram</option>
              <option value="knee">
                Allmän knäträning – färdigt AAOS-baserat pass
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Vilket knä eller vilken sida?
            <select
              className={inputClass}
              value={rehabSide}
              onChange={(e) =>
                setRehabSide(e.target.value as 'right' | 'left' | 'both')
              }
            >
              <option value="both">Höger och vänster</option>
              <option value="right">Höger</option>
              <option value="left">Vänster</option>
            </select>
          </label>
          <p className="m-0 text-base">
            {rehabFocus === 'knee'
              ? 'Du får ett färdigt, redigerbart startpass för allmän knäträning. Övningsurval och startdos bygger på AAOS-programmet. Passet anpassas till din utrustning och valda sida.'
              : 'Välj sedan övningar, sida och dosering som du kommit överens om med din fysioterapeut.'}
          </p>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-base font-bold">
          {error}
        </p>
      ) : null}
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await saveTrainingPreferences(getDb(), {
              programId,
              equipment: [...new Set(['bodyweight' as const, ...equipment])],
              experience,
              ...(programId === 'rehab' ? { rehabFocus, rehabSide } : {}),
            });
            onSaved();
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : 'Kunde inte spara. Försök igen.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Spara träningsinriktning
      </Button>
      {onCancel ? (
        <Button variant="secondary" onClick={onCancel}>
          Avbryt ändring
        </Button>
      ) : null}
    </section>
  );
}

export function TrainingHome() {
  const data = useLiveQuery(async () => {
    const [preferences, sessions, legacyProgramme] = await Promise.all([
      getMeta(getDb(), 'training'),
      listSessions(getDb()),
      getMeta(getDb(), 'program'),
    ]);
    const active = sessions.find((session) => session.status === 'in_progress');
    const preparationId =
      active && (await canReplaceTrainingPreparation(getDb(), active))
        ? active.id
        : undefined;
    return { preferences, sessions, legacyProgramme, preparationId };
  }, []);
  const [editing, setEditing] = useState(false);
  if (!data) return null;
  const preferences = isTrainingPreferences(data.preferences)
    ? data.preferences
    : undefined;
  const active = data.sessions.find(
    (session) => session.status === 'in_progress',
  );
  const prepared = !!active && active.id === data.preparationId;
  const locked = !!active && !prepared;
  const due = data.sessions.filter((session) =>
    trainingDayAfterDue(session, toLocalDate(new Date())),
  );
  const legacy =
    !preferences && (data.sessions.length > 0 || !!data.legacyProgramme);
  if (!preferences && !legacy && !editing) return <QuickStart />;
  if (editing)
    return (
      <div className="mx-auto max-w-md px-5 pt-5 pb-28">
        <TrainingSetup
          current={preferences}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  const recent = data.sessions.filter(
    (session) =>
      session.programId === preferences?.programId &&
      (session.programId !== 'rehab' ||
        (session.rehabFocus ?? 'custom') ===
          (preferences?.rehabFocus ?? 'custom')) &&
      session.status !== 'in_progress',
  );
  const lastCompleted = recent.find(
    (session) => session.status === 'completed',
  );
  const nextId =
    preferences?.programId === 'rehab' || lastCompleted?.templateId !== 'A'
      ? 'A'
      : 'B';
  const alternateId = (active?.templateId ?? nextId) === 'A' ? 'B' : 'A';
  if (legacy)
    return (
      <>
        <div className="mx-auto max-w-md px-5 pt-3">
          <button
            type="button"
            disabled={locked}
            onClick={() => setEditing(true)}
            className="min-h-12 text-base font-bold underline disabled:opacity-50"
          >
            Ändra träningsinriktning
          </button>
        </div>
        <WeekView />
      </>
    );
  if (!preferences) return null;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-28">
      <h1 className="m-0 text-5xl font-extrabold">
        {prepared
          ? 'Förbered ditt pass'
          : active
            ? 'Fortsätt ditt pass'
            : 'Nästa pass'}
      </h1>
      <p className="m-0 text-lg font-bold">
        {trainingName(preferences)}
        {!active && preferences.programId !== 'rehab'
          ? ` · Pass ${nextId}`
          : ''}
      </p>
      {preferences.programId !== 'rehab' ? (
        <p className="m-0 -mt-3 text-base text-ink-soft">
          Träningsvana: {experienceLabels[preferences.experience]}
        </p>
      ) : null}
      <Link
        href={active ? `/session/${active.id}` : `/traning/${nextId}`}
        className={buttonClass('primary')}
      >
        {prepared
          ? 'Fortsätt förberedelsen'
          : active
            ? 'Fortsätt passet'
            : 'Visa nästa pass'}
      </Link>
      {due.map((session) => (
        <Link
          key={session.id}
          href={`/kansla/${session.id}/dayAfter`}
          className={buttonClass('secondary')}
        >
          Hur känns det dagen efter {trainingName(session)}?
        </Link>
      ))}
      {preferences.programId !== 'rehab' ? (
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
            Plan framåt och utveckling
          </summary>
          <p className="m-0 text-base">
            Nästa ordinarie pass: {nextId}. Därefter:{' '}
            {nextId === 'A' ? 'B' : 'A'}. Du kan byta innan du börjar.
          </p>
          <p className="mt-2 text-base">
            Nästa dos bygger på dina sparade set och svar om ansträngning och
            besvär. Ett lätt, komplett pass utan rapporterade besvär kan ge en
            extra repetition. Vikt ändrar du själv. Förslaget räknas om efter
            nästa pass.
          </p>
          <Link
            href="/historik"
            className="flex min-h-12 items-center text-base font-bold underline"
          >
            Se din utveckling
          </Link>
        </details>
      ) : null}
      <details>
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
          Ändra
        </summary>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={locked}
            onClick={() => setEditing(true)}
            className="min-h-12 self-start text-base font-bold underline disabled:opacity-50"
          >
            Byt inriktning eller utrustning
          </button>
          {locked ? (
            <p className="m-0 text-base text-ink-soft">
              Avsluta eller avbryt passet innan du byter inriktning.
            </p>
          ) : preferences.programId !== 'rehab' ? (
            <Link
              href={`/traning/${alternateId}`}
              className="flex min-h-12 items-center text-base underline"
            >
              Visa pass {alternateId} i stället
            </Link>
          ) : null}
          <Link
            href="/ovningar"
            className="flex min-h-12 items-center text-base underline"
          >
            Bläddra bland övningar
          </Link>
        </div>
      </details>
      {recent.length ? (
        <section
          aria-labelledby="recent-training"
          className="flex flex-col gap-2 border-t-2 border-edge pt-5"
        >
          <h2 id="recent-training" className="m-0 text-2xl font-bold">
            Senaste pass
          </h2>
          {recent.slice(0, 3).map((session) => (
            <Link
              key={session.id}
              href={`/historik/${session.id}`}
              className="flex min-h-12 items-center border-b-2 border-edge text-base underline"
            >
              {session.date} · Pass {session.templateId} ·{' '}
              {session.status === 'completed' ? 'klart' : 'avbrutet'}
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
