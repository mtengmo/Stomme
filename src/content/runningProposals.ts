import type { ExerciseId, TrainingPreferences } from '../domain/types';
import { equipmentFits, type Inventory } from '../rules/equipment';
import { exerciseMetadata } from './exerciseMetadata';

/**
 * Proposals for the ready-made workout Löpstyrka. Every slot is one movement
 * pattern with catalogue exercises ordered easier to harder; a proposal takes
 * one exercise per slot. Only exercises that exist, are not marked needs-fix
 * in docs/exercise-audit-log.json (checked by runningProposals.test.ts) and
 * are either outside the programme exclusions or part of the running group.
 */
export type RunningSlotId =
  | 'squat'
  | 'hinge'
  | 'hip-extension'
  | 'calf'
  | 'hip-stability'
  | 'hold'
  | 'core'
  | 'reactive';

export interface RunningSlot {
  id: RunningSlotId;
  /** Easier first. */
  options: readonly ExerciseId[];
}

export const runningSlots: readonly RunningSlot[] = [
  {
    id: 'squat',
    options: [
      'goblet-chair-squat',
      'split-squat',
      'reverse-lunge',
      'step-up',
      'step-down',
      'rear-foot-split-squat',
    ],
  },
  {
    id: 'hinge',
    options: ['kettlebell-deadlift', 'dumbbell-rdl', 'single-leg-rdl'],
  },
  {
    id: 'hip-extension',
    options: ['glute-bridge', 'weighted-glute-bridge', 'single-leg-hip-thrust'],
  },
  { id: 'calf', options: ['calf-raise', 'single-leg-calf-raise'] },
  { id: 'hip-stability', options: ['side-plank', 'copenhagen-hold'] },
  { id: 'hold', options: ['isometric-lunge-hold'] },
  { id: 'core', options: ['dead-bug', 'bird-dog'] },
  { id: 'reactive', options: ['plate-pogos'] },
];

/** The one jumping exercise. Never in the easiest proposal, at most one per proposal. */
export const plyometricIds: ReadonlySet<ExerciseId> = new Set(['plate-pogos']);

export type ProposalId = 'grund' | 'medel' | 'stark' | 'slump';

export interface RunningProposal {
  id: ProposalId;
  /** "Grund", "Medel", "Stark" or "Slump". */
  label: string;
  exerciseIds: ExerciseId[];
}

type Setup = Inventory & Partial<Pick<TrainingPreferences, 'experience'>>;

const proposalLevels = [
  { id: 'grund', label: 'Grund', position: 0, core: false, reactive: false },
  { id: 'medel', label: 'Medel', position: 0.5, core: true, reactive: false },
  { id: 'stark', label: 'Stark', position: 1, core: true, reactive: true },
] as const;

function doable(id: ExerciseId, setup: Inventory): boolean {
  return exerciseMetadata[id].variants.some((variant) =>
    equipmentFits(variant.equipment, setup),
  );
}

function eligible(slot: RunningSlot, setup: Inventory): ExerciseId[] {
  return slot.options.filter((id) => doable(id, setup));
}

/** The three fixed proposals. Deterministic: the same setup gives the same lists. */
export function proposals(setup: Setup): RunningProposal[] {
  return proposalLevels.map((level) => {
    const exerciseIds: ExerciseId[] = [];
    for (const slot of runningSlots) {
      if (slot.id === 'core' && !level.core) continue;
      if (slot.id === 'reactive' && !level.reactive) continue;
      const options = eligible(slot, setup);
      const pick = options[Math.round(level.position * (options.length - 1))];
      if (pick) exerciseIds.push(pick);
    }
    return { id: level.id, label: level.label, exerciseIds };
  });
}

/** Small seeded generator (mulberry32). */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function draw(setup: Setup, seed: number): ExerciseId[] {
  const next = random(seed);
  const ids: ExerciseId[] = [];
  let plyo = 0;
  for (const slot of runningSlots) {
    const options = eligible(slot, setup);
    const roll = next();
    const pickAt = next();
    if (slot.id === 'core' && roll >= 0.6) continue;
    if (slot.id === 'reactive' && (setup.experience === 'new' || roll >= 0.3))
      continue;
    const pick = options[Math.floor(pickAt * options.length)];
    if (!pick) continue;
    if (plyometricIds.has(pick)) {
      if (plyo >= 1) continue;
      plyo += 1;
    }
    ids.push(pick);
  }
  return ids;
}

/**
 * A new random proposal for the seed. Deterministic per seed. When `avoid` is
 * given, later seeds are tried until the list differs from it (when the setup
 * allows more than one list).
 */
export function shuffle(
  setup: Setup,
  seed: number,
  avoid?: readonly ExerciseId[],
): RunningProposal {
  let ids = draw(setup, seed);
  for (let attempt = 1; avoid && attempt <= 24; attempt += 1) {
    if (ids.join() !== avoid.join()) break;
    ids = draw(setup, seed + attempt * 7919);
  }
  return { id: 'slump', label: 'Slump', exerciseIds: ids };
}

/** The slot an exercise belongs to, if any. */
export function slotOf(id: ExerciseId): RunningSlot | undefined {
  return runningSlots.find((slot) => slot.options.includes(id));
}

/**
 * The next easier or harder exercise: the slot neighbour the equipment allows,
 * else the catalogue's easier/harder link. Never one already in the workout.
 */
export function neighbour(
  id: ExerciseId,
  direction: 'easier' | 'harder',
  setup: Inventory,
  present: readonly ExerciseId[],
): ExerciseId | undefined {
  const free = (candidate: ExerciseId) =>
    !present.includes(candidate) && doable(candidate, setup);
  const slot = slotOf(id);
  if (slot) {
    const at = slot.options.indexOf(id);
    const line =
      direction === 'easier'
        ? slot.options.slice(0, at).reverse()
        : slot.options.slice(at + 1);
    return line.find(free);
  }
  const meta = exerciseMetadata[id];
  const linked =
    direction === 'easier' ? meta.easierExerciseId : meta.harderExerciseId;
  return linked && free(linked) ? linked : undefined;
}
