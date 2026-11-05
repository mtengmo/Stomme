import type { ExerciseVariant } from '../content/exerciseMetadata';
import {
  type FocusId,
  focusPresets,
  focusTargets,
  type WorkoutFocus,
} from '../content/focusPresets';
import { bodyRegions, exerciseMuscles } from '../content/muscles';
import { isRetiredExercise } from '../content/retiredExercises';
import {
  focusSlots,
  generalSlots,
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
  chooseStartingWeight,
  chooseVariant,
  heavyStartAllowed,
  levelRankOf,
  variantsThatFit,
  variantUsable,
} from './levelPolicy';

export interface RosterContext {
  focus?: WorkoutFocus;
  /**
   * Programme mode: only these exercises are candidates, program-only
   * supplements are added to some slots, the above-level fallback is never
   * used and the result is never annotated. Absent: today's behaviour.
   */
  pool?: ReadonlySet<ExerciseId>;
}

/** Fewest exercises a programme pass may have. */
export const MIN_PASS_EXERCISES = 4;

/**
 * Programme-only candidates, applied only together with a pool. They give a
 * bodyweight-only home (chair and wall) enough variety without editing the
 * shared slots: a second press (wall push-up after knee push-up, also as the
 * press of Helkropp B) and a leg exercise for the split-leg slot (wall sit).
 * `after` places the exercise behind that candidate; otherwise it goes last.
 */
const poolSupplements: {
  slot: string;
  add: ExerciseId;
  after?: ExerciseId;
}[] = [
  { slot: 'horizontal-press', add: 'wall-push-up', after: 'knee-push-up' },
  { slot: 'overhead', add: 'wall-push-up' },
  { slot: 'split-leg', add: 'wall-sit' },
];

/** The slot with its supplements, limited to the pool. */
function poolSlot(slot: RosterSlot, pool: ReadonlySet<ExerciseId>): RosterSlot {
  const candidates = [...slot.candidates];
  for (const s of poolSupplements) {
    if (s.slot !== slot.id) continue;
    const at = s.after ? candidates.indexOf(s.after) : -1;
    candidates.splice(at >= 0 ? at + 1 : candidates.length, 0, s.add);
  }
  return { ...slot, candidates: candidates.filter((id) => pool.has(id)) };
}

/** Core-only filler for a pass that came out short; valid without any note. */
function coreFill(
  ids: ExerciseId[],
  preferences: TrainingPreferences,
  pool: ReadonlySet<ExerciseId>,
): void {
  const filler = [...generalSlots.A, ...generalSlots.B]
    .flatMap((slot) => slot.candidates)
    .filter(
      (id) =>
        pool.has(id) && exerciseMuscles[id].primary.every((m) => m === 'core'),
    );
  for (const id of filler) {
    if (ids.length >= MIN_PASS_EXERCISES) break;
    const pick = pickFromSlot(
      { id: 'core-fill', candidates: [id] },
      preferences,
      new Set(ids),
      false,
    );
    if (pick) ids.push(pick.id);
  }
}

export interface Roster {
  ids: ExerciseId[];
  /** Per-exercise explanation added to the start suggestion. */
  notes: Partial<Record<ExerciseId, string>>;
  /** Shown once on the whole roster. */
  note?: string;
}

const TOP_UP_NOTE =
  'Kompletterat med bålövningar eftersom få övningar passar vald kroppsdel och utrustning.';
const EASIEST_NOTE =
  'Ingen övning på din nivå passar utrustningen. Den lättaste som finns är vald; kontrollera före start.';

function fits(id: ExerciseId, preferences: TrainingPreferences): boolean {
  return (
    !rehabAdditionIds.has(id) &&
    !isRetiredExercise(id) &&
    variantsThatFit(id, preferences).length > 0
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

/**
 * Programme mode: heaviest starting weight per hand a beginner pass accepts
 * for the small-muscle arm and shoulder work. A slot whose only loaded variant
 * would start heavier moves on to its next candidate.
 */
const programWeightCeilingKg: Partial<Record<ExerciseId, number>> = {
  'lateral-raise': 5,
  'triceps-kickback': 5,
  'biceps-curl': 10,
  'hammer-curl': 10,
};

function withinProgramCeiling(
  id: ExerciseId,
  preferences: TrainingPreferences,
): boolean {
  const ceiling = programWeightCeilingKg[id];
  const variant = chooseVariant(id, preferences);
  const tool = variant?.equipment.find(
    (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
  );
  if (ceiling === undefined || !variant || !tool) return true;
  const { totalKg } = chooseStartingWeight(preferences, variant, {
    heavyAllowed: heavyStartAllowed(id),
  });
  return totalKg / tool.count <= ceiling;
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
  used: ReadonlySet<ExerciseId>,
  /** false: return only in-level picks, never the easiest above-level one. */
  allowFallback = true,
  /** Programme mode: skip loaded variants that would start above the beginner ceiling. */
  capWeights = false,
): { id: ExerciseId; note?: string } | undefined {
  const levels = allowedLevels(preferences.experience);
  // A weighted exercise without a registered weight is never suggested; the slot moves on.
  const base = slot.candidates.filter(
    (id) =>
      !used.has(id) &&
      fits(id, preferences) &&
      usable(id, preferences) &&
      (!capWeights || withinProgramCeiling(id, preferences)),
  );
  const pool = base.filter((id) => levels.includes(levelOf(id, preferences)));
  if (!pool.length) {
    if (!allowFallback) return undefined;
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
  pool?: ReadonlySet<ExerciseId>,
): Roster {
  const ids: ExerciseId[] = [];
  const notes: Roster['notes'] = {};
  for (const slot of generalSlots[template]) {
    const pick = pickFromSlot(
      pool ? poolSlot(slot, pool) : slot,
      preferences,
      new Set(ids),
      !pool,
      !!pool,
    );
    if (!pick) continue;
    ids.push(pick.id);
    if (pick.note) notes[pick.id] = pick.note;
  }
  if (pool) coreFill(ids, preferences, pool);
  return { ids, notes };
}

/** Presets and regions with at least one equipment- and level-eligible pick. */
export function focusAvailable(preferences: TrainingPreferences): {
  presets: FocusId[];
  regions: BodyRegionId[];
} {
  const ids = focusSlots.flatMap((slot) => {
    const pick = pickFromSlot(slot, preferences, new Set());
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
  pool?: ReadonlySet<ExerciseId>,
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
    .map((slot) => (pool ? { ...slot, ...poolSlot(slot, pool) } : slot))
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
      const first = pickFromSlot(slot, preferences, used, false, !!pool);
      if (template === 'B' && round === 0 && first) {
        used.add(first.id);
        // The alternative is taken only when it is an in-level pick.
        const alternative = pickFromSlot(
          slot,
          preferences,
          used,
          false,
          !!pool,
        );
        add(alternative ?? first);
      } else add(first);
    }
    if (ids.length === before) break;
  }
  if (pool) {
    coreFill(ids, preferences, pool);
    return { ids, notes };
  }
  if (ids.length >= 3) return { ids, notes };
  let toppedUp = false;
  if (ids.length) {
    toppedUp = true;
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
          new Set(ids),
        ),
      );
    }
  }
  // Last resort: only when fewer than three in-level picks exist, the easiest
  // above-level exercise of a slot is taken (flagged with EASIEST_NOTE).
  for (const slot of slots) {
    if (ids.length >= 3) break;
    add(pickFromSlot(slot, preferences, new Set(ids), true));
  }
  return toppedUp ? { ids, notes, note: TOP_UP_NOTE } : { ids, notes };
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
    ? wholeBody(preferences, template, context.pool)
    : focusRoster(preferences, template, focus, context.pool);
}
export function initialTrainingRoster(
  preferences: TrainingPreferences,
  template: TemplateId,
  context: RosterContext = {},
): ExerciseId[] {
  return buildRoster(preferences, template, context).ids;
}
