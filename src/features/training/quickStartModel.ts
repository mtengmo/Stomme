import { bodyRegions } from '../../content/muscles';
import {
  equipmentChoices,
  isTrainingPreferences,
} from '../../content/programmes';
import type {
  AdjustableWeightItem,
  BodyRegionId,
  EquipmentChoice,
  ProgramEmphasis,
  TrainingPreferences,
  WeightInventoryItem,
} from '../../domain/types';
import type { DaysPerWeek } from '../../rules/programPlan';

export type Goal = 'general' | 'build' | 'knee' | 'physio' | 'custom';
export type Step =
  | 'goal'
  | 'rehab'
  | 'days'
  | 'emphasis'
  | 'equipment'
  | 'weights'
  | 'level'
  | 'pick';
export type WeightKind = WeightInventoryItem['type'];
export const DEFAULT_DAYS: DaysPerWeek = 2;
export const DAY_OPTIONS: readonly DaysPerWeek[] = [1, 2, 3, 4, 5];
export const EMPHASES: readonly ProgramEmphasis[] = ['full', 'run', 'upper'];
export type Focus = 'all' | 'select';
export type Side = 'both' | 'right' | 'left';
type Experience = TrainingPreferences['experience'];

/** Everyone has a chair and a wall, so the step starts with them ticked. */
export const DEFAULT_SUPPORT: EquipmentChoice[] = ['chair', 'support'];

export const levelHints: Record<Experience, string> = {
  new: 'Grundövningar, 2 set, lättaste vikterna.',
  some: 'Även övningar med lite vana, 3 set, mellanvikter.',
  regular: 'Alla övningar, 3–4 set, tyngre startvikter.',
};

const goals: Goal[] = ['general', 'build', 'knee', 'physio', 'custom'];

/**
 * Steps of a goal. Strength ends with days, emphasis, equipment, an optional
 * weights step (when dumbbells or kettlebells are ticked) and level.
 */
export function stepsFor(
  goal: Goal | null,
  draft?: Pick<Draft, 'weightKinds'>,
): Step[] {
  if (goal === 'general')
    return [
      'goal',
      'days',
      'emphasis',
      'equipment',
      ...(draft?.weightKinds.length ? (['weights'] as const) : []),
      'level',
    ];
  if (goal === 'build') return ['goal', 'equipment', 'level', 'pick'];
  return goal ? ['goal', 'rehab', 'equipment'] : ['goal'];
}

export function isRehabGoal(goal: Goal | null): boolean {
  return goal === 'knee' || goal === 'physio' || goal === 'custom';
}

/** Support items the checklist may offer for a goal; anything else is dropped on save. */
export function allowedEquipment(goal: Goal | null): EquipmentChoice[] {
  const base: EquipmentChoice[] = ['chair', 'support'];
  if (goal === 'general' || goal === 'build' || goal === 'custom')
    return [...base, 'step', 'band', 'pull-up-bar', 'dip-bars'];
  if (goal === 'physio') return [...base, 'band'];
  return base;
}

/** Knee and the physio's programme never use dumbbells or kettlebells. */
export function showsWeights(goal: Goal | null): boolean {
  return !(goal === 'knee' || goal === 'physio');
}

export interface Draft {
  goal: Goal | null;
  step: Step;
  /** Ticked support items (bodyweight is implied). */
  equipment: EquipmentChoice[];
  experience: Experience;
  weights: NonNullable<TrainingPreferences['weights']>;
  adjustableWeights: NonNullable<TrainingPreferences['adjustableWeights']>;
  side: Side;
  /** Training days per week (strength programme). */
  days: DaysPerWeek;
  emphasis: ProgramEmphasis;
  /** Ticked weight kinds; their weights are entered on the weights step. */
  weightKinds: WeightKind[];
  focus: Focus;
  bodyParts: BodyRegionId[];
  /** Filters of the pick step as a query string (see rules/libraryFilters). */
  pickFilters: string;
}

export const emptyDraft: Draft = {
  goal: null,
  step: 'goal',
  equipment: [...DEFAULT_SUPPORT],
  experience: 'new',
  weights: [],
  adjustableWeights: [],
  side: 'both',
  days: DEFAULT_DAYS,
  emphasis: 'full',
  weightKinds: [],
  focus: 'all',
  bodyParts: [],
  pickFilters: '',
};

const regionIds = bodyRegions.map((region) => region.id);

/** Reads a stored draft field by field; anything unexpected falls back to the default. */
export function readDraft(raw: string | null): Draft {
  let value: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      value = parsed as Record<string, unknown>;
  } catch {
    return { ...emptyDraft };
  }
  const goal = goals.find((item) => item === value.goal) ?? null;
  const equipment =
    Array.isArray(value.equipment) &&
    value.equipment.length <= Object.keys(equipmentChoices).length &&
    new Set(value.equipment).size === value.equipment.length &&
    value.equipment.every(
      (item) =>
        typeof item === 'string' && Object.hasOwn(equipmentChoices, item),
    )
      ? (value.equipment as EquipmentChoice[])
      : [...DEFAULT_SUPPORT];
  const weights = Array.isArray(value.weights)
    ? (value.weights as Draft['weights'])
    : [];
  const weightKinds = (['dumbbell', 'kettlebell'] as const).filter((kind) =>
    Array.isArray(value.weightKinds)
      ? value.weightKinds.includes(kind)
      : weights.some((item) => item?.type === kind),
  );
  const steps = stepsFor(goal, { weightKinds });
  // The rehab choice is also open before a goal is picked.
  const step =
    goal === null && value.step === 'rehab'
      ? 'rehab'
      : steps.find((item) => item === value.step);
  const adjustableWeights = Array.isArray(value.adjustableWeights)
    ? (value.adjustableWeights as AdjustableWeightItem[])
    : [];
  const bodyParts =
    Array.isArray(value.bodyParts) &&
    new Set(value.bodyParts).size === value.bodyParts.length &&
    value.bodyParts.every((item) => regionIds.some((id) => id === item))
      ? (value.bodyParts as BodyRegionId[])
      : [];
  return {
    goal,
    // Drafts from before the steps existed only knew the equipment screen.
    step: step ?? (goal ? 'equipment' : 'goal'),
    equipment,
    experience:
      value.experience === 'some' || value.experience === 'regular'
        ? value.experience
        : 'new',
    weights: isTrainingPreferences({
      programId: 'general',
      experience: 'new',
      equipment: [],
      weights,
    })
      ? weights
      : [],
    adjustableWeights: isTrainingPreferences({
      programId: 'general',
      experience: 'new',
      equipment: [],
      adjustableWeights,
    })
      ? adjustableWeights
      : [],
    side: value.side === 'right' || value.side === 'left' ? value.side : 'both',
    days: DAY_OPTIONS.find((item) => item === value.days) ?? DEFAULT_DAYS,
    emphasis: EMPHASES.find((item) => item === value.emphasis) ?? 'full',
    weightKinds,
    focus: value.focus === 'select' ? 'select' : 'all',
    bodyParts,
    pickFilters:
      typeof value.pickFilters === 'string' && value.pickFilters.length <= 500
        ? value.pickFilters
        : '',
  };
}

/** What the answers mean as saved preferences. `regions` limits the focus to ones that have exercises. */
export function preferencesFromDraft(
  draft: Draft,
  regions: readonly BodyRegionId[] = regionIds,
): TrainingPreferences {
  const goal = draft.goal ?? 'general';
  const rehab = isRehabGoal(draft.goal);
  const allowed = allowedEquipment(goal);
  const equipment: EquipmentChoice[] = [
    'bodyweight',
    ...draft.equipment.filter((item) => allowed.includes(item)),
  ];
  const tools = showsWeights(draft.goal);
  const bodyParts =
    goal === 'general' && draft.focus === 'select'
      ? draft.bodyParts.filter((part) => regions.includes(part))
      : [];
  return {
    programId: rehab ? 'rehab' : 'general',
    equipment: [...new Set(equipment)],
    // Rehab never uses the strength level.
    experience: rehab ? 'new' : draft.experience,
    ...(tools && draft.weights.length ? { weights: draft.weights } : {}),
    ...(tools && draft.adjustableWeights.length
      ? { adjustableWeights: draft.adjustableWeights }
      : {}),
    ...(bodyParts.length ? { bodyParts } : {}),
    ...(rehab
      ? {
          rehabFocus:
            goal === 'knee'
              ? ('knee' as const)
              : goal === 'physio'
                ? ('knee-physio' as const)
                : ('custom' as const),
          rehabSide: draft.side,
        }
      : {}),
  };
}
