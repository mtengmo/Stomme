import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { focusLabel } from '../../content/focusPresets';
import { bodyRegions } from '../../content/muscles';
import {
  experienceLabels,
  isTrainingPreferences,
  programmeNames,
  rehabGroupOf,
  trainingName,
} from '../../content/programmes';
import { readCustomWorkouts } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { readTrainingProgram } from '../../db/program';
import { getMeta, listSessions } from '../../db/repo';
import {
  canReplaceTrainingPreparation,
  saveTrainingPreferences,
} from '../../db/training';
import type {
  BodyRegionId,
  EquipmentChoice,
  ProgramId,
  RehabFocus,
  TrainingPreferences,
} from '../../domain/types';
import { toLocalDate, weekdayIndex } from '../../lib/dates';
import { focusQuery } from '../../lib/focus';
import { useHashSearch } from '../../lib/hashLocation';
import { focusAvailable } from '../../rules/programRosters';
import {
  muscleRecoveryNote,
  recentMuscles,
  recoveryNote,
} from '../../rules/recovery';
import { nextTemplateId } from '../../rules/schedule';
import { trainingDayAfterDue } from '../../rules/training';
import {
  completedTrainingDates,
  nextPlannedDate,
  planForDate,
} from '../../rules/weeklySchedule';
import { musclesForPlan } from '../../rules/weekSuggestion';
import { Button, buttonClass } from '../../ui/Button';
import { ChoiceCard } from '../../ui/ChoiceCard';
import { Icon } from '../../ui/Icon';
import { linkClass } from '../../ui/link';
import { programPassLabel } from '../history/labels';
import { CustomWorkoutList } from '../library/CustomWorkoutList';
import { ProgramHome } from '../program/ProgramHome';
import { TimeoutNotice } from '../session/TimeoutNotice';
import { planHref, planLabel, weekdayNames } from '../week/planModel';
import { loadWeeklySchedule, WeeklyPlan } from '../week/WeeklyPlan';
import { startingFocus } from './focusModel';

const quietRow = `flex min-h-12 items-center text-base font-bold ${linkClass}`;

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
  // Equipment is edited in Inställningar › Min utrustning; setup keeps what is saved.
  const [equipment, setEquipment] = useState<EquipmentChoice[]>(
    current?.equipment ?? ['bodyweight'],
  );
  const [experience, setExperience] = useState<
    TrainingPreferences['experience']
  >(current?.experience ?? 'new');
  const [bodyParts, setBodyParts] = useState<BodyRegionId[]>(
    current?.bodyParts ?? [],
  );
  const [rehabFocus, setRehabFocus] = useState<RehabFocus>(
    current?.rehabFocus ?? 'custom',
  );
  const [rehabSide, setRehabSide] = useState<'right' | 'left' | 'both'>(
    current?.rehabSide ?? 'both',
  );
  const [own, setOwn] = useState(false);
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
          <ChoiceCard
            key={id}
            type="radio"
            name="programId"
            value={id}
            label={<span className="font-bold">{programmeNames[id]}</span>}
            checked={!own && programId === id}
            onChange={() => {
              setOwn(false);
              setProgramId(id);
            }}
          />
        ))}
        {current ? (
          <ChoiceCard
            type="radio"
            name="programId"
            value="own"
            label={<span className="font-bold">Egna pass</span>}
            checked={own}
            onChange={() => setOwn(true)}
          />
        ) : null}
      </fieldset>
      {own ? (
        <CustomWorkoutList
          headingId="setup-own-workouts"
          title="Dina egna pass"
          alwaysShow
          primaryCreate
        />
      ) : (
        <>
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
          {programId === 'general' ? (
            <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
              <legend className="mb-1 text-xl font-bold">Fokus</legend>
              <p className="m-0 text-base text-ink-soft">
                Välj kroppsdelar att fokusera på. Ingen vald betyder hela
                kroppen.
              </p>
              {bodyRegions.map((region) => (
                <label
                  key={region.id}
                  className="flex min-h-12 items-center gap-3 text-base"
                >
                  <input
                    type="checkbox"
                    checked={bodyParts.includes(region.id)}
                    onChange={(event) =>
                      setBodyParts((values) =>
                        event.target.checked
                          ? [...new Set([...values, region.id])]
                          : values.filter((value) => value !== region.id),
                      )
                    }
                    className="size-6"
                  />
                  {region.label}
                </label>
              ))}
            </fieldset>
          ) : null}
          {programId === 'rehab' ? (
            <>
              <label className="flex flex-col gap-2 text-lg font-bold">
                Rehabinriktning
                <select
                  className={inputClass}
                  value={rehabFocus}
                  onChange={(e) => {
                    const focus = e.target.value as RehabFocus;
                    setRehabFocus(focus);
                    // Everyone has a chair and a wall; start with them unless the user chose.
                    if (
                      rehabGroupOf(focus) === 'physio' &&
                      !equipment.includes('chair') &&
                      !equipment.includes('support')
                    )
                      setEquipment((values) => [...values, 'chair', 'support']);
                  }}
                >
                  <option value="custom">Mitt eget rehabprogram</option>
                  <option value="knee">
                    Allmän knäträning – färdigt AAOS-baserat pass
                  </option>
                  <option value="knee-physio">
                    Fysioterapeutens knäprogram (9 övningar)
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
              {rehabGroupOf(rehabFocus) === 'physio' ? (
                <p className="m-0 text-base text-ink-soft">
                  För balansklockan är det foten som rör sig; benet du står på
                  tränar balansen.
                </p>
              ) : null}
              <p className="m-0 text-base">
                {rehabGroupOf(rehabFocus) === 'aaos'
                  ? 'Du får ett färdigt, redigerbart startpass för allmän knäträning. Övningsurval och startdos bygger på AAOS-programmet. Passet anpassas till din utrustning och valda sida.'
                  : rehabGroupOf(rehabFocus) === 'physio'
                    ? 'Kontrollera övningar, sida och antal mot ditt papper från fysioterapeuten.'
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
                  equipment: [
                    ...new Set(['bodyweight' as const, ...equipment]),
                  ],
                  experience: programId === 'rehab' ? 'new' : experience,
                  // Weights and focus are kept; setup only changes what it shows.
                  ...(current?.weights ? { weights: current.weights } : {}),
                  ...(current?.adjustableWeights
                    ? { adjustableWeights: current.adjustableWeights }
                    : {}),
                  ...(programId === 'general' && bodyParts.length
                    ? { bodyParts }
                    : {}),
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
        </>
      )}
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
    const [preferences, sessions] = await Promise.all([
      getMeta(getDb(), 'training'),
      listSessions(getDb()),
    ]);
    const active = sessions.find((session) => session.status === 'in_progress');
    const preparationId =
      active && (await canReplaceTrainingPreparation(getDb(), active))
        ? active.id
        : undefined;
    const savedWorkouts = readCustomWorkouts(
      await getMeta(getDb(), 'customWorkouts'),
    );
    // Only a general programme reads the programme; rehab never loads it.
    const program =
      isTrainingPreferences(preferences) && preferences.programId === 'general'
        ? await readTrainingProgram(getDb())
        : null;
    return {
      schedule: await loadWeeklySchedule(),
      preferences,
      program,
      logs: program ? await getDb().setLogs.toArray() : [],
      sessions,
      preparationId,
      savedWorkouts,
    };
  }, []);
  const [, navigate] = useLocation();
  // "/?andra=utrustning" still opens the direction setup directly (equipment lives in Settings now).
  const homeSearch = new URLSearchParams(useHashSearch());
  const wantsSetup = homeSearch.get('andra') === 'utrustning';
  // Only a known page may be returned to after the setup.
  const back = homeSearch.get('tillbaka');
  const backTo =
    back === 'nytt-pass'
      ? '/nytt-pass'
      : back === 'mitt-program'
        ? '/mitt-program'
        : '/traning/A';
  const [editing, setEditing] = useState(wantsSetup);
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
  if (!preferences && !editing) return <Redirect to="/kom-igang" />;
  if (editing)
    return (
      <div className="mx-auto max-w-md px-5 pt-5 pb-[var(--app-nav-clear)]">
        <TrainingSetup
          current={preferences}
          onSaved={() => {
            setEditing(false);
            // A changed direction shows on Idag; cancelling returns to Mitt program.
            if (wantsSetup) navigate(back === 'mitt-program' ? '/' : backTo);
          }}
          onCancel={() => {
            setEditing(false);
            if (wantsSetup) navigate(backTo);
          }}
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
  if (data.program && preferences?.programId === 'general')
    return (
      <ProgramHome
        preferences={preferences}
        program={data.program}
        sessions={data.sessions}
        logs={data.logs}
        active={active}
        prepared={prepared}
        due={due}
        recent={recent}
      />
    );
  // Custom workouts count in the weekly plan but never move the A/B sequence.
  const nextId = nextTemplateId(recent, preferences?.programId);
  const availability = preferences ? focusAvailable(preferences) : undefined;
  const dailyFocus =
    preferences && availability
      ? startingFocus(
          preferences,
          data.sessions,
          new Date(),
          availability.presets,
          availability.regions,
        )
      : undefined;
  const today = toLocalDate(new Date());
  const completedDates = completedTrainingDates(
    data.sessions,
    preferences?.programId,
  );
  const todayPlan =
    preferences?.programId === 'general' && !completedDates.includes(today)
      ? planForDate(
          data.schedule,
          today,
          data.savedWorkouts.map((w) => w.id),
        )
      : null;
  const displayedFocus =
    todayPlan?.kind === 'focus'
      ? { focus: { id: todayPlan.focus }, suggested: false }
      : dailyFocus;
  const nextDate =
    preferences?.programId === 'general'
      ? nextPlannedDate(data.schedule, today, completedDates)
      : null;
  const nextPlan = nextDate
    ? planForDate(
        data.schedule,
        nextDate,
        data.savedWorkouts.map((w) => w.id),
      )
    : null;
  const restNote =
    preferences?.programId === 'general' && dailyFocus
      ? todayPlan && todayPlan.kind !== 'standard'
        ? muscleRecoveryNote(
            recentMuscles(data.sessions, new Date()),
            musclesForPlan(todayPlan, data.savedWorkouts),
            new Date(),
          )
        : recoveryNote(
            recentMuscles(data.sessions, new Date()),
            dailyFocus.focus,
            new Date(),
          )
      : '';
  const startHref = active
    ? `/session/${active.id}`
    : todayPlan
      ? planHref(todayPlan, data.savedWorkouts, nextId)
      : `/traning/${nextId}${dailyFocus && preferences?.programId === 'general' ? `?${focusQuery(dailyFocus.focus)}` : ''}`;
  if (!preferences) return null;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <h1 className="m-0 text-5xl font-extrabold">
        {prepared
          ? 'Förbered ditt pass'
          : active
            ? 'Fortsätt ditt pass'
            : todayPlan
              ? `Idag: ${planLabel(todayPlan, data.savedWorkouts)}`
              : 'Nästa pass'}
      </h1>
      <p className="m-0 text-lg font-bold">
        {trainingName(preferences)}
        {!active &&
        preferences.programId !== 'rehab' &&
        todayPlan?.kind !== 'workout' &&
        displayedFocus?.focus.id === 'full'
          ? ` · Pass ${nextId}`
          : ''}
      </p>
      {preferences.programId !== 'rehab' ? (
        <>
          <p className="m-0 -mt-3 text-base text-ink-soft">
            Träningsvana: {experienceLabels[preferences.experience]}
          </p>
          <p className="m-0 -mt-3 text-base text-ink-soft">
            Har du ont eller en skada? Välj Knärehab eller följ din vårdgivare.
          </p>
        </>
      ) : null}
      {preferences.programId === 'general' && dailyFocus && !active ? (
        <p className="m-0 -mt-3 flex min-h-12 flex-wrap items-center gap-x-2 text-base">
          {todayPlan?.kind === 'workout'
            ? `Planerat eget pass: ${planLabel(todayPlan, data.savedWorkouts)}`
            : `Dagens fokus: ${focusLabel((displayedFocus ?? dailyFocus).focus.id)}`}
          {!todayPlan && dailyFocus.suggested ? ' (förslag)' : ''} ·{' '}
          <Link
            href={
              todayPlan?.kind === 'focus'
                ? `/fokus?${focusQuery({ id: todayPlan.focus })}`
                : '/fokus'
            }
            className="inline-flex min-h-12 items-center font-bold underline"
          >
            Byt
          </Link>
        </p>
      ) : null}
      <TimeoutNotice />
      <Link href={startHref} className={buttonClass('primary')}>
        {prepared
          ? 'Fortsätt förberedelsen'
          : active
            ? 'Fortsätt passet'
            : preferences.programId === 'rehab'
              ? 'Visa nästa pass'
              : 'Starta passet'}
      </Link>
      {!active && preferences.programId !== 'rehab' ? (
        <div className="-mt-3 flex flex-col">
          <Link href="/fokus" className={quietRow}>
            Träna något annat idag
          </Link>
          <Link
            href={`${startHref}${startHref.includes('?') ? '&' : '?'}byt=alla`}
            className={quietRow}
          >
            Byt övning
          </Link>
        </div>
      ) : null}
      {!active && !todayPlan && nextDate && nextPlan ? (
        <p className="m-0 -mt-3 text-base text-ink-soft">
          Nästa planerade:{' '}
          {weekdayNames[weekdayIndex(nextDate)]?.toLocaleLowerCase('sv')} ·{' '}
          {planLabel(nextPlan, data.savedWorkouts)}
        </p>
      ) : null}
      {restNote ? (
        <p className="m-0 -mt-3 text-base text-ink-soft">{restNote}</p>
      ) : null}
      {due.map((session) => (
        <Link
          key={session.id}
          href={`/kansla/${session.id}/dayAfter`}
          className={buttonClass('secondary')}
        >
          Hur känns det dagen efter {trainingName(session)}?
        </Link>
      ))}
      <CustomWorkoutList
        headingId="home-own-workouts"
        variant="home"
        alwaysShow
        disabled={locked}
      />
      <WeeklyPlan preferences={preferences} sessions={data.sessions} />
      {preferences.programId !== 'rehab' ? (
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
            Plan framåt
          </summary>
          <p className="m-0 text-base">
            Nästa ordinarie pass: {nextId}. Därefter:{' '}
            {nextId === 'A' ? 'B' : 'A'}. Du kan byta innan du börjar.
          </p>
          <p className="mt-2 mb-0 text-base">
            Nästa dos bygger på dina sparade set och svar om ansträngning. Ett
            lätt, komplett pass kan ge en extra repetition, men inte för en
            övning där det gjorde ont. Vikt ändrar du själv. Förslaget räknas om
            efter nästa pass.
          </p>
        </details>
      ) : null}
      <Link
        href="/mitt-program"
        className="flex min-h-14 items-center justify-between gap-2 border-y-2 border-edge py-2 text-lg font-bold text-ink no-underline"
      >
        <span>Mitt program</span>
        <Icon name="back" className="shrink-0 rotate-180" />
      </Link>
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
              {session.date} ·{' '}
              {session.customWorkoutId
                ? (session.customWorkoutName ?? 'Eget pass')
                : (programPassLabel(session) ??
                  `${session.workoutMode === 'short' ? 'Kortpass' : 'Pass'} ${session.templateId}`)}{' '}
              · {session.status === 'completed' ? 'klart' : 'avbrutet'}
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
