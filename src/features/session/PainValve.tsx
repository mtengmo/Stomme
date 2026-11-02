import { Button } from '../../ui/Button';

interface PainValveProps {
  exerciseName: string;
  /** The exercise's existing easier-variant text. */
  easierText: string;
  /** Name of a linked easier exercise, where one exists. Shown as text only. */
  easierExerciseName?: string;
  busy: boolean;
  onSkip(): void;
  onAbort(): void;
  onContinue(): void;
}

/**
 * Regular training: the one pain action. It only offers a way out and records
 * that this exercise hurt in this session. It never judges or diagnoses.
 */
export function PainValve({
  exerciseName,
  easierText,
  easierExerciseName,
  busy,
  onSkip,
  onAbort,
  onContinue,
}: PainValveProps) {
  return (
    <section
      aria-label="Det gör ont"
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-8 pb-6"
    >
      <h1 className="m-0 text-4xl leading-tight font-extrabold">Det gör ont</h1>
      <p className="m-0 text-lg font-bold">{exerciseName}</p>
      <p className="m-0 text-base">
        Vid skarp smärta, svullnad eller om en led låser sig: avbryt och
        kontakta vården (1177).
      </p>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-xl font-bold">Enklare variant</h2>
        <p className="m-0 text-base">{easierText}</p>
        {easierExerciseName ? (
          <p className="m-0 text-base">
            Du kan också byta till {easierExerciseName} nästa gång.
          </p>
        ) : null}
      </div>
      <p className="m-0 text-base text-ink-soft">
        Övningen får ingen automatisk ökning nästa gång. Appen bedömer inte om
        träningen är lämplig.
      </p>
      <div className="mt-auto flex flex-col gap-3">
        <Button variant="secondary" disabled={busy} onClick={onSkip}>
          Hoppa över övningen
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onAbort}>
          Avbryt passet
        </Button>
        <Button disabled={busy} onClick={onContinue}>
          Fortsätt ändå
        </Button>
      </div>
    </section>
  );
}
