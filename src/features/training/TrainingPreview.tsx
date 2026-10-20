import { useLiveQuery } from 'dexie-react-hooks';

import { type SetStateAction, useEffect, useState } from 'react';

import { Link, useLocation } from 'wouter';

import { exerciseMetadata } from '../../content/exerciseMetadata';

import { exerciseList, exercises } from '../../content/exercises';
import {
  kneeConditioningPlan,
  kneeRehabExercises,
  kneeRehabSource,
} from '../../content/kneeRehab';
import { isTrainingPreferences, trainingName } from '../../content/programmes';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import {
  saveRehabPlan,
  startTrainingSession,
  validateTrainingPlan,
} from '../../db/training';
import type {
  ExerciseId,
  PlannedExercise,
  Session,
  SetLog,
  TemplateId,
  TrainingPreferences,
} from '../../domain/types';
import { equipmentFits } from '../../rules/equipment';
import { initialTrainingRoster } from '../../rules/programRosters';
import { trainingPlanSuggestion } from '../../rules/training';
import { Button, buttonClass } from '../../ui/Button';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';
import { KneeCollection } from './KneeCollection';
import { ReadyWorkout } from './ReadyWorkout';
import { inputClass } from './TrainingHome';

function available(preferences: TrainingPreferences) {
  return exerciseList.filter((exercise) =>
    exerciseMetadata[exercise.id].variants.some((variant) =>
      equipmentFits(variant.equipment, preferences.equipment),
    ),
  );
}

function basePlan(
  id: ExerciseId,

  preferences: TrainingPreferences,
): PlannedExercise {
  const exercise = exercises[id];

  const variant = exerciseMetadata[id].variants.find((item) =>
    equipmentFits(item.equipment, preferences.equipment),
  );

  const loadIndex = variant?.defaultLoadIndex ?? 0;

  return {
    exerciseId: id,

    sets:
      preferences.programId === 'rehab'
        ? 0
        : preferences.experience === 'regular'
          ? 3
          : 2,

    target: preferences.programId === 'rehab' ? 0 : exercise.range.start,

    loadIndex,

    weightKg: exercise.loadLadder[loadIndex]?.kg ?? 0,

    restSec: 60,

    reason: 'first_time',

    variantId: variant?.id,

    sides: exercise.perSide
      ? preferences.programId === 'rehab' &&
        preferences.rehabSide &&
        preferences.rehabSide !== 'both'
        ? [preferences.rehabSide]
        : ['right', 'left']
      : ['both'],
  };
}

function defaultPlan(
  preferences: TrainingPreferences,

  id: TemplateId,

  sessions: Session[],

  logs: SetLog[],

  savedPlans?: Partial<Record<'custom' | 'knee', PlannedExercise[]>>,
): PlannedExercise[] {
  if (preferences.programId === 'rehab') {
    const focus = preferences.rehabFocus ?? 'custom';

    const saved = savedPlans?.[focus];

    if (saved && validateTrainingPlan(saved)) return structuredClone(saved);

    const prior = sessions.find(
      (session) =>
        session.programId === 'rehab' &&
        (session.rehabFocus ?? 'custom') === focus,
    );

    return (
      prior?.plan.map((plan) => ({
        ...plan,

        explanation: 'Din senast använda dosering. Kontrollera före start.',
      })) ?? (focus === 'knee' ? kneeConditioningPlan(preferences) : [])
    );
  }

  const ids = initialTrainingRoster(preferences, id);

  return ids.map((exerciseId) => {
    const plan = basePlan(exerciseId, preferences);

    return trainingPlanSuggestion(plan, preferences, sessions, logs);
  });
}

function PreviewEditor({
  preferences,

  id,

  sessions,

  logs,

  savedPlans,
}: {
  preferences: TrainingPreferences;

  id: TemplateId;

  sessions: Session[];

  logs: SetLog[];

  savedPlans?: Partial<Record<'custom' | 'knee', PlannedExercise[]>>;
}) {
  const [, navigate] = useLocation();

  const draftKey = `stomme.training-draft.${preferences.programId}.${preferences.rehabFocus ?? 'custom'}.${preferences.rehabSide ?? 'both'}.${id}.${[...preferences.equipment].sort().join(',')}`;

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

    return defaultPlan(preferences, id, sessions, logs, savedPlans);
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(plan));
    } catch {
      /* Storage may be unavailable; starting still works. */
    }
  }, [draftKey, plan]);

  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(() => {
    if (
      !validateTrainingPlan(plan) ||
      (preferences.programId === 'rehab' && preferences.rehabFocus !== 'knee')
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
  const ready =
    validateTrainingPlan(plan) &&
    plan.every((item) => {
      const variant = exerciseMetadata[item.exerciseId].variants.find(
        (v) => v.id === item.variantId,
      );
      return (
        !!variant && equipmentFits(variant.equipment, preferences.equipment)
      );
    });

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const [saved, setSaved] = useState(false);

  function updatePlan(value: SetStateAction<PlannedExercise[]>) {
    setConfirmed(false);
    setSaved(false);
    setPlan(value);
  }

  const compatible = available(preferences).filter(
    (ex) =>
      preferences.programId !== 'rehab' ||
      preferences.rehabFocus !== 'knee' ||
      kneeRehabExercises.some((knee) => knee.id === ex.id),
  );

  const [addId, setAddId] = useState<ExerciseId | ''>('');

  const active = sessions.find((session) => session.status === 'in_progress');

  const change = (index: number, patch: Partial<PlannedExercise>) =>
    updatePlan((current) =>
      current.map((item, n) => (n === index ? { ...item, ...patch } : item)),
    );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-4 pb-28">
      <Link
        href="/"
        className="flex min-h-12 items-center text-base font-bold underline"
      >
        Till träningen
      </Link>

      <header>
        <h1 className="m-0 text-5xl font-extrabold">
          {preferences.programId === 'rehab' ? 'Mitt rehabpass' : `Pass ${id}`}
        </h1>

        <p className="m-0 mt-2 text-lg font-bold">
          {trainingName(preferences)}
        </p>
      </header>

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
              <p className="m-0 text-base">
                {preferences.programId === 'rehab'
                  ? preferences.rehabFocus === 'knee'
                    ? 'Ett färdigt allmänt knäpass med styrka och rörlighet. Kontrollera övningar, sida och antal före start.'
                    : 'Lägg till övningarna och doseringen från din fysioterapeut. Välj vilken sida som ska arbeta.'
                  : 'Startförslaget matchar din utrustning. Anpassa efter din vana; vikten anges totalt för alla redskap.'}
              </p>

              {preferences.programId === 'rehab' &&
              preferences.rehabFocus === 'knee' ? (
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

              {preferences.programId === 'rehab' &&
              preferences.rehabFocus === 'knee' ? (
                <details className="border-y-2 border-edge py-2">
                  <summary className="min-h-12 cursor-pointer py-3 text-lg font-bold">
                    Välj övningar från AAOS · 12 övningar
                  </summary>
                  <KneeCollection
                    preferences={preferences}
                    plan={plan}
                    onAdd={(exerciseId) => {
                      updatePlan((current) => [
                        ...current,
                        basePlan(exerciseId, preferences),
                      ]);
                      setAddId('');
                    }}
                  />
                </details>
              ) : null}
              <h2 className="m-0 text-3xl font-bold">Övningar i passet</h2>

              {plan.length === 0 ? (
                <p className="m-0 text-base">
                  Inga övningar valda ännu. Lägg till övningar nedan.
                </p>
              ) : null}

              <ol className="m-0 list-none p-0">
                {plan.map((item, index) => {
                  const exercise = exercises[item.exerciseId];

                  return (
                    <li
                      key={exercise.id}
                      className="flex flex-col gap-3 border-t-2 border-edge py-5"
                    >
                      <Link
                        href={`/ovning/${exercise.id}`}
                        className="flex min-h-12 items-center text-xl font-bold underline"
                      >
                        {exercise.name}
                      </Link>
                      {preferences.programId === 'rehab' &&
                      preferences.rehabFocus === 'knee' ? (
                        <ExerciseDifficulty
                          exerciseId={exercise.id}
                          variantId={item.variantId}
                          loadIndex={item.loadIndex}
                          explain
                        />
                      ) : null}

                      <p className="m-0 text-base text-ink-soft">
                        {item.explanation ??
                          (preferences.programId === 'rehab'
                            ? 'Ange din överenskomna dosering.'
                            : 'Startförslag. Anpassa före start.')}
                      </p>

                      {!exerciseMetadata[exercise.id].variants.some(
                        (variant) =>
                          variant.id === item.variantId &&
                          equipmentFits(
                            variant.equipment,
                            preferences.equipment,
                          ),
                      ) ? (
                        <p role="alert" className="m-0 text-base font-bold">
                          Den tidigare utrustningen är inte tillgänglig. Välj en
                          variant nedan eller ta bort övningen.
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
                                  (variant) => variant.id === item.variantId,
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
                          />
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

                            if (variant)
                              change(index, {
                                variantId: variant.id,

                                loadIndex: variant.defaultLoadIndex,

                                weightKg:
                                  exercise.loadLadder[variant.defaultLoadIndex]
                                    ?.kg ?? 0,
                              });
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
                            value={
                              item.sides?.length === 1 ? item.sides[0] : 'both'
                            }
                            onChange={(event) =>
                              change(index, {
                                sides:
                                  event.target.value === 'both'
                                    ? ['right', 'left']
                                    : [event.target.value as 'right' | 'left'],
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
                        </label>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          updatePlan((current) =>
                            current.filter((_, n) => n !== index),
                          )
                        }
                        className="min-h-12 self-start px-2 text-base font-bold underline"
                      >
                        Ta bort {exercise.name}
                      </button>
                    </li>
                  );
                })}
              </ol>

              <label className="flex flex-col gap-2 text-lg font-bold">
                Lägg till övning
                <select
                  className={inputClass}
                  value={addId}
                  onChange={(event) =>
                    setAddId(event.target.value as ExerciseId | '')
                  }
                >
                  <option value="">Välj övning</option>

                  {compatible

                    .filter(
                      (exercise) =>
                        !plan.some((item) => item.exerciseId === exercise.id),
                    )

                    .map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                </select>
              </label>

              <Button
                variant="secondary"
                disabled={!addId || plan.length >= 12}
                onClick={() => {
                  if (addId)
                    updatePlan((current) => [
                      ...current,

                      basePlan(addId, preferences),
                    ]);

                  setAddId('');
                }}
              >
                Lägg till i passet
              </Button>
            </>
          ) : (
            <ReadyWorkout plan={plan} preferences={preferences} />
          )}
          {!ready ? (
            <p role="alert" className="m-0 text-base font-bold">
              Kontrollera övningar, antal och tillgänglig utrustning under
              Anpassa passet.
            </p>
          ) : null}
          {preferences.programId === 'rehab' ? (
            <label className="flex min-h-12 items-start gap-3 py-3 text-base">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="size-6 shrink-0"
              />
              {preferences.rehabFocus === 'knee'
                ? 'Jag har kontrollerat övningar, sida och antal för det här passet.'
                : 'Jag har kontrollerat övningar, sida och dosering mot mitt överenskomna rehabprogram.'}
            </label>
          ) : null}

          {editing && preferences.programId === 'rehab' ? (
            <>
              <Button
                variant="secondary"
                disabled={busy || !confirmed || !plan.length}
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

          <div
            className={
              !editing
                ? 'fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper px-5 py-4'
                : ''
            }
          >
            <div className="mx-auto w-full max-w-xl">
              <Button
                disabled={
                  busy ||
                  !ready ||
                  (preferences.programId === 'rehab' && !confirmed)
                }
                onClick={async () => {
                  setBusy(true);

                  try {
                    const session = await startTrainingSession(
                      getDb(),

                      preferences,

                      id,

                      plan,
                    );

                    try {
                      sessionStorage.removeItem(draftKey);
                      sessionStorage.removeItem(`${draftKey}.editing`);
                    } catch {
                      /* No persistent draft to clear. */
                    }

                    navigate(`/kansla/${session.id}/before`);
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
  const data = useLiveQuery(
    async () => ({
      preferences: await getMeta(getDb(), 'training'),

      sessions: await listSessions(getDb()),

      logs: await getDb().setLogs.toArray(),

      savedPlans: (await getMeta(getDb(), 'rehabPlans')) as
        | Partial<Record<'custom' | 'knee', PlannedExercise[]>>
        | undefined,
    }),

    [],
  );

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

  return (
    <PreviewEditor
      key={`${data.preferences.programId}-${data.preferences.rehabFocus ?? 'custom'}-${id}`}
      preferences={data.preferences}
      id={id}
      sessions={data.sessions}
      logs={data.logs}
      savedPlans={data.savedPlans}
    />
  );
}
