import type { ExerciseVariant } from '../content/exerciseMetadata';
import {
  type FocusId,
  focusPresets,
  focusTargets,
  type WorkoutFocus,
} from '../content/focusPresets';
import { bodyRegions, exerciseMuscles } from '../content/muscles';
import {
  focusSlots,
  generalSlots,
  impactExercises,
  type RosterSlot,
  rehabAdditionIds,
} from '../content/rosterSlots';
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
  focus?: WorkoutFocus;
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

/** Presets and regions with at least one equipment- and level-eligible pick. */
export function focusAvailable(
  preferences: TrainingPreferences,
  context: RosterContext = {},
): { presets: FocusId[]; regions: BodyRegionId[] } {
  const ids = focusSlots.flatMap((slot) => {
    const pick = pickFromSlot(slot, preferences, context, new Set());
    return pick ? [pick.id] : [];
  });
  const hasMuscle = (targets: readonly string[]) =>
    ids.some((id) =>
      exerciseMuscles[id].primary.some((m) => targets.includes(m)),
    );
  return {
    presets: focusPresets
      .filter(
        (p) => p.id === 'full' || p.id === 'custom' || hasMuscle(p.targets),
      )
      .map((p) => p.id),
    regions: bodyRegions.filter((r) => hasMuscle(r.muscles)).map((r) => r.id),
  };
}

function focusRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
  focus: WorkoutFocus,
  context: RosterContext,
): Roster {
  const targets = focusTargets(focus);
  const preset = focusPresets.find(
    (p) => p.id === focus.id,
  ) as (typeof focusPresets)[number];
  const slots = (
    preset.slots.length
      ? preset.slots.map(
          (id) =>
            focusSlots.find((s) => s.id === id) as (typeof focusSlots)[number],
        )
      : focusSlots
  )
    .filter((slot) => slot.targets.some((m) => targets.includes(m)))
    .map((slot) => ({
      ...slot,
      candidates: slot.candidates.filter((id) =>
        exerciseMuscles[id].primary.some((m) => targets.includes(m)),
      ),
    }));
  const ids: ExerciseId[] = [];
  const notes: Roster['notes'] = {};
  const limit = preferences.experience === 'regular' ? 6 : 5;
  const add = (pick: ReturnType<typeof pickFromSlot>) => {
    if (!pick) return;
    ids.push(pick.id);
    if (pick.note) notes[pick.id] = pick.note;
  };
  // Compound slots come first. Further rounds draw unique alternatives through
  // the same equipment, level, weight and symptom policy as every other pick.
  for (let round = 0; round < limit && ids.length < limit; round++) {
    const before = ids.length;
    for (const slot of slots) {
      if (ids.length >= limit) break;
      const used = new Set(ids);
      const first = pickFromSlot(slot, preferences, context, used);
      if (template === 'B' && round === 0 && first) {
        used.add(first.id);
        add(pickFromSlot(slot, preferences, context, used) ?? first);
      } else add(first);
    }
    if (ids.length === before) break;
  }
  if (!ids.length || ids.length >= 3) return { ids, notes };
  // A sparse focus gets core-only whole-body candidates, so the advisory
  // filler cannot silently introduce leg/press work into a pull day.
  const filler = [...generalSlots.A, ...generalSlots.B]
    .flatMap((slot) => slot.candidates)
    .filter((id) => exerciseMuscles[id].primary.every((m) => m === 'core'));
  for (const id of filler) {
    if (ids.length >= 3) break;
    add(
      pickFromSlot(
        { id: 'core-fill', candidates: [id] },
        preferences,
        context,
        new Set(ids),
      ),
    );
  }
  return { ids, notes, note: TOP_UP_NOTE };
}

export function buildRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
  context: RosterContext = {},
): Roster {
  if (preferences.programId === 'rehab') return { ids: [], notes: {} };
  const focus =
    context.focus ??
    (preferences.bodyParts?.length
      ? { id: 'custom' as const, regions: preferences.bodyParts }
      : { id: 'full' as const });
  return focus.id === 'full'
    ? wholeBody(preferences, template, context)
    : focusRoster(preferences, template, focus, context);
}
export function initialTrainingRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
  context: RosterContext = {},
): ExerciseId[] {
  return buildRoster(preferences, template, context).ids;
}
