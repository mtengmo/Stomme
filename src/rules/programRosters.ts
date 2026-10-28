import {
  type ExerciseVariant,
  exerciseMetadata,
} from '../content/exerciseMetadata';
import { bodyRegions, exerciseMuscles } from '../content/muscles';
import {
  generalSlots,
  impactExercises,
  type RosterSlot,
  rehabAdditionIds,
  runningEasier,
} from '../content/rosterSlots';
import { templates } from '../content/templates';
import type {
  BodyRegionId,
  ExerciseId,
  TemplateId,
  TrainingPreferences,
} from '../domain/types';
import {
  allowedLevels,
  chooseVariant,
  levelRankOf,
  variantsThatFit,
  variantUsable,
} from './levelPolicy';

export interface RosterContext {
  /** Symptoms or pain on record: no impact exercises, lightest weights. */
  painOnRecord?: boolean;
}

export interface Roster {
  ids: ExerciseId[];
  /** Per-exercise explanation added to the start suggestion. */
  notes: Partial<Record<ExerciseId, string>>;
  /** Shown once on the whole roster. */
  note?: string;
}

const TOP_UP_NOTE =
  'Kompletterat med helkroppsövningar eftersom få övningar passar vald kroppsdel och utrustning.';
const EASIEST_NOTE =
  'Ingen övning på din nivå passar utrustningen. Den lättaste som finns är vald; kontrollera före start.';

function fits(id: ExerciseId, preferences: TrainingPreferences): boolean {
  return (
    !rehabAdditionIds.has(id) && variantsThatFit(id, preferences).length > 0
  );
}

function levelOf(id: ExerciseId, preferences: TrainingPreferences) {
  // Called only for candidates that passed fits() and usable().
  return (chooseVariant(id, preferences) as ExerciseVariant).technicalLevel;
}

function usable(id: ExerciseId, preferences: TrainingPreferences): boolean {
  const variant = chooseVariant(id, preferences);
  return !!variant && variantUsable(preferences, variant);
}

function isLoaded(id: ExerciseId, preferences: TrainingPreferences): boolean {
  const variant = chooseVariant(id, preferences);
  return (
    !!variant &&
    variant.equipment.some(
      (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
    ) &&
    variantUsable(preferences, variant)
  );
}

/** New and some take the first fitting candidate; regular takes the most demanding, loaded first. */
function pickFromSlot(
  slot: RosterSlot,
  preferences: TrainingPreferences,
  context: RosterContext,
  used: ReadonlySet<ExerciseId>,
): { id: ExerciseId; note?: string } | undefined {
  const levels = allowedLevels(preferences.experience);
  // A weighted exercise without a registered weight is never suggested; the slot moves on.
  const base = slot.candidates.filter(
    (id) =>
      !used.has(id) &&
      fits(id, preferences) &&
      usable(id, preferences) &&
      !(context.painOnRecord && impactExercises.has(id)),
  );
  const pool = base.filter((id) => levels.includes(levelOf(id, preferences)));
  if (!pool.length) {
    const easiest = [...base].sort(
      (a, b) =>
        levelRankOf(levelOf(a, preferences)) -
        levelRankOf(levelOf(b, preferences)),
    )[0];
    return easiest ? { id: easiest, note: EASIEST_NOTE } : undefined;
  }
  if (preferences.experience !== 'regular')
    return { id: pool[0] as ExerciseId };
  const score = (id: ExerciseId) =>
    levelRankOf(levelOf(id, preferences)) +
    // A registered weighted variant keeps priority over unweighted difficulty.
    (isLoaded(id, preferences) ? 2.5 : 0);
  return {
    id: pool.reduce((best, id) => (score(id) > score(best) ? id : best)),
  };
}

function wholeBody(
  preferences: TrainingPreferences,
  template: TemplateId,
  context: RosterContext,
): Roster {
  const ids: ExerciseId[] = [];
  const notes: Roster['notes'] = {};
  for (const slot of generalSlots[template]) {
    const pick = pickFromSlot(slot, preferences, context, new Set(ids));
    if (!pick) continue;
    ids.push(pick.id);
    if (pick.note) notes[pick.id] = pick.note;
  }
  return { ids, notes };
}

function allPicks(
  preferences: TrainingPreferences,
  context: RosterContext,
): ExerciseId[] {
  const ids: ExerciseId[] = [];
  for (const slot of [...generalSlots.A, ...generalSlots.B]) {
    const pick = pickFromSlot(slot, preferences, context, new Set(ids));
    if (pick) ids.push(pick.id);
  }
  return ids;
}

function matchesRegion(id: ExerciseId, region: BodyRegionId): boolean {
  const muscles = bodyRegions.find((item) => item.id === region)?.muscles ?? [];
  return exerciseMuscles[id].primary.some((muscle) => muscles.includes(muscle));
}

/** Regions with at least one exercise for this equipment and level. */
export function regionsAvailable(
  preferences: TrainingPreferences,
  context: RosterContext = {},
): BodyRegionId[] {
  const picks = allPicks({ ...preferences, bodyParts: undefined }, context);
  return bodyRegions
    .map((region) => region.id)
    .filter((region) => picks.some((id) => matchesRegion(id, region)));
}

function focused(
  preferences: TrainingPreferences,
  template: TemplateId,
  regions: BodyRegionId[],
  context: RosterContext,
): Roster {
  const picks = allPicks({ ...preferences, bodyParts: undefined }, context);
  const perRegion = regions.map((region) =>
    picks.filter((id) => matchesRegion(id, region)),
  );
  const offset = template === 'A' ? 0 : 1;
  const ids: ExerciseId[] = [];
  const add = (id: ExerciseId | undefined) => {
    if (id && !ids.includes(id) && ids.length < 5) ids.push(id);
  };
  // Pass A takes each region's 1st, 3rd... pick and pass B its 2nd, 4th..., so the
  // two passes differ as sets. A pool of one or two exercises can only repeat.
  for (const list of perRegion) add(list[offset] ?? list[0]);
  for (const list of perRegion)
    list.forEach((id, index) => {
      if (index % 2 === offset) add(id);
    });
  for (const list of perRegion)
    for (const id of list) if (ids.length < 3) add(id);
  if (!ids.length) return { ids: [], notes: {} };
  if (ids.length >= 3) return { ids, notes: {} };
  for (const id of wholeBody(preferences, template, context).ids) {
    if (ids.length >= 3) break;
    add(id);
  }
  return { ids, notes: {}, note: TOP_UP_NOTE };
}

/** Running keeps its A/B template; a lower level swaps in easier same-slot exercises. */
function running(
  preferences: TrainingPreferences,
  template: TemplateId,
): Roster {
  const levels = allowedLevels(preferences.experience);
  const ids: ExerciseId[] = [];
  const ok = (id: ExerciseId) =>
    fits(id, preferences) &&
    usable(id, preferences) &&
    levels.includes(levelOf(id, preferences)) &&
    !ids.includes(id);
  for (const item of templates[template].items) {
    const original = item.exerciseId;
    if (ok(original)) {
      ids.push(original);
      continue;
    }
    const easier = exerciseMetadata[original].easierExerciseId;
    const chain = [
      ...(easier ? [easier] : []),
      ...(runningEasier[original] ?? []),
    ];
    // Nothing easier fits: the exercise is dropped rather than kept above the user's level.
    const replacement = chain.find(ok);
    if (replacement) ids.push(replacement);
  }
  return { ids, notes: {} };
}

export function buildRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
  context: RosterContext = {},
): Roster {
  if (preferences.programId === 'rehab') return { ids: [], notes: {} };
  const roster =
    preferences.programId === 'running'
      ? running(preferences, template)
      : preferences.bodyParts?.length
        ? focused(preferences, template, preferences.bodyParts, context)
        : wholeBody(preferences, template, context);
  // Whole-body and running slots already provide at least three apparatus-free
  // options at every level. A focused selection may intentionally stay empty.
  return roster;
}

export function initialTrainingRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
  context: RosterContext = {},
): ExerciseId[] {
  return buildRoster(preferences, template, context).ids;
}
