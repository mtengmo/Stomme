import { useState } from 'react';
import { exercises } from '../../content/exercises';
import type { ReadyWorkout } from '../../content/readyWorkouts';
import {
  proposals,
  type RunningProposal,
  shuffle,
} from '../../content/runningProposals';
import type { ExerciseId, TrainingPreferences } from '../../domain/types';
import { buttonClass } from '../../ui/Button';
import { ExerciseThumb } from '../program/ExerciseThumb';

const startLevel = { new: 'grund', some: 'medel', regular: 'stark' } as const;

/** Three proposals to choose between, a random draw, and one button that adds the shown one. */
export function RunningProposals({
  workout,
  preferences,
  busy,
  onAdd,
}: {
  workout: ReadyWorkout;
  preferences: TrainingPreferences;
  busy: boolean;
  onAdd(name: string, exerciseIds: ExerciseId[]): void;
}) {
  const fixed = proposals(preferences);
  const [chosen, setChosen] = useState<string>(
    startLevel[preferences.experience],
  );
  const [random, setRandom] = useState<RunningProposal | null>(null);
  const shown = random ?? fixed.find((p) => p.id === chosen) ?? fixed[0];
  if (!shown) return null;
  const name = `${workout.name} – ${shown.id === 'slump' ? 'slump' : shown.label}`;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-xl font-bold">{workout.name}</p>
      <p className="m-0 text-base">{workout.summary}</p>
      <div
        role="radiogroup"
        aria-label="Välj förslag"
        className="grid grid-cols-3 gap-2"
      >
        {fixed.map((proposal) => {
          const on = !random && shown.id === proposal.id;
          return (
            <label
              key={proposal.id}
              className={`flex min-h-12 cursor-pointer items-center justify-center border-2 border-edge px-2 text-base font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${on ? 'bg-ink text-paper' : 'bg-surface text-ink'}`}
            >
              <input
                type="radio"
                name="running-proposal"
                value={proposal.id}
                checked={on}
                onChange={() => {
                  setChosen(proposal.id);
                  setRandom(null);
                }}
                className="sr-only"
              />
              {proposal.label}
            </label>
          );
        })}
      </div>
      <p className="m-0 text-base font-bold" aria-live="polite">
        {random ? 'Slumpat förslag' : `Förslag: ${shown.label}`} ·{' '}
        {shown.exerciseIds.length} övningar
      </p>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.exerciseIds.map((id) => (
          <li key={id} className="flex items-center gap-3 text-base">
            <ExerciseThumb exerciseId={id} animate={false} />
            <span>{exercises[id].name}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 text-base text-ink-soft">{workout.caution}</p>
      <button
        type="button"
        disabled={busy}
        className={buttonClass('secondary')}
        onClick={() =>
          setRandom(
            shuffle(
              preferences,
              Math.floor(Math.random() * 2 ** 31),
              shown.exerciseIds,
            ),
          )
        }
      >
        Slumpa nytt förslag
      </button>
      <button
        type="button"
        disabled={busy}
        aria-label={`Lägg till färdigt pass: ${name}`}
        className={buttonClass('secondary')}
        onClick={() => onAdd(name, [...shown.exerciseIds])}
      >
        Lägg till och visa
      </button>
    </div>
  );
}
