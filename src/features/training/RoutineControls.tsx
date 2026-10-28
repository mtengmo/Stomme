import { useState } from 'react';
import { getDb } from '../../db/db';
import {
  resetTrainingRoutine,
  saveTrainingRoutine,
} from '../../db/trainingRoutines';
import type {
  PlannedExercise,
  StandardProgramId,
  TemplateId,
} from '../../domain/types';
import { Button } from '../../ui/Button';

/** Saving a normal routine is always separate from today's draft and short version. */
export function RoutineControls({
  plan,
  programId,
  templateId,
  hasSaved,
  disabled,
  onReset,
}: {
  plan: PlannedExercise[];
  programId: StandardProgramId;
  templateId: TemplateId;
  hasSaved: boolean;
  disabled: boolean;
  onReset: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    plan: PlannedExercise[];
    kind: 'saved' | 'error';
    text: string;
  } | null>(null);
  const message =
    result?.plan === plan && result.kind === 'saved' ? result.text : '';
  const error =
    result?.plan === plan && result.kind === 'error' ? result.text : '';
  return (
    <section
      aria-label={`Mitt pass ${templateId}`}
      className="flex flex-col gap-2 border-t-2 border-edge pt-3"
    >
      <p className="m-0 text-base text-ink-soft">
        {hasSaved
          ? `Du utgår från ditt sparade pass ${templateId}. Nya ändringar gäller bara idag tills du sparar igen.`
          : 'Ändringar gäller bara idag. Du kan spara upplägget till nästa gång.'}
      </p>
      <details>
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
          Behålla ändringar till nästa gång?
        </summary>
        <div className="flex flex-col gap-3 pb-2">
          <p className="m-0 text-base">
            Spara övningar, ordning, set, vila, utrustning och sidor. Antal och
            vikt kan fortfarande föreslås utifrån dina resultat.
          </p>
          <Button
            variant="secondary"
            disabled={disabled || busy}
            onClick={async () => {
              setBusy(true);
              setResult(null);
              try {
                await saveTrainingRoutine(getDb(), programId, templateId, plan);
                setResult({
                  plan,
                  kind: 'saved',
                  text: `Ditt pass ${templateId} är sparat till nästa gång.`,
                });
              } catch {
                setResult({
                  plan,
                  kind: 'error',
                  text: 'Kunde inte spara upplägget. Kontrollera passet och försök igen.',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Behåll som mitt pass {templateId}
          </Button>
          {hasSaved ? (
            <details>
              <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                Återställ appens förslag
              </summary>
              <p className="m-0 mb-3 text-base">
                Tar bort det sparade upplägget för pass {templateId} i den här
                inriktningen och visar appens förslag igen.
              </p>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setResult(null);
                  try {
                    await resetTrainingRoutine(getDb(), programId, templateId);
                    onReset();
                  } catch {
                    setResult({
                      plan,
                      kind: 'error',
                      text: 'Kunde inte återställa upplägget. Försök igen.',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Använd appens förslag igen
              </Button>
            </details>
          ) : null}
        </div>
      </details>
      {message ? (
        <p role="status" className="m-0 text-base font-bold">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-base font-bold">
          {error}
        </p>
      ) : null}
    </section>
  );
}
