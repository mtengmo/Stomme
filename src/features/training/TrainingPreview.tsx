import { useLiveQuery } from 'dexie-react-hooks';
import { type SetStateAction, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exerciseSideCue } from '../../content/exerciseSideCues';
import { exerciseList, exercises } from '../../content/exercises';
import {
  kneeConditioningPlan,
  kneeRehabExercises,
  kneeRehabSource,
} from '../../content/kneeRehab';
import {
  bodyRegions,
  exerciseMuscles,
  type MuscleGroupId,
  muscleGroups,
} from '../../content/muscles';
import {
  physioKneeBanner,
  physioKneeConfirmLabel,
  physioKneeFitCount,
  physioKneeItemFor,
  physioKneeItems,
  physioKneePlan,
  physioKneePlanItem,
  physioKneeTotal,
  physioProgressionNotes,
} from '../../content/physioKneeProgramme';
import {
  experienceLabels,
  isTrainingPreferences,
  rehabGroup,
  trainingName,
} from '../../content/programmes';
import {
  type CustomWorkout,
  readCustomWorkouts,
} from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { readFavourites } from '../../db/favourites';
import { getMeta, listSessions } from '../../db/repo';
import {
  canReplaceTrainingPreparation,
  saveRehabPlan,
  startTrainingSession,
  validateTrainingPlan,
} from '../../db/training';
import type {
  ExerciseId,
  PlannedExercise,
  RehabFocus,
  Session,
  SetLog,
  TemplateId,
  TrainingPreferences,
} from '../../domain/types';
import { useHashSearch } from '../../lib/hashLocation';
import { equipmentFits } from '../../rules/equipment';
import { favouriteAlternatives } from '../../rules/favouriteSuggestions';
import { trainingPlanSuggestion } from '../../rules/training';
import {
  availableWeights,
  startingWeight,
  weightLabel,
} from '../../rules/weightInventory';
import { Banner } from '../../ui/Banner';
import { Button, buttonClass } from '../../ui/Button';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';
import { basePlan, defaultPlan, painLogsShowPain } from './defaultPlan';
import { clearFlags, readFlags, writeFlags } from './previewDraft';
import { ReadyWorkout } from './ReadyWorkout';
import { RehabCollection } from './RehabCollection';
import { startProblems } from './startReadiness';
import { inputClass } from './TrainingHome';

export { defaultPlan };

function available(preferences: TrainingPreferences) {
  return exerciseList.filter((exercise) =>
    exerciseMetadata[exercise.id].variants.some((variant) =>
      equipmentFits(variant.equipment, preferences.equipment),
    ),
  );
}

function PreviewEditor({
  preferences,

  id,

  sessions,

  logs,

  savedPlans,
  painReported,
  customWorkout,
  preparationId,
}: {
  preferences: TrainingPreferences;

  id: TemplateId;

  sessions: Session[];

  logs: SetLog[];

  savedPlans?: Partial<Record<RehabFocus, PlannedExercise[]>>;
  painReported?: boolean;
  customWorkout?: CustomWorkout;
  preparationId?: string;
}) {
  const [, navigate] = useLocation();
  const favourites = useLiveQuery(() => readFavourites(getDb()), []);

  const draftKey = `stomme.training-draft.${preferences.programId}.${preferences.rehabFocus ?? 'custom'}.${preferences.rehabSide ?? 'both'}.${id}.${[...preferences.equipment].sort().join(',')}.${JSON.stringify(preferences.weights ?? [])}.${preferences.experience}.${(preferences.bodyParts ?? []).join(',')}${customWorkout ? `.${customWorkout.id}` : ''}`;

  const [plan, setPlan] = useState(() => {
    try {
      const saved: unknown = JSON.parse(
        sessionStorage.getItem(draftKey) ?? 'null',
      );

      if (
        Array.isArray(saved) &&
        saved.length <= 12 &&
        saved.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            Object.hasOwn(exercises, item.exerciseId) &&
            ['sets', 'target', 'loadIndex', 'weightKg', 'restSec'].every(
              (key) =>
                typeof item[key] === 'number' && Number.isFinite(item[key]),
            ),
        )
      )
        return saved as PlannedExercise[];
    } catch {
      /* A damaged draft never replaces the saved session. */
    }

    const prepared = sessions.find(
      (session) =>
        session.id === preparationId &&
        session.templateId === id &&
        session.customWorkoutId === customWorkout?.id,
    );
    if (prepared) return structuredClone(prepared.plan);
    if (
      customWorkout?.plan &&
      validateTrainingPlan(customWorkout.plan) &&
      customWorkout.plan.map((item) => item.exerciseId).join() ===
        customWorkout.exerciseIds.join()
    )
      return structuredClone(customWorkout.plan);
    if (customWorkout)
      return customWorkout.exerciseIds.map((exerciseId) =>
        trainingPlanSuggestion(
          basePlan(exerciseId, preferences),
          preferences,
          sessions,
          logs,
        ),
      );
    return defaultPlan(
      preferences,
      id,
      sessions,
      logs,
      savedPlans,
      painReported,
    );
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(plan));
    } catch {
      /* Storage may be unavailable; starting still works. */
    }
  }, [draftKey, plan]);

  const [flags0] = useState(() => readFlags(draftKey));
  const [confirmed, setConfirmed] = useState(() => {
    if (!flags0.confirmed) return false;
    try {
      // A tick belongs to the draft it was given for; without a valid draft it is stale.
      return (
        sessionStorage.getItem(draftKey) !== null && validateTrainingPlan(plan)
      );
    } catch {
      return false;
    }
  });
  const [checkBefore, setCheckBefore] = useState(flags0.checkBefore);
  const [editing, setEditing] = useState(() => {
    if (
      customWorkout ||
      !validateTrainingPlan(plan) ||
      (preferences.programId === 'rehab' &&
        rehabGroup(preferences) === 'custom')
    )
      return true;
    try {
      return sessionStorage.getItem(`${draftKey}.editing`) === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(`${draftKey}.editing`, String(editing));
    } catch {
      /* Editing remains available without storage. */
    }
  }, [draftKey, editing]);
  const problems = startProblems(plan, preferences);
  const ready = problems.length === 0;

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const [saved, setSaved] = useState(false);

  function updatePlan(value: SetStateAction<PlannedExercise[]>) {
    setConfirmed(false);
    setRemoved(null);
    setSaved(false);
    setPlan(value);
  }

  const compatible = available(preferences).filter(
    (ex) =>
      preferences.programId !== 'rehab' ||
      rehabGroup(preferences) !== 'aaos' ||
      kneeRehabExercises.some((knee) => knee.id === ex.id),
  );

  const [addId, setAddId] = useState<ExerciseId | ''>('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
    try {
      const raw = sessionStorage.getItem(`${draftKey}.open`);
      const stored = raw === null ? Number.NaN : Number(raw);
      return Number.isInteger(stored) && stored >= 0 && stored < plan.length
        ? stored
        : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (expandedIndex === null) sessionStorage.removeItem(`${draftKey}.open`);
      else sessionStorage.setItem(`${draftKey}.open`, String(expandedIndex));
    } catch {
      /* The open row is a convenience only. */
    }
  }, [draftKey, expandedIndex]);
  const [removed, setRemoved] = useState<{
    item: PlannedExercise;
    index: number;
  } | null>(flags0.removed);
  useEffect(() => {
    writeFlags(draftKey, { confirmed, checkBefore, removed });
  }, [draftKey, confirmed, checkBefore, removed]);
  const [addMuscle, setAddMuscle] = useState<MuscleGroupId | ''>('');
  const [addRegion, setAddRegion] = useState('');
  const targetMuscles: readonly MuscleGroupId[] = addMuscle
    ? [addMuscle]
    : (bodyRegions.find((region) => region.id === addRegion)?.muscles ?? []);
  // Primary matches first; supporting matches are labelled as such.
  const pickable = compatible
    .filter((exercise) => !plan.some((item) => item.exerciseId === exercise.id))
    .flatMap((exercise) => {
      if (targetMuscles.length === 0)
        return [{ exercise, supporting: false, rank: 0 }];
      const { primary, secondary } = exerciseMuscles[exercise.id];
      if (primary.some((muscle) => targetMuscles.includes(muscle)))
        return [{ exercise, supporting: false, rank: 0 }];
      if (secondary.some((muscle) => targetMuscles.includes(muscle)))
        return [{ exercise, supporting: true, rank: 1 }];
      return [];
    })
    .sort((a, b) => a.rank - b.rank);

  const active = sessions.find(
    (session) =>
      session.status === 'in_progress' && session.id !== preparationId,
  );

  const physioPaper =
    preferences.programId === 'rehab' && rehabGroup(preferences) === 'physio';
  const confirmBox = (
    <label className="flex min-h-12 items-start gap-3 text-base leading-snug">
      <input
        type="checkbox"
        checked={confirmed}
        onChange={(event) => setConfirmed(event.target.checked)}
        className="size-6 shrink-0"
      />
      {`${physioKneeConfirmLabel.slice(0, -1)} (krävs för att börja).`}
    </label>
  );
  // Only the physio's paper needs a tick; every edit clears it again.
  const needsTick = physioPaper && !confirmed;
  const reasons = [
    ...problems,
    ...(needsTick
      ? ['Kryssa i rutan ovan när du har jämfört med ditt papper.']
      : []),
  ];
  const blockedText = reasons.length
    ? `${reasons[0]}${reasons.length > 1 ? ` (+${reasons.length - 1} till)` : ''}${problems.length && !editing ? ' Ändra under Anpassa passet.' : ''}`
    : '';
  const change = (index: number, patch: Partial<PlannedExercise>) =>
    updatePlan((current) =>
      current.map((item, n) => (n === index ? { ...item, ...patch } : item)),
    );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-4 pb-[calc(var(--app-nav-height)+12rem)]">
      <Link
        href="/"
        className="flex min-h-12 items-center text-base font-bold underline"
      >
        Till träningen
      </Link>

      <header>
        <h1 className="m-0 break-words text-5xl font-extrabold">
          {customWorkout?.name ??
            (preferences.programId === 'rehab'
              ? 'Mitt rehabpass'
              : `Pass ${id}`)}
        </h1>

        <p className="m-0 mt-2 text-lg font-bold">
          {trainingName(preferences)}
        </p>
        {preferences.programId !== 'rehab' ? (
          <p className="m-0 mt-1 text-base text-ink-soft">
            Träningsvana: {experienceLabels[preferences.experience]}
          </p>
        ) : null}
        {preferences.programId === 'general' &&
        preferences.bodyParts?.length ? (
          <p className="m-0 mt-1 text-base text-ink-soft">
            Fokus:{' '}
            {preferences.bodyParts
              .map(
                (part) =>
                  bodyRegions.find((region) => region.id === part)?.label ??
                  part,
              )
              .join(', ')}
          </p>
        ) : null}
        {customWorkout ? (
          <p className="m-0 mt-2 text-base text-ink-soft">
            Dina valda övningar. Passet använder din träningsinriktning,
            utrustning och frågorna om hur du mår.
          </p>
        ) : null}
        {customWorkout && !ready ? (
          <p className="m-0 mt-2 text-base">
            Kontrollera din utrustning och träningsinriktning på{' '}
            <Link href="/" className="font-bold underline">
              träningssidan
            </Link>
            . Knärehab använder bara övningar i AAOS-samlingen.
          </p>
        ) : null}
      </header>

      {preferences.programId === 'rehab' &&
      rehabGroup(preferences) === 'physio' ? (
        <Banner>{physioKneeBanner}</Banner>
      ) : null}

      {active ? (
        <>
          <p className="m-0 text-lg">Du har redan ett pågående pass.</p>

          <Link
            href={`/session/${active.id}`}
            className={buttonClass('primary')}
          >
            Fortsätt passet
          </Link>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="min-h-12 self-start text-base font-bold underline"
            aria-expanded={editing}
          >
            {editing ? 'Visa passöversikt' : 'Anpassa passet'}
          </button>
          {editing ? (
            <>
              {preferences.programId === 'rehab' ? (
                <p className="m-0 text-base">
                  {rehabGroup(preferences) === 'aaos'
                    ? 'Ett färdigt allmänt knäpass med styrka och rörlighet. Kontrollera övningar, sida och antal före start.'
                    : rehabGroup(preferences) === 'physio'
                      ? 'Kontrollera övningar, sida och antal mot ditt papper från fysioterapeuten.'
                      : 'Lägg till övningarna och doseringen från din fysioterapeut. Välj vilken sida som ska arbeta.'}
                </p>
              ) : null}

              {preferences.programId === 'rehab' &&
              rehabGroup(preferences) === 'custom' &&
              !customWorkout ? (
                <section
                  className="flex flex-col gap-2 border-y-2 border-edge py-3"
                  aria-label="Eget ländryggspass"
                >
                  <h2 className="m-0 text-2xl font-bold">
                    Ländrygg – personligt rehabprogram
                  </h2>
                  <p className="m-0 text-base">
                    Höftböjarstretch, magliggande på underarmar och hälglidning.
                    Använd samlingen om rörelserna ingår i ditt överenskomna
                    program. Du fyller själv i doseringen före start.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-12 self-start text-base font-bold underline"
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const workoutId = crypto.randomUUID();
                        await getDb().transaction(
                          'rw',
                          getDb().meta,
                          async () => {
                            const current = readCustomWorkouts(
                              await getMeta(getDb(), 'customWorkouts'),
                            );
                            if (current.length >= 30)
                              throw new Error('Du har redan 30 egna pass.');
                            await getDb().meta.put({
                              key: 'customWorkouts',
                              value: [
                                ...current,
                                {
                                  id: workoutId,
                                  name: 'Ländrygg – personligt rehabprogram',
                                  exerciseIds: [
                                    'kneeling-hip-flexor-stretch',
                                    'prone-on-forearms',
                                    'heel-slide',
                                  ],
                                },
                              ],
                            });
                          },
                        );
                        navigate(`/traning/${id}?workout=${workoutId}`);
                      } catch {
                        setError('Kunde inte skapa passet. Försök igen.');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Skapa eget ländryggspass
                  </button>
                </section>
              ) : null}

              {preferences.programId === 'rehab' &&
              rehabGroup(preferences) === 'aaos' ? (
                <section
                  aria-label="Färdigt knäpass"
                  className="flex flex-col gap-3"
                >
                  <p className="m-0 text-base">
                    Värm upp 5–10 minuter med promenad eller lugn cykling.
                    Förslaget är Stommes urval ur AAOS knäprogram. Vid skada
                    eller efter operation behöver övningsvalet stämmas av med
                    vården. Avbryt en övning som gör ont.
                  </p>
                  <p className="m-0 text-base text-ink-soft">
                    {kneeConditioningPlan(preferences).length} av 6 övningar
                    passar din utrustning. Vikten börjar på noll; 60 sekunders
                    setvila är appens justerbara standard. Ingen automatisk
                    ökning.
                  </p>
                  <a
                    href={kneeRehabSource}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center text-base font-bold underline"
                  >
                    Läs AAOS vägledning
                  </a>
                  <details>
                    <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                      Återställ till färdigt knäpass
                    </summary>
                    <p className="m-0 text-base">
                      Ersätter övningarna i förhandsvisningen. Ditt sparade
                      program ändras först när du sparar igen.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        updatePlan(kneeConditioningPlan(preferences));
                        setAddId('');
                      }}
                    >
                      Använd färdigt knäpass
                    </Button>
                  </details>
                </section>
              ) : null}

              {preferences.programId === 'rehab' &&
              rehabGroup(preferences) === 'physio' ? (
                <section
                  aria-label="Fysioterapeutens knäprogram"
                  className="flex flex-col gap-3"
                >
                  <p className="m-0 text-base text-ink-soft">
                    {physioKneeFitCount(preferences)} av {physioKneeTotal}{' '}
                    övningar passar din utrustning. 60 sekunders setvila är
                    appens justerbara standard. Ingen automatisk ökning.
                  </p>
                  <details>
                    <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                      Återställ till programmets startvärden
                    </summary>
                    <p className="m-0 text-base">
                      Ersätter övningarna i förhandsvisningen med startvärdena
                      ovan. Ditt sparade program ändras först när du sparar
                      igen.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        updatePlan(physioKneePlan(preferences));
                        setAddId('');
                      }}
                    >
                      Återställ till programmets startvärden
                    </Button>
                  </details>
                </section>
              ) : null}

              {preferences.programId === 'rehab' &&
              rehabGroup(preferences) !== 'custom' ? (
                <details className="border-y-2 border-edge py-2">
                  <summary className="min-h-12 cursor-pointer py-3 text-lg font-bold">
                    {rehabGroup(preferences) === 'physio'
                      ? `Välj övningar från programmet · ${physioKneeTotal} övningar`
                      : 'Välj övningar från AAOS · 12 övningar'}
                  </summary>
                  <RehabCollection
                    preferences={preferences}
                    plan={plan}
                    onAdd={(exerciseId) => {
                      const paper =
                        rehabGroup(preferences) === 'physio'
                          ? physioKneeItems.find(
                              (entry) => entry.exerciseId === exerciseId,
                            )
                          : undefined;
                      updatePlan((current) => [
                        ...current,
                        (paper && physioKneePlanItem(paper, preferences)) ||
                          basePlan(exerciseId, preferences),
                      ]);
                      setAddId('');
                    }}
                  />
                </details>
              ) : null}
              <h2 className="m-0 text-2xl font-bold">Övningar i passet</h2>
              {plan.length === 0 ? (
                <p className="m-0 text-base">
                  Inga övningar valda ännu. Lägg till övningar nedan.
                </p>
              ) : null}

              {removed ? (
                <div
                  role="status"
                  className="flex items-center justify-between gap-3 border-2 border-edge px-3"
                >
                  <span className="text-base">
                    Tog bort {exercises[removed.item.exerciseId].name}.
                  </span>
                  <button
                    type="button"
                    className="min-h-12 min-w-16 px-3 text-base font-bold underline"
                    onClick={() => {
                      const back = removed;
                      updatePlan((current) => {
                        const next = [...current];
                        next.splice(back.index, 0, back.item);
                        return next;
                      });
                      setExpandedIndex(back.index);
                    }}
                  >
                    Ångra
                  </button>
                </div>
              ) : null}
              <ol className="m-0 list-none p-0">
                {plan.map((item, index) => {
                  const exercise = exercises[item.exerciseId];
                  const paperNo = physioKneeItemFor(item.exerciseId)?.sheetNo;

                  return (
                    <li
                      key={exercise.id}
                      className={`flex flex-col gap-3 border-t-2 border-edge px-3 py-4 ${index % 2 ? 'bg-upcoming text-upcoming-ink' : 'bg-[color-mix(in_srgb,var(--ink)_8%,var(--paper))] text-ink'}`}
                    >
                      <button
                        type="button"
                        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
                        aria-expanded={expandedIndex === index}
                        onClick={() =>
                          setExpandedIndex((current) =>
                            current === index ? null : index,
                          )
                        }
                      >
                        <span>
                          <span className="block text-xl font-bold">
                            {physioPaper
                              ? paperNo
                                ? `${paperNo}. `
                                : ''
                              : `${index + 1}. `}
                            {exerciseReferences[exercise.id]} · {exercise.name}
                          </span>
                          <span className="block text-base font-normal">
                            {item.sets || '–'} × {item.target || '–'}
                            {exercise.unit === 'laps' ? ' varv' : ''}
                            {exercise.perSide ? ' per sida' : ''}
                            {item.weightKg > 0
                              ? ` · ${item.weightKg} kg totalt`
                              : ' · kroppsvikt'}
                          </span>
                        </span>
                        <span className="shrink-0 text-base font-bold underline">
                          {expandedIndex === index ? 'Stäng' : 'Ändra'}
                        </span>
                      </button>
                      {expandedIndex === index ? (
                        <>
                          <Link
                            href={`/ovning/${exercise.id}`}
                            className="flex min-h-12 items-center self-start text-base font-bold underline"
                          >
                            Visa hur övningen görs
                          </Link>
                          {favouriteAlternatives(
                            exercise.id,
                            favourites ?? [],
                            plan.map((entry) => entry.exerciseId),
                            preferences,
                          ).length > 0 ? (
                            <label className="flex flex-col gap-1 text-base font-bold">
                              Byt till en favorit med liknande rörelse
                              <select
                                className={inputClass}
                                value=""
                                onChange={(event) => {
                                  const replacement = event.target
                                    .value as ExerciseId;
                                  if (
                                    !favouriteAlternatives(
                                      exercise.id,
                                      favourites ?? [],
                                      plan.map((entry) => entry.exerciseId),
                                      preferences,
                                    ).includes(replacement)
                                  )
                                    return;
                                  const suggested = trainingPlanSuggestion(
                                    basePlan(replacement, preferences),
                                    preferences,
                                    sessions,
                                    logs,
                                  );
                                  updatePlan((current) =>
                                    current.map((entry, n) =>
                                      n === index
                                        ? {
                                            ...suggested,
                                            explanation: `En av dina favoriter. ${suggested.explanation ?? ''}`,
                                          }
                                        : entry,
                                    ),
                                  );
                                }}
                              >
                                <option value="">Behåll {exercise.name}</option>
                                {favouriteAlternatives(
                                  exercise.id,
                                  favourites ?? [],
                                  plan.map((entry) => entry.exerciseId),
                                  preferences,
                                ).map((candidate) => (
                                  <option key={candidate} value={candidate}>
                                    {exercises[candidate].name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          {preferences.programId === 'rehab' &&
                          rehabGroup(preferences) === 'aaos' ? (
                            <ExerciseDifficulty
                              exerciseId={exercise.id}
                              variantId={item.variantId}
                              loadIndex={item.loadIndex}
                              explain
                            />
                          ) : null}

                          {rehabGroup(preferences) === 'physio'
                            ? physioProgressionNotes(item.exerciseId).map(
                                (note) => (
                                  <p key={note} className="m-0 text-base">
                                    {note}
                                  </p>
                                ),
                              )
                            : null}

                          {physioPaper &&
                          item.explanation?.startsWith('Förifyllt') ? null : (
                            <p className="m-0 text-base text-ink-soft">
                              {item.explanation ??
                                (preferences.programId === 'rehab'
                                  ? 'Ange din överenskomna dosering.'
                                  : 'Startförslag. Anpassa före start.')}
                            </p>
                          )}

                          {!exerciseMetadata[exercise.id].variants.some(
                            (variant) =>
                              variant.id === item.variantId &&
                              equipmentFits(
                                variant.equipment,
                                preferences.equipment,
                              ),
                          ) ? (
                            <p role="alert" className="m-0 text-base font-bold">
                              Den tidigare utrustningen är inte tillgänglig.
                              Välj en variant nedan eller ta bort övningen.
                            </p>
                          ) : null}

                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1 text-base font-bold">
                              Set
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={item.sets || ''}
                                onChange={(event) =>
                                  change(index, {
                                    sets: Number(event.target.value),
                                  })
                                }
                                className={inputClass}
                              />
                            </label>

                            <label className="flex flex-col gap-1 text-base font-bold">
                              {exercise.unit === 'seconds'
                                ? 'Sekunder'
                                : exercise.unit === 'meters'
                                  ? 'Meter'
                                  : exercise.unit === 'laps'
                                    ? 'Varv'
                                    : 'Repetitioner'}

                              {exercise.perSide ? ' per sida' : ''}

                              <input
                                type="number"
                                min="1"
                                max="600"
                                value={item.target || ''}
                                onChange={(event) =>
                                  change(index, {
                                    target: Number(event.target.value),
                                  })
                                }
                                className={inputClass}
                              />
                            </label>

                            <label className="flex flex-col gap-1 text-base font-bold">
                              Total vikt (kg)
                              <input
                                type="number"
                                min="0"
                                max="500"
                                step="0.5"
                                disabled={
                                  !exerciseMetadata[exercise.id].variants

                                    .find(
                                      (variant) =>
                                        variant.id === item.variantId,
                                    )

                                    ?.equipment.some(
                                      (required) =>
                                        required.type === 'dumbbell' ||
                                        required.type === 'kettlebell',
                                    )
                                }
                                value={item.weightKg}
                                onChange={(event) =>
                                  change(index, {
                                    weightKg: Number(event.target.value),
                                  })
                                }
                                className={inputClass}
                                list={`weights-${exercise.id}`}
                              />
                              {(() => {
                                const variant = exerciseMetadata[
                                  exercise.id
                                ].variants.find(
                                  (entry) => entry.id === item.variantId,
                                );
                                const weighted = variant?.equipment.find(
                                  (entry) =>
                                    entry.type === 'dumbbell' ||
                                    entry.type === 'kettlebell',
                                );
                                const choices = weighted
                                  ? availableWeights(
                                      preferences,
                                      weighted.type as
                                        | 'dumbbell'
                                        | 'kettlebell',
                                      weighted.count,
                                    )
                                  : [];
                                return (
                                  <>
                                    {variant ? (
                                      <span className="font-normal text-ink-soft">
                                        {weightLabel(item.weightKg, variant)}
                                      </span>
                                    ) : null}
                                    {choices.length ? (
                                      <>
                                        <datalist id={`weights-${exercise.id}`}>
                                          {choices.map((choice) => (
                                            <option
                                              key={choice.label}
                                              value={choice.totalKg}
                                            >
                                              {choice.label}
                                            </option>
                                          ))}
                                        </datalist>
                                        <span className="font-normal text-ink-soft">
                                          Tillgängligt:{' '}
                                          {choices
                                            .map((choice) => choice.label)
                                            .join(', ')}
                                        </span>
                                        {item.weightKg > 0 &&
                                        !choices.some(
                                          (choice) =>
                                            choice.totalKg === item.weightKg,
                                        ) ? (
                                          <span className="font-normal text-ink-soft">
                                            {item.weightKg} kg finns inte bland
                                            dina registrerade vikter. Välj en av
                                            dem eller skriv vikten du använder
                                            idag, till exempel om du tränar på
                                            gym eller lånar utrustning. Din
                                            sparade utrustning ändras inte.
                                          </span>
                                        ) : null}
                                      </>
                                    ) : weighted ? (
                                      <span className="font-normal text-ink-soft">
                                        Ingen matchande vikt registrerad. Ange
                                        vikten du använder idag.
                                      </span>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </label>

                            <label className="flex flex-col gap-1 text-base font-bold">
                              Vila (sekunder)
                              <input
                                type="number"
                                min="0"
                                max="600"
                                value={item.restSec}
                                onChange={(event) =>
                                  change(index, {
                                    restSec: Number(event.target.value),
                                  })
                                }
                                className={inputClass}
                              />
                            </label>
                          </div>

                          <label className="flex flex-col gap-1 text-base font-bold">
                            Utrustningsvariant
                            <select
                              value={item.variantId ?? ''}
                              onChange={(event) => {
                                const variant = exerciseMetadata[
                                  exercise.id
                                ].variants.find(
                                  (value) => value.id === event.target.value,
                                );

                                if (variant) {
                                  const next = trainingPlanSuggestion(
                                    {
                                      ...item,
                                      variantId: variant.id,

                                      loadIndex: variant.defaultLoadIndex,

                                      weightKg: startingWeight(
                                        preferences,
                                        variant,
                                      ),
                                    },
                                    preferences,
                                    sessions,
                                    logs,
                                    variant.id,
                                  );
                                  change(index, {
                                    variantId: variant.id,
                                    loadIndex: next.loadIndex,
                                    weightKg: next.weightKg,
                                    explanation: next.explanation,
                                  });
                                }
                              }}
                              className={inputClass}
                            >
                              {!exerciseMetadata[exercise.id].variants.some(
                                (variant) =>
                                  variant.id === item.variantId &&
                                  equipmentFits(
                                    variant.equipment,

                                    preferences.equipment,
                                  ),
                              ) ? (
                                <option value={item.variantId ?? ''}>
                                  Tidigare variant · välj tillgänglig utrustning
                                </option>
                              ) : null}

                              {exerciseMetadata[exercise.id].variants

                                .filter((variant) =>
                                  equipmentFits(
                                    variant.equipment,

                                    preferences.equipment,
                                  ),
                                )

                                .map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.label}
                                  </option>
                                ))}
                            </select>
                          </label>

                          {exercise.perSide ? (
                            <label className="flex flex-col gap-1 text-base font-bold">
                              Arbetande sida
                              <select
                                aria-label="Arbetande sida"
                                aria-describedby={`side-cue-${index}`}
                                value={
                                  item.sides?.length === 1
                                    ? item.sides[0]
                                    : 'both'
                                }
                                onChange={(event) =>
                                  change(index, {
                                    sides:
                                      event.target.value === 'both'
                                        ? ['right', 'left']
                                        : [
                                            event.target.value as
                                              | 'right'
                                              | 'left',
                                          ],
                                  })
                                }
                                className={inputClass}
                              >
                                <option value="both">
                                  Höger och vänster, en i taget
                                </option>

                                <option value="right">Endast höger</option>

                                <option value="left">Endast vänster</option>
                              </select>
                              <span
                                id={`side-cue-${index}`}
                                className="text-base font-normal text-ink-soft"
                              >
                                {
                                  exerciseSideCue(
                                    exercise.id,
                                    item.sides?.length === 1 &&
                                      item.sides[0] === 'left'
                                      ? 'left'
                                      : 'right',
                                  )?.explanation
                                }
                              </span>
                            </label>
                          ) : null}

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              className="min-h-12 rounded-sm border-2 border-edge px-3 text-base font-bold disabled:opacity-50"
                              onClick={() => {
                                updatePlan((current) => {
                                  const next = [...current];
                                  const [moved] = next.splice(index, 1);
                                  if (moved) next.splice(index - 1, 0, moved);
                                  return next;
                                });
                                setExpandedIndex(index - 1);
                              }}
                            >
                              Flytta upp
                            </button>
                            <button
                              type="button"
                              disabled={index === plan.length - 1}
                              className="min-h-12 rounded-sm border-2 border-edge px-3 text-base font-bold disabled:opacity-50"
                              onClick={() => {
                                updatePlan((current) => {
                                  const next = [...current];
                                  const [moved] = next.splice(index, 1);
                                  if (moved) next.splice(index + 1, 0, moved);
                                  return next;
                                });
                                setExpandedIndex(index + 1);
                              }}
                            >
                              Flytta ned
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const gone = plan[index];
                              updatePlan((current) =>
                                current.filter((_, n) => n !== index),
                              );
                              setExpandedIndex(null);
                              if (gone) setRemoved({ item: gone, index });
                            }}
                            className="min-h-12 self-start px-2 text-base font-bold underline"
                          >
                            Ta bort {exercise.name}
                          </button>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              {preferences.programId !== 'rehab' ? (
                <p className="m-0 text-base text-ink-soft">
                  Startförslaget matchar din utrustning. Anpassa efter din vana;
                  vikten anges totalt för alla redskap. Ändringar sparas direkt
                  i utkastet.
                </p>
              ) : null}
              {preferences.programId !== 'rehab' &&
              (!compatible.some((exercise) =>
                ['floor-press', 'kettlebell-floor-press'].includes(exercise.id),
              ) ||
                !compatible.some(
                  (exercise) => exercise.id === 'supported-row',
                )) ? (
                <p className="m-0 text-base text-ink-soft">
                  Fler redskap ger fler press- och dragövningar. Välj bland
                  tillgängliga övningar nedan.
                </p>
              ) : null}

              {preferences.programId !== 'rehab' ? (
                <Link
                  href="/installningar"
                  className="flex min-h-12 items-center self-start text-base font-bold underline"
                >
                  Min utrustning
                </Link>
              ) : null}

              {physioPaper ? null : (
                <>
                  <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="mb-2 text-lg font-bold">
                      Kroppsdel
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: '', label: 'Alla' }, ...bodyRegions].map(
                        (region) => (
                          <button
                            key={region.id}
                            type="button"
                            aria-pressed={!addMuscle && addRegion === region.id}
                            onClick={() => {
                              setAddRegion(region.id);
                              setAddMuscle('');
                              setAddId('');
                            }}
                            className={`min-h-12 rounded-sm border-2 px-3 text-base font-bold ${!addMuscle && addRegion === region.id ? 'border-action bg-action text-action-ink' : 'border-edge text-ink'}`}
                          >
                            {region.label}
                          </button>
                        ),
                      )}
                    </div>
                    <details>
                      <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                        Mer specifikt
                      </summary>
                      <label className="flex flex-col gap-2 text-base font-bold">
                        Muskelgrupp
                        <select
                          className={inputClass}
                          value={addMuscle}
                          onChange={(event) => {
                            setAddMuscle(
                              event.target.value as MuscleGroupId | '',
                            );
                            setAddId('');
                          }}
                        >
                          <option value="">Ingen vald</option>
                          {(Object.keys(muscleGroups) as MuscleGroupId[]).map(
                            (group) => (
                              <option key={group} value={group}>
                                {muscleGroups[group].label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </details>
                    <p className="m-0 text-base text-ink-soft">
                      Kroppsdelar är träningsmål, inte en bedömning av vad som
                      passar dig.
                    </p>
                  </fieldset>
                  <label className="flex flex-col gap-2 text-lg font-bold">
                    Lägg till övning
                    <select
                      className={inputClass}
                      value={addId}
                      onChange={(event) =>
                        setAddId(event.target.value as ExerciseId | '')
                      }
                    >
                      <option value="">
                        {pickable.length
                          ? 'Välj övning'
                          : 'Inga övningar passar'}
                      </option>
                      {pickable.map(({ exercise, supporting }) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                          {supporting ? ' · stödjer' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {pickable.length === 0 ? (
                    <p className="m-0 text-base text-ink-soft">
                      Inga fler övningar passar vald kroppsdel och din
                      utrustning. Välj Alla eller ändra utrustning i Min
                      utrustning.
                    </p>
                  ) : null}

                  <Button
                    variant="secondary"
                    disabled={!addId || plan.length >= 12}
                    onClick={() => {
                      if (addId)
                        updatePlan((current) => [
                          ...current,

                          basePlan(addId, preferences),
                        ]);

                      if (addId) setExpandedIndex(plan.length);
                      setAddId('');
                    }}
                  >
                    Lägg till i passet
                  </Button>
                </>
              )}
            </>
          ) : (
            <ReadyWorkout
              plan={plan}
              preferences={preferences}
              onChange={(index) => {
                setExpandedIndex(index);
                setEditing(true);
              }}
            />
          )}
          {preferences.programId === 'rehab' ? null : (
            <details className="border-y-2 border-edge py-2">
              <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                Besvär eller något att anpassa idag?
              </summary>
              <label className="flex min-h-12 items-start gap-3 py-2 text-base">
                <input
                  type="checkbox"
                  checked={checkBefore}
                  onChange={(event) => setCheckBefore(event.target.checked)}
                  className="size-6 shrink-0"
                />
                Fråga hur kroppen känns före passet. Annars börjar passet
                direkt.
              </label>
              <p className="m-0 text-base text-ink-soft">
                Du kan alltid rapportera besvär under passet. Ett överhoppat
                svar sparas inte som besvärsfritt.
              </p>
            </details>
          )}

          {editing && customWorkout ? (
            <>
              <Button
                variant="secondary"
                disabled={busy || !ready}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await getDb().transaction('rw', getDb().meta, async () => {
                      const current = readCustomWorkouts(
                        (await getDb().meta.get('customWorkouts'))?.value,
                      );
                      if (
                        !current.some(
                          (workout) => workout.id === customWorkout.id,
                        )
                      )
                        throw new Error('Passet finns inte kvar.');
                      await getDb().meta.put({
                        key: 'customWorkouts',
                        value: current.map((workout) =>
                          workout.id === customWorkout.id
                            ? {
                                ...workout,
                                exerciseIds: plan.map(
                                  (item) => item.exerciseId,
                                ),
                                plan,
                              }
                            : workout,
                        ),
                      });
                    });
                    setSaved(true);
                  } catch {
                    setError('Kunde inte spara passet. Försök igen.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Spara ändringar i eget pass
              </Button>
              <p className="m-0 text-base text-ink-soft">
                {saved
                  ? 'Ändringarna är sparade.'
                  : 'Spara för att återanvända övningar, antal, vikt och vila.'}
              </p>
              <Link
                href="/ovningar"
                className="flex min-h-12 items-center font-bold underline"
              >
                Till mina egna pass
              </Link>
            </>
          ) : null}
          {editing && !customWorkout && preferences.programId === 'rehab' ? (
            <>
              <Button
                variant="secondary"
                aria-describedby={
                  !ready || needsTick ? 'start-blocked' : undefined
                }
                disabled={busy || !ready || needsTick}
                onClick={async () => {
                  setBusy(true);
                  setError('');

                  try {
                    await saveRehabPlan(
                      getDb(),
                      preferences.rehabFocus ?? 'custom',
                      plan,
                    );
                    setSaved(true);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Kunde inte spara programmet.',
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Spara rehabprogram
              </Button>

              <p role="status" className="m-0 text-base text-ink-soft">
                {saved
                  ? 'Rehabprogrammet är sparat på den här enheten. Det används nästa gång du planerar ett pass.'
                  : 'Spara för att återanvända övningar, sidor och dosering utan att starta ett pass.'}
              </p>
            </>
          ) : null}

          {error ? (
            <p role="alert" className="m-0 text-base font-bold">
              {error}
            </p>
          ) : null}

          <div className="fixed inset-x-0 bottom-[var(--app-nav-height)] z-10 border-t-2 border-ink bg-surface-tint px-5 py-2">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-1">
              {physioPaper ? confirmBox : null}
              <p
                id="start-blocked"
                aria-live="polite"
                className="m-0 text-base font-bold empty:hidden"
              >
                {blockedText}
              </p>
              <Button
                className={physioPaper ? 'min-h-14!' : ''}
                aria-describedby={reasons.length ? 'start-blocked' : undefined}
                disabled={busy || reasons.length > 0}
                onClick={async () => {
                  setBusy(true);

                  try {
                    const session = await startTrainingSession(
                      getDb(),

                      preferences,

                      id,

                      plan,
                      new Date(),
                      customWorkout,
                    );

                    try {
                      sessionStorage.removeItem(draftKey);
                      sessionStorage.removeItem(`${draftKey}.editing`);
                      sessionStorage.removeItem(`${draftKey}.open`);
                      clearFlags(draftKey);
                    } catch {
                      /* No persistent draft to clear. */
                    }

                    navigate(
                      preferences.programId === 'rehab' || checkBefore
                        ? `/kansla/${session.id}/before`
                        : `/session/${session.id}`,
                    );
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Kunde inte starta passet.',
                    );

                    setBusy(false);
                  }
                }}
              >
                Börja passet
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function TrainingPreview({ id }: { id: string }) {
  const workoutId = new URLSearchParams(useHashSearch()).get('workout');
  const data = useLiveQuery(async () => {
    const sessions = await listSessions(getDb());
    const active = sessions.find((session) => session.status === 'in_progress');
    const preparationId =
      active && (await canReplaceTrainingPreparation(getDb(), active))
        ? active.id
        : undefined;
    return {
      preferences: await getMeta(getDb(), 'training'),
      customWorkouts: readCustomWorkouts(
        await getMeta(getDb(), 'customWorkouts'),
      ),

      sessions,

      logs: await getDb().setLogs.toArray(),
      painReported: painLogsShowPain(await getDb().painLogs.toArray()),
      preparationId,

      savedPlans: (await getMeta(getDb(), 'rehabPlans')) as
        | Partial<Record<RehabFocus, PlannedExercise[]>>
        | undefined,
    };
  }, []);

  if (!data) return null;

  if (!isTrainingPreferences(data.preferences) || (id !== 'A' && id !== 'B'))
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <h1 className="text-4xl font-bold">Välj träningsinriktning först</h1>

        <Link href="/" className={buttonClass('primary')}>
          Till träningen
        </Link>
      </div>
    );

  const customWorkout = data.customWorkouts.find(
    (workout) => workout.id === workoutId,
  );
  if (workoutId && !customWorkout)
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <h1 className="text-4xl font-bold">Passet finns inte kvar</h1>
        <Link href="/ovningar" className={buttonClass('primary')}>
          Till egna pass
        </Link>
      </div>
    );
  return (
    <PreviewEditor
      key={`${data.preferences.programId}-${data.preferences.rehabFocus ?? 'custom'}-${id}-${customWorkout?.id ?? 'standard'}-${data.preferences.experience}-${(data.preferences.bodyParts ?? []).join(',')}`}
      customWorkout={customWorkout}
      preparationId={data.preparationId}
      preferences={data.preferences}
      id={id}
      sessions={data.sessions}
      logs={data.logs}
      savedPlans={data.savedPlans}
      painReported={data.painReported}
    />
  );
}
