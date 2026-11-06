import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { exercises } from '../../content/exercises';
import { focusLabel } from '../../content/focusPresets';
import { experienceLabels } from '../../content/programmes';
import { isCuratedLevel, programPool } from '../../content/widePool';
import { getDb } from '../../db/db';
import { redoTrainingProgram } from '../../db/training';
import type { TrainingPreferences, TrainingProgram } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { randomSeed } from '../../lib/seed';
import { buildProgram } from '../../rules/programPlan';
import { Button } from '../../ui/Button';
import { ChoiceCard } from '../../ui/ChoiceCard';
import { levelHints } from '../training/quickStartModel';
import { ExerciseThumb } from './ExerciseThumb';

/** A full-screen confirmation: the safe choice first, the action as the heavier button. */
export function Confirm({
  title,
  children,
  keepLabel,
  confirmLabel,
  busy,
  confirmDisabled = false,
  error,
  onKeep,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  keepLabel: string;
  confirmLabel: string;
  busy: boolean;
  /** Only the action is disabled; keeping the programme always works. */
  confirmDisabled?: boolean;
  error: string;
  onKeep(): void;
  onConfirm(): void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const keep = useRef(onKeep);
  keep.current = onKeep;
  useEffect(() => {
    heading.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') keep.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <h1
        ref={heading}
        tabIndex={-1}
        className="m-0 text-5xl font-extrabold [overflow-wrap:anywhere]"
      >
        {title}
      </h1>
      {children}
      <div className="flex flex-col gap-3">
        <Button variant="secondary" disabled={busy} onClick={onKeep}>
          {keepLabel}
        </Button>
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {error}
          </p>
        ) : null}
        <Button disabled={busy || confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

type Mode = 'redo' | 'end';

type Level = TrainingPreferences['experience'];
const levels: Level[] = ['new', 'some', 'regular'];

/** Same days and emphasis as the programme, rebuilt for a level, a seed and the equipment in the preferences. */
export function rebuildProgram(
  program: TrainingProgram,
  preferences: TrainingPreferences,
  level: Level,
  seed: number | undefined,
  id: string,
): TrainingProgram | null {
  return buildProgram({
    preferences: { ...preferences, experience: level },
    daysPerWeek: program.daysPerWeek,
    emphasis: program.emphasis,
    startDate: toLocalDate(new Date()),
    now: new Date().toISOString(),
    id,
    block: program.block,
    pool: programPool(level, program.emphasis),
    curated: isCuratedLevel(level),
    ...(seed !== undefined ? { seed } : {}),
  });
}

const passSignature = (program: TrainingProgram | null) =>
  JSON.stringify(program?.passes.map((pass) => pass.exerciseIds));

/** The new passes with a still figure per exercise, so the choice is seen before it is saved. */
function PassPreview({ program }: { program: TrainingProgram }) {
  return (
    <div className="flex flex-col gap-4">
      {program.passes.map((pass, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: passes are a fixed-order list; focus can repeat
        <section key={index} aria-labelledby={`redo-pass-${index}`}>
          <h3 id={`redo-pass-${index}`} className="m-0 mb-1 text-xl font-bold">
            Pass {index + 1} · {focusLabel(pass.focus)}
          </h3>
          <ul className="m-0 list-none p-0">
            {pass.exerciseIds.map((id) => (
              <li
                key={id}
                className="flex min-h-14 items-center gap-3 border-t-2 border-edge py-2 text-base font-bold"
              >
                <ExerciseThumb exerciseId={id} animate={false} />
                <span className="min-w-0 break-words">
                  {exercises[id].name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Rebuild or end the programme. Shared by Home (equipment changed) and "Mitt program". */
export function ProgramRedoEnd({
  mode,
  preferences,
  program,
  onKeep,
  onRebuilt,
}: {
  mode: Mode;
  preferences: TrainingPreferences;
  program: TrainingProgram;
  onKeep(): void;
  onRebuilt(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The current general training level, the same default as "Gör om" in the
  // quick start; saving writes the chosen level back as the training level.
  const [level, setLevel] = useState<Level>(preferences.experience);
  const [shuffle, setShuffle] = useState(true);
  const [freshSeed, setFreshSeed] = useState(randomSeed);
  // Polite status for a changed preview; 'same' is also shown as text.
  const [announce, setAnnounce] = useState<{
    kind: 'updated' | 'same';
    n: number;
  }>();
  const id = useRef(crypto.randomUUID());
  const keep = () => {
    setError('');
    onKeep();
  };

  // Shuffle on: a fresh seed. Off: the seed of the current programme.
  const seed = shuffle ? freshSeed : program.seed;
  const next = useMemo(
    () => rebuildProgram(program, preferences, level, seed, id.current),
    [program, preferences, level, seed],
  );

  const note = (kind: 'updated' | 'same') =>
    setAnnounce((current) => ({ kind, n: (current?.n ?? 0) + 1 }));
  const reshuffle = () => {
    const nextSeed = randomSeed();
    const candidate = rebuildProgram(
      program,
      preferences,
      level,
      nextSeed,
      id.current,
    );
    setFreshSeed(nextSeed);
    note(passSignature(candidate) === passSignature(next) ? 'same' : 'updated');
  };

  const rebuild = async () => {
    if (!next) return;
    setBusy(true);
    setError('');
    try {
      await redoTrainingProgram(getDb(), preferences, level, next);
      onRebuilt();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Kunde inte spara. Försök igen.',
      );
    } finally {
      setBusy(false);
    }
  };

  const endProgram = async () => {
    setBusy(true);
    setError('');
    try {
      await getDb().meta.delete('trainingProgram');
    } catch {
      setError('Kunde inte avsluta programmet. Försök igen.');
      setBusy(false);
    }
  };

  if (mode === 'redo')
    return (
      <Confirm
        title="Göra om programmet?"
        keepLabel="Behåll programmet"
        confirmLabel="Gör om programmet nu"
        busy={busy}
        confirmDisabled={!next}
        error={error}
        onKeep={keep}
        onConfirm={() => void rebuild()}
      >
        <p className="m-0 text-xl">
          Du får nya pass med samma antal dagar och tyngdpunkt, byggda på din
          utrustning nu. Blocket börjar om från vecka 1. Sparade pass i
          historiken finns kvar.
        </p>
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 text-base font-bold">Nivå</legend>
          {levels.map((value) => (
            <ChoiceCard
              key={value}
              type="radio"
              name="redo-level"
              value={value}
              label={experienceLabels[value]}
              hint={levelHints[value]}
              checked={level === value}
              onChange={() => {
                setLevel(value);
                note('updated');
              }}
            />
          ))}
          <p className="m-0 text-base text-ink-soft">
            Nivån styr också din allmänna träningsvana: antal set och
            startvikter i hela appen.
          </p>
        </fieldset>
        <ChoiceCard
          type="checkbox"
          label="Blanda om övningarna"
          hint="Nya övningar för samma ändamål. Av: inga slumpade byten. Passen anpassas till nivå och utrustning."
          checked={shuffle}
          onChange={(value) => {
            setShuffle(value);
            note('updated');
          }}
        />
        {shuffle ? (
          <Button variant="secondary" disabled={busy} onClick={reshuffle}>
            Blanda igen
          </Button>
        ) : null}
        <div role="status" className="empty:hidden">
          {announce?.kind === 'same' ? (
            <p key={announce.n} className="m-0 text-base font-bold">
              Inga fler likvärdiga övningar för din nivå och utrustning.
            </p>
          ) : announce ? (
            <span key={announce.n} className="sr-only">
              Passen är uppdaterade
            </span>
          ) : null}
        </div>
        <section aria-labelledby="redo-preview" className="flex flex-col gap-3">
          <h2 id="redo-preview" className="m-0 text-3xl font-bold">
            Så här blir passen
          </h2>
          {next ? (
            <PassPreview program={next} />
          ) : (
            <p role="alert" className="m-0 text-base font-bold">
              Det gick inte att bygga ett program med din utrustning.
            </p>
          )}
        </section>
      </Confirm>
    );
  return (
    <Confirm
      title="Avsluta programmet?"
      keepLabel="Behåll programmet"
      confirmLabel="Avsluta programmet nu"
      busy={busy}
      error={error}
      onKeep={keep}
      onConfirm={() => void endProgram()}
    >
      <p className="m-0 text-xl">
        Programmet tas bort från hemskärmen. Sparade pass i historiken finns
        kvar, och du kan skapa ett nytt program senare.
      </p>
    </Confirm>
  );
}
