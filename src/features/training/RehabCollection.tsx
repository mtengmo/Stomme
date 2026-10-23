import { Link } from 'wouter';

import {
  equipmentLabels,
  exerciseMetadata,
} from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { kneeRehabExercises, kneeRehabSource } from '../../content/kneeRehab';

import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../../domain/types';

import { equipmentFits } from '../../rules/equipment';

import { Button } from '../../ui/Button';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';

export function KneeCollection({
  preferences,
  plan,
  onAdd,
}: {
  preferences: TrainingPreferences;
  plan: PlannedExercise[];
  onAdd(id: ExerciseId): void;
}) {
  return (
    <section
      aria-labelledby="knee-collection"
      className="flex flex-col gap-3 border-t-2 border-edge pt-5"
    >
      <h2 id="knee-collection" className="m-0 text-3xl font-bold">
        Välj från AAOS knäsamling
      </h2>
      <p className="m-0 text-base">
        Välj de övningar du kommit överens om med din fysioterapeut. Ange sedan
        doseringen i passet. Styrka och rörlighet visas var för sig; du behöver
        inte välja alla.
      </p>
      <a
        href={kneeRehabSource}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-12 items-center text-base font-bold underline"
      >
        Läs AAOS rekommendationer (engelska)
      </a>
      <p className="m-0 text-base text-ink-soft">
        Stommes tekniknivå beskriver kontroll och balans: 1 grundläggande, 2
        viss vana, 3 teknikkrävande. Vikt, antal och dagsform påverkar hur
        ansträngande övningen känns för dig.
      </p>
      {(['strength', 'mobility'] as const).map((kind) => (
        <div key={kind}>
          <h3 className="m-0 text-2xl font-bold">
            {kind === 'strength' ? 'Styrka' : 'Rörlighet'}
          </h3>
          <ul className="m-0 list-none p-0">
            {kneeRehabExercises
              .filter((ex) => exerciseMetadata[ex.id].kind === kind)
              .map((ex) => {
                const meta = exerciseMetadata[ex.id];

                const variant = meta.variants.find((v) =>
                  equipmentFits(v.equipment, preferences.equipment),
                );

                const added = plan.some((p) => p.exerciseId === ex.id);

                return (
                  <li
                    key={ex.id}
                    className="flex flex-col gap-1 border-b-2 border-edge py-3"
                  >
                    <Link
                      href={`/ovning/${ex.id}`}
                      className="flex min-h-12 items-center text-lg font-bold underline"
                    >
                      {exerciseReferences[ex.id]} · {ex.name}
                    </Link>
                    <p className="m-0 text-base">{ex.muscles.join(', ')}</p>
                    <ExerciseDifficulty
                      exerciseId={ex.id}
                      variantId={variant?.id}
                      loadIndex={variant?.defaultLoadIndex}
                      explain
                    />
                    <p className="m-0 text-base text-ink-soft">
                      {variant
                        ? variant.equipment
                            .map((e) => equipmentLabels[e.type])
                            .join(', ')
                        : 'Utrustning saknas – ändra din utrustning under Byt träningsinriktning.'}
                    </p>
                    <Button
                      variant="secondary"
                      disabled={added || !variant || plan.length >= 12}
                      onClick={() => onAdd(ex.id)}
                    >
                      {added
                        ? `${exerciseReferences[ex.id]} tillagd`
                        : `Lägg till ${exerciseReferences[ex.id]}`}
                    </Button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}
