import { type ReactNode, useEffect, useRef, useState } from 'react';
import { beginnerExerciseIds } from '../../content/beginnerSet';
import { getDb } from '../../db/db';
import { saveTrainingProgram } from '../../db/program';
import type { TrainingPreferences, TrainingProgram } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { buildProgram } from '../../rules/programPlan';
import { Button } from '../../ui/Button';

/** A full-screen confirmation: the safe choice first, the action as the heavier button. */
export function Confirm({
  title,
  children,
  keepLabel,
  confirmLabel,
  busy,
  error,
  onKeep,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  keepLabel: string;
  confirmLabel: string;
  busy: boolean;
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
      <h1 ref={heading} tabIndex={-1} className="m-0 text-5xl font-extrabold">
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
        <Button disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

type Mode = 'redo' | 'end';

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
  const keep = () => {
    setError('');
    onKeep();
  };

  const rebuild = async () => {
    setBusy(true);
    setError('');
    try {
      const next = buildProgram({
        preferences,
        daysPerWeek: program.daysPerWeek,
        emphasis: program.emphasis,
        startDate: toLocalDate(new Date()),
        now: new Date().toISOString(),
        id: crypto.randomUUID(),
        block: program.block,
        ...(program.curated ? { pool: beginnerExerciseIds } : {}),
      });
      if (!next) {
        setError('Det gick inte att bygga ett program med din utrustning.');
        return;
      }
      await saveTrainingProgram(getDb(), next);
      onRebuilt();
    } catch {
      setError('Kunde inte spara. Försök igen.');
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
        error={error}
        onKeep={keep}
        onConfirm={() => void rebuild()}
      >
        <p className="m-0 text-xl">
          Du får ett nytt block med samma antal pass och tyngdpunkt, byggt på
          din utrustning nu. Blockets räknare börjar om. Sparade pass i
          historiken finns kvar.
        </p>
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
