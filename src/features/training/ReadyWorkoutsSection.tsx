import { useState } from 'react';
import { useLocation } from 'wouter';
import { readyWorkouts } from '../../content/readyWorkouts';
import { addReadyWorkout } from '../../db/customWorkouts';
import type { TrainingPreferences } from '../../domain/types';
import { RunningProposals } from './RunningProposals';

/**
 * "Färdiga pass": ready-made workouts with proposals (Löpstyrka). Adding one is
 * idempotent (addReadyWorkout) and opens its preview. Shown in the Övningar hub
 * and in "Skapa eget pass". Not offered for rehab.
 */
export function ReadyWorkoutsSection({
  preferences,
  headingId = 'ready-workouts',
}: {
  preferences: TrainingPreferences;
  headingId?: string;
}) {
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (preferences.programId === 'rehab') return null;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 border-y-2 border-edge py-3"
    >
      <h2 id={headingId} className="m-0 text-2xl font-bold">
        Färdiga pass
      </h2>
      {readyWorkouts.map((workout) => (
        <RunningProposals
          key={workout.id}
          workout={workout}
          preferences={preferences}
          busy={busy}
          onAdd={async (name, ids) => {
            setBusy(true);
            setError('');
            try {
              const id = await addReadyWorkout(name, ids, workout.group);
              navigate(`/traning/A?workout=${id}`);
            } catch {
              setError('Kunde inte lägga till passet. Försök igen.');
              setBusy(false);
            }
          }}
        />
      ))}
      {error ? (
        <p role="alert" className="m-0 text-base font-bold">
          {error}
        </p>
      ) : null}
    </section>
  );
}
