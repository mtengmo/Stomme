export type ExerciseId =
  | 'goblet-chair-squat'
  | 'step-up'
  | 'single-leg-rdl'
  | 'dead-bug'
  | 'side-plank'
  | 'split-squat'
  | 'single-leg-hip-thrust'
  | 'single-leg-calf-raise'
  | 'suitcase-carry'
  | 'bird-dog'
  | 'wall-sit'
  | 'goblet-squat'
  | 'kettlebell-deadlift'
  | 'dumbbell-rdl'
  | 'supported-row'
  | 'floor-press'
  | 'shoulder-press'
  | 'farmer-carry'
  | 'biceps-curl'
  | 'hammer-curl'
  | 'lateral-raise'
  | 'triceps-kickback'
  | 'glute-bridge'
  | 'reverse-lunge'
  | 'forward-lunge'
  | 'kettlebell-swing'
  | 'kettlebell-press'
  | 'half-squat'
  | 'hamstring-curl'
  | 'seated-knee-extension'
  | 'straight-leg-raise'
  | 'prone-leg-raise'
  | 'side-lying-hip-abduction'
  | 'side-lying-hip-adduction'
  | 'calf-stretch'
  | 'quadriceps-stretch'
  | 'hamstring-stretch'
  | 'band-leg-press'
  | 'kettlebell-floor-press'
  | 'kettlebell-rack-carry'
  | 'rear-foot-split-squat'
  | 'bench-side-plank-leg-lift'
  | 'kneeling-hip-flexor-stretch'
  | 'prone-on-forearms'
  | 'heel-slide'
  | 'balance-pendulum'
  | 'single-leg-chair-squat'
  | 'single-leg-floor-bridge'
  | 'quad-set'
  | 'seated-knee-flexion'
  | 'band-knee-extension'
  | 'band-hip-extension'
  | 'balance-clock'
  | 'push-up'
  | 'pull-up'
  | 'chin-up'
  | 'back-extension'
  | 'parallel-dip'
  | 'lying-leg-raise'
  | 'burpee'
  | 'plank'
  | 'squat-jump'
  | 'jumping-lunge'
  | 'mountain-climber';

export type Unit = 'reps' | 'seconds' | 'meters' | 'laps';
export type SideKind = 'ben' | 'sida' | 'hand';

/** kg = total external load (2x5 kg -> 10). */
export interface Load {
  kg: number;
  label: string;
}

export interface Exercise {
  id: ExerciseId;
  name: string;
  muscles: string[];
  tips: [string, string, string];
  commonMistake: string;
  easierVariant: string;
  unit: Unit;
  perSide: boolean;
  sideKind?: SideKind;
  range: { start: number; max: number; step: number };
  /** Light to heavy; index 0 may be bodyweight (kg 0). */
  loadLadder: Load[];
  /** Used from programme week 2. */
  startLoadIndex: number;
  /** Used in programme week 1. */
  week1LoadIndex: number;
  /** Gated by the pain rule. */
  kneeLoaded: boolean;
  optional?: boolean;
}

export type TemplateId = 'A' | 'B';

export type RehabFocus = 'custom' | 'knee' | 'knee-physio';
export type ProgramId = 'general' | 'running' | 'rehab';
export type EquipmentChoice =
  | 'bodyweight'
  | 'dumbbell-1'
  | 'dumbbell-2'
  | 'kettlebell-1'
  | 'kettlebell-2'
  | 'chair'
  | 'support'
  | 'step'
  | 'band'
  | 'pull-up-bar'
  | 'dip-bars';
export interface WeightInventoryItem {
  type: 'dumbbell' | 'kettlebell';
  /** Weight of one implement, in kg. */
  kg: number;
  count: 1 | 2;
}
/** Broad body regions a general programme can be focused on. */
export type BodyRegionId =
  | 'legs'
  | 'core'
  | 'back'
  | 'chest'
  | 'shoulders'
  | 'arms';
export interface TrainingPreferences {
  programId: ProgramId;
  equipment: EquipmentChoice[];
  experience: 'new' | 'some' | 'regular';
  /** Optional for backwards compatibility with type/count-only preferences. */
  weights?: WeightInventoryItem[];
  rehabFocus?: RehabFocus;
  rehabSide?: 'right' | 'left' | 'both';
  /** General programme only: focus the first sessions on these regions. Absent means whole body. */
  bodyParts?: BodyRegionId[];
}
export interface SymptomReport {
  area: string;
  side: 'right' | 'left' | 'both' | 'unspecified';
  score: number;
}
export interface TrainingCheckin {
  recordedAt: string;
  feeling: 'ready' | 'tired' | 'good' | 'mixed' | 'difficult';
  symptoms: SymptomReport | null;
}

export interface TemplateItem {
  exerciseId: ExerciseId;
  sets: number;
  restSec: number;
}

export interface WorkoutTemplate {
  id: TemplateId;
  name: string;
  items: TemplateItem[];
}

export type SessionStatus = 'in_progress' | 'completed' | 'aborted';
export type Effort = 'easy' | 'ok' | 'hard';

export type ReasonCode =
  | 'first_time'
  | 'week1_bodyweight'
  | 'start_load'
  | 'added_set'
  | 'increase_amount'
  | 'next_load'
  | 'hold_incomplete'
  | 'hold_hard'
  | 'hold_not_easy_at_max'
  | 'hold_waiting_for_3_sets'
  | 'max_level'
  | 'pain_hold'
  | 'pain_stop_hold';

export interface PlannedExercise {
  exerciseId: ExerciseId;
  sets: number;
  target: number;
  loadIndex: number;
  weightKg: number;
  restSec: number;
  reason: ReasonCode;
  /** Explicit sides for clinician-selected/custom plans; absent preserves legacy behaviour. */
  sides?: ('right' | 'left' | 'both')[];
  variantId?: string;
  explanation?: string;
}

export interface ExerciseFeedback {
  effort?: Effort;
  effortSkipped?: boolean;
  skipped?: boolean;
  symptoms?: SymptomReport | null;
}

export interface Session {
  id: string;
  templateId: TemplateId;
  customWorkoutId?: string;
  customWorkoutName?: string;
  /** Absent on original knee/running sessions. */
  programId?: ProgramId;
  /** Experience selected when this workout was prepared. */
  experience?: TrainingPreferences['experience'];
  policyVersion?: number;
  rehabFocus?: RehabFocus;
  checkins?: Partial<Record<'before' | 'after' | 'dayAfter', TrainingCheckin>>;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** ISO-8601 instant. */
  startedAt: string;
  finishedAt?: string;
  status: SessionStatus;
  abortReason?: 'pain_stop' | 'user';
  programWeek: number;
  plan: PlannedExercise[];
  feedback: Partial<Record<ExerciseId, ExerciseFeedback>>;
  note?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: ExerciseId;
  /** 1-based. */
  setNumber: number;
  side: 'right' | 'left' | 'both';
  /** reps, seconds or meters depending on the exercise unit. */
  amount: number;
  loadIndex: number;
  weightKg: number;
  variantId?: string;
  loggedAt: string;
}

export interface PainLog {
  id: string;
  sessionId: string;
  date: string;
  timing: 'before' | 'after' | 'dayAfter';
  /** Integer 0-10. */
  score: number;
  location: 'right_knee';
  redFlags: { sharp: boolean; swelling: boolean; locking: boolean };
  createdAt: string;
}

export interface MetaEntry {
  key:
    | 'program'
    | 'onboarding'
    | 'backup'
    | 'training'
    | 'rehabPlans'
    | 'customWorkouts'
    | 'favourites';
  value: unknown;
}

export type PainStatus = 'ok' | 'warn' | 'stop';
export type PainReason =
  | 'red_flag'
  | 'above_threshold'
  | 'worse_than_previous_day'
  | 'invalid_score';
