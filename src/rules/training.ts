import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type {
  PlannedExercise,
  Session,
  SetLog,
  TrainingCheckin,
  TrainingPreferences,
} from '../domain/types';
import { daysBetween } from '../lib/dates';
import { equipmentFits } from './equipment';
import { variantWeights } from './weightInventory';

/** Keep each direction's history separate and restore only available variants. */
export function trainingPlanSuggestion(
  plan: PlannedExercise,
  preferences: TrainingPreferences,
  sessions: readonly Session[],
  logs: readonly SetLog[],
  variantId?: string,
): PlannedExercise {
  const previous = sessions
    .filter(
      (session) =>
        session.programId === preferences.programId &&
        session.status === 'completed' &&
        (!variantId ||
          session.plan.some(
            (item) =>
              item.exerciseId === plan.exerciseId &&
              item.variantId === variantId,
          )) &&
        session.plan.some((item) => item.exerciseId === plan.exerciseId),
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const previousPlan = previous?.plan.find(
    (item) => item.exerciseId === plan.exerciseId,
  );
  if (previousPlan) {
    const variant = exerciseMetadata[plan.exerciseId].variants.find(
      (item) => item.id === previousPlan.variantId,
    );
    if (!variant || !equipmentFits(variant.equipment, preferences.equipment))
      return {
        ...plan,
        explanation:
          'Tidigare utrustningsvariant finns inte bland dina val. Nytt startförslag; kontrollera antal och vikt.',
      };
  }
  const suggestion = trainingSuggestion(plan, previous, logs);
  const variant = exerciseMetadata[plan.exerciseId].variants.find(
    (item) => item.id === suggestion.variantId,
  );
  if (!variant) return suggestion;
  const choices = variantWeights(preferences, variant);
  if (
    choices.length &&
    suggestion.weightKg > 0 &&
    !choices.some((item) => item.totalKg === suggestion.weightKg)
  ) {
    return {
      ...suggestion,
      target:
        logs
          .filter(
            (item) =>
              item.sessionId === previous?.id &&
              item.exerciseId === plan.exerciseId,
          )
          .at(-1)?.amount ?? plan.target,
      explanation: `Senast använd vikt (${suggestion.weightKg} kg) finns inte bland dina registrerade vikter. Välj tillgänglig vikt eller ange vikten du använder idag. Ingen automatisk ökning.`,
    };
  }
  // A heavier load is an explicit choice: never silently jump to a user's next kettlebell.
  const next = choices.find((item) => item.totalKg > suggestion.weightKg);
  const ex = exercises[plan.exerciseId];
  const previousLogs = logs.filter(
    (item) =>
      item.sessionId === previous?.id && item.exerciseId === plan.exerciseId,
  );
  const complete =
    previousPlan &&
    !previous?.feedback[plan.exerciseId]?.skipped &&
    Array.from({ length: previousPlan.sets }, (_, i) => i + 1).every(
      (setNumber) =>
        (
          previousPlan.sides ?? (ex.perSide ? ['right', 'left'] : ['both'])
        ).every((side) =>
          previousLogs.some(
            (item) =>
              item.setNumber === setNumber &&
              item.side === side &&
              item.amount >= ex.range.max &&
              item.weightKg === suggestion.weightKg &&
              item.loadIndex === suggestion.loadIndex,
          ),
        ),
    );
  if (
    previous &&
    complete &&
    next &&
    suggestion.target >= ex.range.max &&
    ex.unit === 'reps' &&
    previous.programId !== 'rehab' &&
    previous.feedback[plan.exerciseId]?.effort === 'easy' &&
    previous.checkins?.after?.feeling === 'good' &&
    !Object.values(previous.checkins).some((item) => item?.symptoms) &&
    !Object.values(previous.feedback).some((item) => item?.symptoms) &&
    logs
      .filter(
        (item) =>
          item.sessionId === previous.id && item.exerciseId === plan.exerciseId,
      )
      .every((item) => item.amount >= ex.range.max)
  ) {
    return {
      ...suggestion,
      explanation: `${suggestion.explanation} Nästa registrerade vikt är ${next.label}. Viktökning väljer du själv; kontrollera antal repetitioner innan du startar.`,
    };
  }
  return suggestion;
}

/** General strength uses its own transparent policy, without knee-specific thresholds. */
export function trainingSuggestion(
  plan: PlannedExercise,
  previous: Session | undefined,
  logs: readonly SetLog[],
): PlannedExercise {
  if (!previous)
    return {
      ...plan,
      explanation: 'Startförslag. Anpassa antal och vikt efter din vana.',
    };
  const feedback = previous.feedback[plan.exerciseId];
  const previousPlan = previous.plan.find(
    (item) => item.exerciseId === plan.exerciseId,
  );
  const mine = logs
    .filter(
      (log) =>
        log.sessionId === previous.id && log.exerciseId === plan.exerciseId,
    )
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const last = mine.at(-1);
  if (!last)
    return {
      ...plan,
      explanation: 'Inget komplett resultat att utgå från. Välj själv.',
    };
  const base = {
    ...plan,
    variantId: previousPlan?.variantId ?? plan.variantId,
    sides: previousPlan?.sides ?? plan.sides,
    target: last.amount,
    loadIndex: last.loadIndex,
    weightKg: last.weightKg,
  };
  const symptoms =
    Object.values(previous.feedback).some((value) => value?.symptoms) ||
    Object.values(previous.checkins ?? {}).some((check) => check?.symptoms);
  const sides =
    base.sides ??
    (exercises[plan.exerciseId].perSide ? ['right', 'left'] : ['both']);
  const complete =
    !feedback?.skipped &&
    Array.from(
      { length: previousPlan?.sets ?? plan.sets },
      (_, i) => i + 1,
    ).every((n) =>
      sides.every((side) =>
        mine.some((log) => log.setNumber === n && log.side === side),
      ),
    );
  if (symptoms)
    return {
      ...base,
      explanation:
        'Besvär rapporterades. Ingen automatisk ökning; anpassa innan du startar.',
    };
  if (previous.programId === 'rehab')
    return {
      ...base,
      explanation:
        'Följ din överenskomna dosering. Rehab ökas inte automatiskt.',
    };
  if (
    complete &&
    mine.every(
      (log) =>
        log.amount >= (previousPlan?.target ?? plan.target) &&
        log.weightKg === last.weightKg &&
        log.loadIndex === last.loadIndex,
    ) &&
    plan.sets <= (previousPlan?.sets ?? plan.sets) &&
    feedback?.effort === 'easy' &&
    previous.checkins?.after?.feeling === 'good' &&
    !previous.checkins.after.symptoms &&
    exercises[plan.exerciseId].unit === 'reps' &&
    last.amount < exercises[plan.exerciseId].range.max
  ) {
    return {
      ...base,
      target: last.amount + 1,
      explanation:
        'Alla set klara, lätt ansträngning och inga rapporterade besvär efteråt: förslag +1 repetition.',
    };
  }
  return {
    ...base,
    explanation:
      'Samma nivå som senast. Vikt och antal kan anpassas före start.',
  };
}

export function trainingDayAfterDue(session: Session, today: string): boolean {
  if (
    !session.programId ||
    session.status !== 'completed' ||
    session.checkins?.dayAfter ||
    daysBetween(session.date, today) !== 1
  )
    return false;
  return (
    session.programId === 'rehab' ||
    Object.values(session.checkins ?? {}).some((check) => check?.symptoms) ||
    Object.values(session.feedback).some((feedback) => feedback?.symptoms)
  );
}
export function validateCheckin(
  check: unknown,
  timing?: 'before' | 'after' | 'dayAfter',
): check is TrainingCheckin {
  if (!check || typeof check !== 'object') return false;
  const value = check as Partial<TrainingCheckin>;
  const feelings =
    timing === 'before'
      ? ['ready', 'tired']
      : timing
        ? ['good', 'mixed', 'difficult']
        : ['ready', 'tired', 'good', 'mixed', 'difficult'];
  return (
    typeof value.feeling === 'string' &&
    feelings.includes(value.feeling) &&
    typeof value.recordedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value.recordedAt) &&
    Number.isFinite(Date.parse(value.recordedAt)) &&
    (value.symptoms === null ||
      (!!value.symptoms &&
        typeof value.symptoms === 'object' &&
        typeof value.symptoms.area === 'string' &&
        value.symptoms.area.trim().length > 0 &&
        value.symptoms.area.length <= 100 &&
        Number.isInteger(value.symptoms.score) &&
        value.symptoms.score >= 0 &&
        value.symptoms.score <= 10 &&
        ['right', 'left', 'both', 'unspecified'].includes(value.symptoms.side)))
  );
}
