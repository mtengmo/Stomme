import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import {
  experienceLabels,
  isTrainingPreferences,
  trainingName,
} from '../../content/programmes';
import { getDb } from '../../db/db';
import { getMeta } from '../../db/repo';
import { recordTrainingCheckin } from '../../db/training';
import type { SymptomReport, TrainingCheckin } from '../../domain/types';
import { Button, buttonClass } from '../../ui/Button';
import { ScorePicker } from '../../ui/ScorePicker';
import { inputClass } from './TrainingHome';

export function SymptomFields({
  value,
  onChange,
}: {
  value: SymptomReport;
  onChange(value: SymptomReport): void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-base font-bold">
        Var känns besvären?
        <select
          value={value.area}
          onChange={(event) => onChange({ ...value, area: event.target.value })}
          className={inputClass}
        >
          <option value="">Välj kroppsdel</option>
          {[
            'Knä',
            'Höft',
            'Rygg',
            'Axel',
            'Armbåge',
            'Handled',
            'Fot eller fotled',
            'Annan kroppsdel',
          ].map((area) => (
            <option key={area}>{area}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-base font-bold">
        Sida
        <select
          value={value.side}
          onChange={(event) =>
            onChange({
              ...value,
              side: event.target.value as SymptomReport['side'],
            })
          }
          className={inputClass}
        >
          <option value="unspecified">Ej sidospecifikt</option>
          <option value="right">Höger</option>
          <option value="left">Vänster</option>
          <option value="both">Båda</option>
        </select>
      </label>
      <ScorePicker
        value={value.score}
        onChange={(score) => onChange({ ...value, score })}
        label="Besvärens intensitet (0–10)"
        low="Inga besvär"
        high="Värsta tänkbara"
      />
    </div>
  );
}

export function ExerciseSymptoms({
  onSave,
  onCancel,
}: {
  onSave(value: SymptomReport): Promise<void>;
  onCancel(): void;
}) {
  const [symptom, setSymptom] = useState<SymptomReport>({
    area: '',
    side: 'unspecified',
    score: 1,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section
      aria-label="Rapportera besvär"
      className="flex flex-col gap-3 border-y-2 border-edge py-4"
    >
      <h2 className="m-0 text-2xl font-bold">Besvär under övningen</h2>
      <p className="m-0 text-base">
        Ansträngning och besvär sparas var för sig. Anpassa själv eller avstå
        från övningen och följ råden från din vårdgivare.
      </p>
      <SymptomFields value={symptom} onChange={setSymptom} />
      {error ? (
        <p role="alert" className="m-0 text-base">
          {error}
        </p>
      ) : null}
      <Button
        disabled={
          busy ||
          !symptom.area ||
          !Number.isInteger(symptom.score) ||
          symptom.score < 0 ||
          symptom.score > 10
        }
        onClick={async () => {
          setBusy(true);
          try {
            await onSave(symptom);
          } catch {
            setError('Kunde inte spara. Försök igen.');
            setBusy(false);
          }
        }}
      >
        Spara besvär
      </Button>
      <Button variant="secondary" onClick={onCancel}>
        Avbryt rapport
      </Button>
    </section>
  );
}

export function Checkin({ id, timing }: { id: string; timing: string }) {
  const data = useLiveQuery(
    async () => ({
      session: await getDb().sessions.get(id),
      preferences: await getMeta(getDb(), 'training'),
    }),
    [id],
  );
  const [, navigate] = useLocation();
  const [feeling, setFeeling] = useState<TrainingCheckin['feeling'] | ''>('');
  const [pain, setPain] = useState<'yes' | 'no' | ''>('');
  const [symptom, setSymptom] = useState<SymptomReport>({
    area: '',
    side: 'unspecified',
    score: 1,
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!data) return null;
  if (
    !data.session?.programId ||
    !['before', 'after', 'dayAfter'].includes(timing)
  )
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <h1 className="text-4xl font-bold">Frågan är inte tillgänglig</h1>
        <Link href="/" className={buttonClass('primary')}>
          Till träningen
        </Link>
      </div>
    );
  const session = data.session;
  const experience =
    session.experience ??
    (session.status === 'in_progress' &&
    isTrainingPreferences(data.preferences) &&
    data.preferences.programId === session.programId
      ? data.preferences.experience
      : undefined);
  const period = timing as 'before' | 'after' | 'dayAfter';
  if (session.checkins?.[period])
    return <Redirect to={timing === 'before' ? `/session/${id}` : '/'} />;
  const options: [TrainingCheckin['feeling'], string][] =
    timing === 'before'
      ? [
          ['ready', 'Redo att träna'],
          ['tired', 'Trött eller behöver ta det lugnt'],
        ]
      : [
          ['good', 'Bra'],
          ['mixed', 'Blandat'],
          ['difficult', 'Jobbigt'],
        ];
  const symptomsValid =
    pain === 'no' ||
    (pain === 'yes' &&
      symptom.area &&
      Number.isInteger(symptom.score) &&
      symptom.score >= 0 &&
      symptom.score <= 10);
  const needsAcknowledgement =
    timing === 'before' && (pain === 'yes' || feeling === 'tired');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-6 pb-8">
      <header>
        <h1 className="m-0 text-5xl leading-tight font-extrabold">
          {timing === 'before'
            ? 'Hur känns kroppen?'
            : timing === 'after'
              ? 'Hur kändes passet?'
              : 'Hur känns det dagen efter?'}
        </h1>
        <p className="m-0 mt-2 text-lg font-bold">
          {session.customWorkoutName ? `${session.customWorkoutName} · ` : ''}
          {trainingName(session)} · Pass {session.templateId}
        </p>
        {experience && session.programId !== 'rehab' ? (
          <p className="m-0 mt-1 text-base text-ink-soft">
            Träningsvana: {experienceLabels[experience]}
          </p>
        ) : null}
      </header>
      {period === 'before' ? (
        <div className="flex flex-col gap-1">
          <Link
            href={`/traning/${session.templateId}${session.customWorkoutId ? `?workout=${session.customWorkoutId}` : ''}`}
            className="flex min-h-12 items-center self-start text-base font-bold underline"
          >
            Ändra passet
          </Link>
          <p className="m-0 text-base text-ink-soft">
            Passet startar när du sparar svaren.
          </p>
        </div>
      ) : null}
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-lg font-bold">
          {timing === 'before' ? 'Dagsform' : 'Helhetskänsla'}
        </legend>
        {options.map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-12 items-center gap-3 rounded-sm border-2 border-edge px-3 py-2 text-lg"
          >
            <input
              type="radio"
              name="feeling"
              checked={feeling === value}
              onChange={() => setFeeling(value)}
              className="size-6"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-lg font-bold">
          Har du smärta eller andra besvär?
        </legend>
        {(
          [
            ['no', 'Nej, inga besvär'],
            ['yes', 'Ja, jag vill ange besvär'],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-12 items-center gap-3 rounded-sm border-2 border-edge px-3 py-2 text-lg"
          >
            <input
              type="radio"
              name="symptoms"
              checked={pain === value}
              onChange={() => {
                setPain(value);
                setAcknowledged(false);
              }}
              className="size-6"
            />
            {label}
          </label>
        ))}
      </fieldset>
      {pain === 'yes' ? (
        <SymptomFields value={symptom} onChange={setSymptom} />
      ) : null}
      {needsAcknowledgement ? (
        <>
          <p className="m-0 text-base font-bold">
            {pain === 'yes'
              ? 'Besvär är inte samma sak som ansträngning. Anpassa eller avstå och följ råden från din vårdgivare. Appen bedömer inte om träningen är lämplig.'
              : 'Anpassa passet till din dagsform. Din trötthet ändrar inte vikten automatiskt.'}
          </p>
          <label className="flex min-h-12 items-start gap-3 py-3 text-base">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="size-6 shrink-0"
            />
            Jag har tagit ställning och vill fortsätta.
          </label>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-base font-bold">
          {error}
        </p>
      ) : null}
      <Button
        disabled={
          busy ||
          !feeling ||
          !symptomsValid ||
          (needsAcknowledgement && !acknowledged)
        }
        onClick={async () => {
          if (!feeling) return;
          setBusy(true);
          try {
            await recordTrainingCheckin(getDb(), id, period, {
              recordedAt: new Date().toISOString(),
              feeling,
              symptoms: pain === 'yes' ? symptom : null,
            });
            navigate(
              timing === 'before' || timing === 'after'
                ? `/session/${id}`
                : '/',
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Kunde inte spara.');
            setBusy(false);
          }
        }}
      >
        Spara och fortsätt
      </Button>
      <Link href="/" className={buttonClass('secondary')}>
        {timing === 'before'
          ? 'Tillbaka utan att starta övningarna'
          : 'Svara senare'}
      </Link>
      <p className="m-0 text-base text-ink-soft">
        Svar sparas lokalt med passet. Ansträngningen bedömer du separat efter
        varje övning.
      </p>
    </div>
  );
}
