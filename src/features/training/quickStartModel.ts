import { bodyRegions } from '../../content/muscles';
import {
  equipmentChoices,
  isTrainingPreferences,
} from '../../content/programmes';
import type {
  AdjustableWeightItem,
  BodyRegionId,
  EquipmentChoice,
  TrainingPreferences,
} from '../../domain/types';

export type Goal =
  | 'general'
  | 'running'
  | 'build'
  | 'knee'
  | 'physio'
  | 'custom';
export type Step = 'goal' | 'equipment' | 'level' | 'focus' | 'pick';
export type Mode = 'bodyweight' | 'equipment';
export type Focus = 'all' | 'select';
export type Side = 'both' | 'right' | 'left';
type Experience = TrainingPreferences['experience'];

/** Egenvikt: the body, a chair and a wall. */
export const BODYWEIGHT_EQUIPMENT: EquipmentChoice[] = [
  'bodyweight',
  'chair',
  'support',
];

export const levelHints: Record<Experience, string> = {
  new: 'Grundövningar, 2 set, lättaste vikterna.',
  some: 'Även övningar med lite vana, 3 set, mellanvikter.',
  regular: 'Alla övningar, 3–4 set, tyngre startvikter.',
};

const goals: Goal[] = [
  'general',
  'running',
  'build',
  'knee',
  'physio',
  'custom',
];

export function stepsFor(goal: Goal | null): Step[] {
  if (goal === 'general') return ['goal', 'equipment', 'level', 'focus'];
  if (goal === 'running') return ['goal', 'equipment', 'level'];
  if (goal === 'build') return ['goal', 'equipment', 'level', 'pick'];
  return goal ? ['goal', 'equipment'] : ['goal'];
}

export function isRehabGoal(goal: Goal | null): boolean {
  return goal === 'knee' || goal === 'physio' || goal === 'custom';
}

/** Equipment the checklist may offer for a goal; anything else is dropped on save. */
export function allowedEquipment(goal: Goal | null): EquipmentChoice[] {
  const base: EquipmentChoice[] = ['chair', 'support'];
  if (goal === 'general' || goal === 'running' || goal === 'build')
    return [
      'dumbbell-1',
      'dumbbell-2',
      'kettlebell-1',
      'kettlebell-2',
      ...base,
      'step',
      'band',
      'pull-up-bar',
      'dip-bars',
    ];
  if (goal === 'custom')
    return [
      'dumbbell-1',
      'dumbbell-2',
      'kettlebell-1',
      'kettlebell-2',
      ...base,
      'step',
      'band',
      'pull-up-bar',
      'dip-bars',
    ];
  if (goal === 'physio') return [...base, 'band'];
  return base;
}

export interface Draft {
  goal: Goal | null;
  step: Step;
  mode: Mode;
  /** Ticked under Utrustning; Egenvikt ignores it. */
  equipment: EquipmentChoice[];
  experience: Experience;
  weights: NonNullable<TrainingPreferences['weights']>;
  adjustableWeights: NonNullable<TrainingPreferences['adjustableWeights']>;
  side: Side;
  focus: Focus;
  bodyParts: BodyRegionId[];
  /** Filters of the pick step as a query string (see rules/libraryFilters). */
  pickFilters: string;
}

export const emptyDraft: Draft = {
  goal: null,
  step: 'goal',
  mode: 'bodyweight',
  equipment: [],
  experience: 'new',
  weights: [],
  adjustableWeights: [],
  side: 'both',
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
  const steps = stepsFor(goal);
  const step = steps.find((item) => item === value.step);
  const equipment =
    Array.isArray(value.equipment) &&
    value.equipment.length <= 11 &&
    new Set(value.equipment).size === value.equipment.length &&
    value.equipment.every(
      (item) =>
        typeof item === 'string' && Object.hasOwn(equipmentChoices, item),
    )
      ? (value.equipment as EquipmentChoice[])
      : [];
  const weights = Array.isArray(value.weights)
    ? (value.weights as Draft['weights'])
    : [];
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
    mode: value.mode === 'equipment' ? 'equipment' : 'bodyweight',
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
  const equipment: EquipmentChoice[] =
    draft.mode === 'bodyweight'
      ? [...BODYWEIGHT_EQUIPMENT]
      : [
          'bodyweight',
          ...draft.equipment.filter((item) => allowed.includes(item)),
        ];
  const tools = equipment.some(
    (item) => item.startsWith('dumbbell') || item.startsWith('kettlebell'),
  );
  const bodyParts =
    goal === 'general' && draft.focus === 'select'
      ? draft.bodyParts.filter((part) => regions.includes(part))
      : [];
  return {
    programId: rehab
      ? 'rehab'
      : goal === 'build'
        ? 'general'
        : (goal as 'general' | 'running'),
    equipment: [...new Set(equipment)],
    // Rehab never uses the strength level.
    experience: rehab ? 'new' : draft.experience,
    ...((!rehab || goal === 'custom') && tools && draft.weights.length
      ? { weights: draft.weights }
      : {}),
    ...((!rehab || goal === 'custom') && tools && draft.adjustableWeights.length
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
