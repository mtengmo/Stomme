import { exerciseAliases } from '../content/exerciseAliases';
import {
  type ExerciseVariant,
  exerciseMetadata,
} from '../content/exerciseMetadata';
import { exerciseReferences } from '../content/exerciseReferences';
import type {
  Exercise,
  ExerciseId,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits, type Inventory } from './equipment';
import { allowedLevels } from './levelPolicy';

export type SortMode = 'fit' | 'liked' | 'name' | 'recent';

export const defaultSortMode: SortMode = 'fit';
export const sortParamName = 'sort';

export const sortLabels: Record<SortMode, string> = {
  fit: 'Passar mig',
  liked: 'Gillade först',
  name: 'Namn A–Ö',
  recent: 'Senast tränade',
};

/** Parses the `sort` parameter; missing or unknown values give the default. */
export function parseSortMode(value: string | null | undefined): SortMode {
  return value && Object.hasOwn(sortLabels, value)
    ? (value as SortMode)
    : defaultSortMode;
}

export interface SortContext {
  mode: SortMode;
  term?: string;
  inventory: Inventory;
  /** Without it there is no profile: "Passar mig" is search relevance, then A–Ö. */
  experience?: TrainingPreferences['experience'];
  favourites?: readonly ExerciseId[];
  /** Exercises in the user's own workouts. */
  mine?: ReadonlySet<string>;
  /** ISO time of the latest real set log per exercise. */
  lastLogged?: ReadonlyMap<ExerciseId, string>;
}

/** E-numbers are compared by number, so E2 sorts before E10. */
const referenceNumber = (id: ExerciseId) =>
  Number(exerciseReferences[id].replace(/\D/g, ''));

/** Swedish alphabetical order with the E-number as stable tie-break. */
const byName = (a: Exercise, b: Exercise) =>
  a.name.localeCompare(b.name, 'sv') ||
  referenceNumber(a.id) - referenceNumber(b.id);

const lower = (text: string) => text.trim().toLocaleLowerCase('sv');

/** 0 exact E-number, 1 exact name, 2 name or alias hit, 3 other partial hit. */
function searchRank(exercise: Exercise, term: string): number {
  if (lower(exerciseReferences[exercise.id]) === term) return 0;
  if (lower(exercise.name) === term) return 1;
  const names = lower(
    `${exercise.name} ${exerciseAliases[exercise.id].join(' ')}`,
  );
  return names.includes(term) ? 2 : 3;
}

/** True when ONE variant fits both the equipment and the experience level. */
export function anyVariantFits(
  variants: readonly Pick<ExerciseVariant, 'technicalLevel' | 'equipment'>[],
  inventory: Inventory,
  experience: TrainingPreferences['experience'],
): boolean {
  const levels = allowedLevels(experience);
  return variants.some(
    (variant) =>
      levels.includes(variant.technicalLevel) &&
      equipmentFits(variant.equipment, inventory),
  );
}

export const hasFittingVariant = (
  id: ExerciseId,
  inventory: Inventory,
  experience: TrainingPreferences['experience'],
) => anyVariantFits(exerciseMetadata[id].variants, inventory, experience);

/** Plain reason shown on a row under "Passar mig"; undefined when none applies. */
export function sortReason(
  id: ExerciseId,
  context: SortContext,
): string | undefined {
  if (context.mode !== 'fit' || !context.experience) return undefined;
  if (context.favourites?.includes(id)) return 'Favorit';
  return hasFittingVariant(id, context.inventory, context.experience)
    ? 'Passar din utrustning'
    : undefined;
}

/**
 * Orders already filtered exercises; never adds or removes any. Call it once
 * per group so "Tränar främst" and "Hjälper till" stay separate.
 */
export function sortExercises(
  list: readonly Exercise[],
  context: SortContext,
): Exercise[] {
  const items = [...list];
  const favourites = new Set(context.favourites);
  if (context.mode === 'name') return items.sort(byName);
  if (context.mode === 'liked')
    return items.sort(
      (a, b) =>
        Number(!favourites.has(a.id)) - Number(!favourites.has(b.id)) ||
        byName(a, b),
    );
  if (context.mode === 'recent') {
    const logged = context.lastLogged;
    return items.sort((a, b) => {
      const ta = logged?.get(a.id);
      const tb = logged?.get(b.id);
      if (ta && tb && ta !== tb) return tb.localeCompare(ta);
      return Number(!ta) - Number(!tb) || byName(a, b);
    });
  }
  const term = lower(context.term ?? '');
  const rank = new Map(
    items.map((exercise) => [
      exercise.id,
      term ? searchRank(exercise, term) : 0,
    ]),
  );
  const experience = context.experience;
  const fit = new Map(
    items.map((exercise) => [
      exercise.id,
      experience
        ? Number(!hasFittingVariant(exercise.id, context.inventory, experience))
        : 0,
    ]),
  );
  const personal = (id: ExerciseId) =>
    experience ? Number(!(favourites.has(id) || context.mine?.has(id))) : 0;
  return items.sort(
    (a, b) =>
      (rank.get(a.id) as number) - (rank.get(b.id) as number) ||
      (fit.get(a.id) as number) - (fit.get(b.id) as number) ||
      personal(a.id) - personal(b.id) ||
      byName(a, b),
  );
}

/** Latest loggedAt per exercise from raw set logs. */
export function latestLogByExercise(
  logs: readonly { exerciseId: ExerciseId; loggedAt: string }[],
): Map<ExerciseId, string> {
  const latest = new Map<ExerciseId, string>();
  for (const log of logs) {
    const current = latest.get(log.exerciseId);
    if (!current || log.loggedAt > current)
      latest.set(log.exerciseId, log.loggedAt);
  }
  return latest;
}
