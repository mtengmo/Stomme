import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exercises } from '../../content/exercises';
import { kneeRehabExercises } from '../../content/kneeRehab';
import { rehabGroup } from '../../content/programmes';
import { validateTrainingPlan } from '../../db/training';
import type { PlannedExercise, TrainingPreferences } from '../../domain/types';
import { missingRequirements } from '../../rules/equipment';

/** Why the plan cannot be started yet, in the order the user should fix it. Empty means ready. */
export function startProblems(
  plan: PlannedExercise[],
  preferences: TrainingPreferences,
): string[] {
  const problems: string[] = [];
  if (plan.length === 0)
    problems.push(
      preferences.programId === 'general' && preferences.bodyParts?.length
        ? 'Inga övningar passar vald kroppsdel och utrustning. Ändra fokus eller utrustning på träningssidan.'
        : 'Lägg till minst en övning.',
    );
  if (plan.length > 12) problems.push('Högst 12 övningar.');
  const seen = new Set<string>();
  for (const item of plan) {
    const exercise = exercises[item.exerciseId];
    const name = exercise?.name ?? item.exerciseId;
    if (seen.has(item.exerciseId))
      problems.push(`${name} finns flera gånger i passet.`);
    seen.add(item.exerciseId);
    const variant = exerciseMetadata[item.exerciseId]?.variants.find(
      (value) => value.id === item.variantId,
    );
    const lacking = variant
      ? missingRequirements(variant.equipment, preferences)
      : [];
    if (!variant || lacking.length)
      problems.push(
        `${name}: välj en variant som passar din utrustning${lacking.length ? ` (saknas: ${lacking.join(', ')})` : ''}.`,
      );
    if (!Number.isInteger(item.sets) || item.sets < 1 || item.sets > 10)
      problems.push(`Ange set för ${name}.`);
    if (!Number.isFinite(item.target) || item.target < 1 || item.target > 600)
      problems.push(`Ange antal för ${name}.`);
    const external = variant?.equipment.some(
      (value) => value.type === 'dumbbell' || value.type === 'kettlebell',
    );
    if (
      variant &&
      (external ? !(item.weightKg > 0) : item.weightKg !== 0) &&
      !problems.includes(`Ange vikt för ${name}.`)
    )
      problems.push(`Ange vikt för ${name}.`);
    if (
      preferences.programId === 'rehab' &&
      rehabGroup(preferences) === 'aaos' &&
      !kneeRehabExercises.some((knee) => knee.id === item.exerciseId)
    )
      problems.push(`${name} ingår inte i AAOS-samlingen.`);
  }
  if (!problems.length && !validateTrainingPlan(plan))
    problems.push('Kontrollera övningar, antal och vikt.');
  return problems;
}
