import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exerciseList, exercises } from '../../content/exercises';
import {
  isTrainingPreferences,
  programmeNames,
} from '../../content/programmes';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import { startTrainingSession } from '../../db/training';
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
    sides: exercise.perSide ? ['right', 'left'] : ['both'],
  };
}
function defaultPlan(
  preferences: TrainingPreferences,
  id: TemplateId,
  sessions: Session[],
  logs: SetLog[],
): PlannedExercise[] {
  if (preferences.programId === 'rehab') {
    const prior = sessions.find((session) => session.programId === 'rehab');
    return (
      prior?.plan.map((plan) => ({
        ...plan,
        explanation:
          'Din senast sparade rehabdosering. Kontrollera mot din överenskommelse.',
      })) ?? []
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
}: {
  preferences: TrainingPreferences;
  id: TemplateId;
  sessions: Session[];
  logs: SetLog[];
}) {
  const [, navigate] = useLocation();
  const draftKey = `stomme.training-draft.${preferences.programId}.${id}.${[...preferences.equipment].sort().join(',')}`;
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
    return defaultPlan(preferences, id, sessions, logs);
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(plan));
    } catch {
      /* Storage may be unavailable; starting still works. */
    }
  }, [draftKey, plan]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const compatible = available(preferences);
  const [addId, setAddId] = useState<ExerciseId | ''>('');
  const active = sessions.find((session) => session.status === 'in_progress');
  const change = (index: number, patch: Partial<PlannedExercise>) =>
    setPlan((current) =>
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
          {programmeNames[preferences.programId]}
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
          <p className="m-0 text-base">
            {preferences.programId === 'rehab'
              ? 'Lägg till övningarna och doseringen från din fysioterapeut. Välj vilken sida som ska arbeta.'
              : 'Startförslaget matchar din utrustning. Anpassa efter din vana; vikten anges totalt för alla redskap.'}
          </p>
          {preferences.programId !== 'rehab' &&
          !compatible.some((exercise) => exercise.id === 'floor-press') ? (
            <p className="m-0 text-base text-ink-soft">
              Med den valda utrustningen saknas vissa press- och dragövningar.
              Lägg till utrustning under Byt träningsinriktning för fler val.
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
                  <p className="m-0 text-base text-ink-soft">
                    {item.explanation ??
                      (preferences.programId === 'rehab'
                        ? 'Ange din överenskomna dosering.'
                        : 'Startförslag. Anpassa före start.')}
                  </p>
                  {!exerciseMetadata[exercise.id].variants.some(
                    (variant) =>
                      variant.id === item.variantId &&
                      equipmentFits(variant.equipment, preferences.equipment),
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
                          change(index, { sets: Number(event.target.value) })
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
                          change(index, { target: Number(event.target.value) })
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
                            .find((variant) => variant.id === item.variantId)
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
                          change(index, { restSec: Number(event.target.value) })
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
                      setPlan((current) =>
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
                setPlan((current) => [
                  ...current,
                  basePlan(addId, preferences),
                ]);
              setAddId('');
            }}
          >
            Lägg till i passet
          </Button>
          {preferences.programId === 'rehab' ? (
            <label className="flex min-h-12 items-start gap-3 py-3 text-base">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="size-6 shrink-0"
              />
              Jag har kontrollerat övningar, sida och dosering mot mitt
              överenskomna rehabprogram.
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="m-0 text-base font-bold">
              {error}
            </p>
          ) : null}
          <Button
            disabled={
              busy ||
              !plan.length ||
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
            Starta pass
          </Button>
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
      key={`${data.preferences.programId}-${id}`}
      preferences={data.preferences}
      id={id}
      sessions={data.sessions}
      logs={data.logs}
    />
  );
}
