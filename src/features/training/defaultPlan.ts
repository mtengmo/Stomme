import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exercises } from '../../content/exercises';
import type { WorkoutFocus } from '../../content/focusPresets';
import { kneeConditioningPlan } from '../../content/kneeRehab';
import { physioKneePlan } from '../../content/physioKneeProgramme';
import { rehabGroupOf } from '../../content/programmes';
import { validateTrainingPlan } from '../../db/training';
import type {
  ExerciseId,
  PlannedExercise,
  RehabFocus,
  Session,
  SetLog,
  TemplateId,
  TrainingPreferences,
  TrainingRoutines,
} from '../../domain/types';
import { defaultFocus } from '../../lib/focus';
import { equipmentFits } from '../../rules/equipment';
import {
  chooseStartingWeight,
  chooseVariant,
  heavyStartAllowed,
  startingSets,
} from '../../rules/levelPolicy';

import { buildRoster } from '../../rules/programRosters';
import { trainingPlanSuggestion } from '../../rules/training';
import { startingWeight } from '../../rules/weightInventory';

const START_NOTE =
  'Startförslag för din träningsvana. Anpassa antal och vikt före start.';
const HEAVY_NOTE =
  'Tung startvikt eftersom du tränar regelbundet – välj lättare vid behov.';
/** The text trainingPlanSuggestion gives a plan that has no history to build on. */
const NO_HISTORY_NOTE = 'Startförslag. Anpassa antal och vikt efter din vana.';

export interface BasePlanOptions {
  /** Position in the first-session roster; sets depend on it for regular training. */
  index?: number;
  /**
   * Set only when building the first-session roster: level-driven variant and
   * starting weight. Variant switches, adds and favourites keep the lightest weight.
   */
  roster?: { note?: string };
}

export function basePlan(
  id: ExerciseId,
  preferences: TrainingPreferences,
  options: BasePlanOptions = {},
): PlannedExercise {
  const exercise = exercises[id];
  const rehab = preferences.programId === 'rehab';
  const variant =
    options.roster && !rehab
      ? chooseVariant(id, preferences)
      : exerciseMetadata[id].variants.find((item) =>
          equipmentFits(item.equipment, preferences),
        );
  const start =
    variant && options.roster && !rehab
      ? chooseStartingWeight(preferences, variant, {
          heavyAllowed: heavyStartAllowed(id),
        })
      : {
          totalKg: variant ? startingWeight(preferences, variant) : 0,
          heavy: false,
        };
  return {
    exerciseId: id,
    sets: rehab ? 0 : startingSets(preferences.experience, options.index),
    target: rehab ? 0 : exercise.range.start,
    loadIndex: variant?.defaultLoadIndex ?? 0,
    weightKg: start.totalKg,
    restSec: 60,
    reason: 'first_time',
    variantId: variant?.id,
    sides: exercise.perSide
      ? rehab && preferences.rehabSide && preferences.rehabSide !== 'both'
        ? [preferences.rehabSide]
        : ['right', 'left']
      : ['both'],
    ...(options.roster
      ? {
          // Safety notes replace the generic start line so the overview can show them.
          explanation:
            [start.heavy ? HEAVY_NOTE : '', options.roster.note ?? '']
              .filter(Boolean)
              .join(' ') || START_NOTE,
        }
      : {}),
  };
}

/** Saved plan, then the last session for the focus, then the group's starter values. */
export function defaultPlan(
  preferences: TrainingPreferences,
  id: TemplateId,
  sessions: Session[],
  logs: SetLog[],
  savedPlans?: Partial<Record<RehabFocus, PlannedExercise[]>>,
  savedRoutines?: TrainingRoutines,
  focus: WorkoutFocus = defaultFocus(preferences),
): PlannedExercise[] {
  if (preferences.programId === 'rehab') {
    const focus = preferences.rehabFocus ?? 'custom';
    const saved = savedPlans?.[focus];
    if (saved && validateTrainingPlan(saved)) return structuredClone(saved);
    const prior = sessions.find(
      (session) =>
        !session.equipmentOverride &&
        session.programId === 'rehab' &&
        (session.rehabFocus ?? 'custom') === focus,
    );
    return (
      prior?.plan.map((plan) => ({
        ...plan,
        explanation: 'Din senast använda dosering. Kontrollera före start.',
      })) ??
      (rehabGroupOf(focus) === 'aaos'
        ? kneeConditioningPlan(preferences)
        : rehabGroupOf(focus) === 'physio'
          ? physioKneePlan(preferences)
          : [])
    );
  }
  const saved =
    focus.id !== 'custom' ? savedRoutines?.[focus.id]?.[id] : undefined;
  if (saved && validateTrainingPlan(saved))
    return saved.map((item) => {
      const variant = exerciseMetadata[item.exerciseId].variants.find(
        (candidate) => candidate.id === item.variantId,
      );
      if (!variant || !equipmentFits(variant.equipment, preferences))
        return {
          ...structuredClone(item),
          explanation:
            'Den sparade utrustningsvarianten finns inte bland dina val. Välj variant och kontrollera antal och vikt före start.',
        };
      const suggestion = trainingPlanSuggestion(
        item,
        preferences,
        sessions,
        logs,
        item.variantId,
        item.sides ??
          (exercises[item.exerciseId].perSide ? ['right', 'left'] : ['both']),
      );
      return {
        ...structuredClone(item),
        target: suggestion.target,
        loadIndex: suggestion.loadIndex,
        weightKg: suggestion.weightKg,
        explanation:
          suggestion.explanation === NO_HISTORY_NOTE
            ? 'Sparat pass. Kontrollera antal och vikt före start.'
            : suggestion.explanation,
      };
    });
  const roster = buildRoster(preferences, id, { focus });
  return roster.ids.map((exerciseId, index) => {
    const plan = basePlan(exerciseId, preferences, {
      index,
      roster: {
        note: [roster.notes[exerciseId], roster.note].filter(Boolean).join(' '),
      },
    });
    const suggestion = trainingPlanSuggestion(
      plan,
      preferences,
      sessions,
      logs,
    );
    // History keeps its own explanation; a fresh start keeps the level note.
    return suggestion.explanation === NO_HISTORY_NOTE
      ? { ...suggestion, explanation: plan.explanation }
      : suggestion;
  });
}

/**
 * Dose for a custom workout: the roster rule picks variant, sets and starting
 * weight from experience (heavy start only for heavy-slot exercises that are
 * not limited; rehab starts at 0/0). History
 * then adds at most what trainingPlanSuggestion allows.
 */
export function customWorkoutPlan(
  ids: readonly ExerciseId[],
  preferences: TrainingPreferences,
  sessions: Session[],
  logs: SetLog[],
): PlannedExercise[] {
  return ids.map((exerciseId, index) => {
    const plan = basePlan(exerciseId, preferences, {
      index,
      roster: {},
    });
    const suggestion = trainingPlanSuggestion(
      plan,
      preferences,
      sessions,
      logs,
    );
    return suggestion.explanation === NO_HISTORY_NOTE
      ? { ...suggestion, explanation: plan.explanation }
      : suggestion;
  });
}
