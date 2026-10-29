import { Link } from 'wouter';

import {
  equipmentLabels,
  exerciseMetadata,
} from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { kneeRehabExercises, kneeRehabSource } from '../../content/kneeRehab';
import {
  physioKneeItems,
  physioProgressionNotes,
} from '../../content/physioKneeProgramme';
import { rehabGroup } from '../../content/programmes';

import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../../domain/types';

import { equipmentFits } from '../../rules/equipment';

import { Button } from '../../ui/Button';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';

function equipmentText(
  variant: { equipment: { type: string }[] } | undefined,
): string {
  return variant
    ? variant.equipment
        .map((e) => equipmentLabels[e.type as keyof typeof equipmentLabels])
        .join(', ')
    : 'Utrustning saknas – ändra din utrustning under Byt träningsinriktning.';
}

/** The rehab exercise collection of the user's group: AAOS selection or the physiotherapist's paper order. */
export function RehabCollection({
  preferences,
  plan,
  onAdd,
}: {
  preferences: TrainingPreferences;
  plan: PlannedExercise[];
  onAdd(id: ExerciseId): void;
}) {
  const physio = rehabGroup(preferences) === 'physio';
  return (
    <section
      aria-labelledby="knee-collection"
      className="flex flex-col gap-3 border-t-2 border-edge pt-5"
    >
      <h2 id="knee-collection" className="m-0 text-3xl font-bold">
        {physio
          ? 'Välj från fysioterapeutens program'
          : 'Välj från AAOS knäsamling'}
      </h2>
      <p className="m-0 text-base">
        {physio
          ? 'Övningarna står i samma ordning som på ditt papper. Lägg till de som ingår i ditt program; du behöver inte välja alla.'
          : 'Välj de övningar du kommit överens om med din fysioterapeut. Ange sedan doseringen i passet. Styrka och rörlighet visas var för sig; du behöver inte välja alla.'}
      </p>
      {physio ? null : (
        <a
          href={kneeRehabSource}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center text-base font-bold underline"
        >
          Läs AAOS rekommendationer (engelska)
        </a>
      )}
      {physio ? null : (
        <p className="m-0 text-base text-ink-soft">
          Stommes tekniknivå beskriver kontroll och balans: 1 grundläggande, 2
          viss vana, 3 teknikkrävande. Vikt, antal och dagsform påverkar hur
          ansträngande övningen känns för dig.
        </p>
      )}
      {physio ? (
        <ul className="m-0 list-none p-0">
          {physioKneeItems.map((item) => {
            const ex = exercises[item.exerciseId];
            const variant = exerciseMetadata[item.exerciseId].variants.find(
              (v) =>
                v.id === item.variantId &&
                equipmentFits(v.equipment, preferences),
            );
            const added = plan.some((p) => p.exerciseId === ex.id);
            if (added)
              return (
                <li
                  key={item.sheetNo}
                  className="flex min-h-12 flex-wrap items-center gap-x-2 border-b-2 border-edge py-2 text-base"
                >
                  <span className="font-bold">
                    Papperets övning {item.sheetNo}: {item.sheetLabel}
                  </span>
                  <span>{exerciseReferences[ex.id]} · Ingår i passet</span>
                </li>
              );
            return (
              <li
                key={item.sheetNo}
                className="flex flex-col gap-1 border-b-2 border-edge py-3"
              >
                <Link
                  href={`/ovning/${ex.id}`}
                  className="flex min-h-12 items-center text-lg font-bold underline"
                >
                  Papperets övning {item.sheetNo}: {item.sheetLabel}
                </Link>
                <p className="m-0 text-base">
                  {exerciseReferences[ex.id]} · {ex.name}
                </p>
                <p className="m-0 text-base">
                  Startvärde: {item.sets} × {item.target}
                  {ex.unit === 'laps' ? ' varv' : ''}
                  {ex.perSide ? ' per sida' : ''}
                </p>
                {physioProgressionNotes(ex.id).map((note) => (
                  <p key={note} className="m-0 text-base">
                    {note}
                  </p>
                ))}
                <p className="m-0 text-base">{equipmentText(variant)}</p>
                {variant ? (
                  <Button
                    variant="secondary"
                    disabled={plan.length >= 12}
                    onClick={() => onAdd(ex.id)}
                  >
                    Lägg till {exerciseReferences[ex.id]}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        (['strength', 'mobility'] as const).map((kind) => (
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
                    equipmentFits(v.equipment, preferences),
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
                        {equipmentText(variant)}
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
        ))
      )}
    </section>
  );
}
