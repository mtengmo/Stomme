import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { PAIN_COPY } from '../../content/copy';
import { exercises } from '../../content/exercises';
import { programmeNames } from '../../content/programmes';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import {
  abortSession,
  finishSession,
  getSessionLogs,
  logSet,
  setFeedback,
  undoLastSet,
} from '../../db/repo';
import type { Effort, ExerciseId, Session, SetLog } from '../../domain/types';
import { formatClock } from '../../lib/format';
import { tapFeedback } from '../../lib/haptics';
import { useElapsed } from '../../lib/useElapsed';
import { createWakeLock } from '../../lib/wakeLock';
import { prefillAmount } from '../../rules/repTempo';
import {
  buildSteps,
  nextIndex,
  nextSetStep,
  resumeIndex,
} from '../../rules/sessionPlan';
import { Button } from '../../ui/Button';
import { Snackbar } from '../../ui/Snackbar';
import type { TallyItem } from '../../ui/Tally';
import { ExerciseSymptoms } from '../training/Checkin';
import { EffortScreen } from './EffortScreen';
import { RestScreen } from './RestScreen';
import { type CountInfo, SetScreen } from './SetScreen';
import { Summary } from './Summary';

interface RunnerProps {
  session: Session;
  logs: SetLog[];
  /** The 'after' pain reading is in; until then the end of the plan leads to it. */
  hasAfter: boolean;
}

interface Snack {
  key: number;
  message: string;
  undo(): Promise<void>;
}

function sidesOf(id: ExerciseId): number {
  return exercises[id].perSide ? 2 : 1;
}

/** The session state machine: one cursor over the steps derived from the plan. */
export function Runner({ session, logs, hasAfter }: RunnerProps) {
  const [, navigate] = useLocation();
  const steps = useMemo(
    () => buildSteps(session.plan, (id) => exercises[id]),
    [session.plan],
  );
  const [cursor, setCursor] = useState(() =>
    resumeIndex(steps, logs, session.feedback),
  );
  const [snack, setSnack] = useState<Snack | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [timedExercise, setTimedExercise] = useState<ExerciseId | null>(null);
  const [restEffort, setRestEffort] = useState<Effort | undefined>();
  const snackKey = useRef(0);
  const seconds = useElapsed(session.startedAt);

  useEffect(() => {
    const lock = createWakeLock();
    void lock.acquire();
    return () => void lock.release();
  }, []);

  const expire = useCallback(() => setSnack(null), []);
  const showSnack = (message: string, undo: () => Promise<void>) => {
    snackKey.current += 1;
    setSnack({ key: snackKey.current, message, undo });
  };

  /** Re-derives the cursor from the database after an undo. */
  const resync = async () => {
    const db = getDb();
    const [fresh, l] = await Promise.all([
      db.sessions.get(session.id),
      getSessionLogs(db, session.id),
    ]);
    setCursor(resumeIndex(steps, l, fresh?.feedback ?? {}));
  };

  /** One write at a time; a failure shows a Swedish alert instead of a dead screen. */
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await fn();
    } catch {
      setTimedExercise(null);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const runUndo = () =>
    run(async () => {
      setTimedExercise(null);
      const s = snack;
      setSnack(null);
      if (!s) return;
      await s.undo();
      await resync();
    });

  const step = steps[cursor];
  const total = (planIndex: number) => session.plan[planIndex]?.sets ?? 0;

  const tally = useMemo(() => {
    const items: TallyItem[] = [];
    let done = 0;
    let all = 0;
    session.plan.forEach((p) => {
      const active = steps[cursor]?.exerciseId === p.exerciseId;
      if (session.feedback[p.exerciseId]?.skipped) {
        items.push({
          id: p.exerciseId,
          remaining: 0,
          skipped: true,
          active,
        });
        return;
      }
      let complete = 0;
      for (let n = 1; n <= p.sets; n++) {
        const count = logs.filter(
          (l) => l.exerciseId === p.exerciseId && l.setNumber === n,
        ).length;
        if (count >= (p.sides?.length ?? sidesOf(p.exerciseId))) complete += 1;
      }
      items.push({ id: p.exerciseId, remaining: p.sets - complete, active });
      done += complete;
      all += p.sets;
    });
    return { items, label: `${done} av ${all} set klara` };
  }, [session.plan, session.feedback, logs, steps, cursor]);

  const frame = {
    title:
      session.customWorkoutName ??
      (session.programId
        ? `${session.workoutMode === 'short' ? 'Kortpass · ' : ''}${programmeNames[session.programId]} · ${session.templateId}`
        : templates[session.templateId].name),
    stepId: cursor,
    clock: formatClock(seconds),
    tally,
    onAbort: () => {
      setTimedExercise(null);
      setConfirmAbort(true);
    },
    snack:
      snack || error ? (
        <>
          {error ? (
            <p
              role="alert"
              className="m-0 border-t-[3px] border-ink bg-surface-tint px-5 py-2 text-base font-bold text-ink"
            >
              {PAIN_COPY.error}
            </p>
          ) : null}
          {snack ? (
            <Snackbar
              key={snack.key}
              message={snack.message}
              onUndo={runUndo}
              onExpire={expire}
            />
          ) : null}
        </>
      ) : undefined,
  };

  const advance = (feedback = session.feedback) =>
    setCursor(nextIndex(steps, cursor, feedback));

  const finish = () =>
    run(async () => {
      await finishSession(getDb(), session.id, new Date());
      navigate('/');
    });

  const abort = () =>
    run(async () => {
      await abortSession(getDb(), session.id, new Date(), 'user');
      navigate('/');
    });

  const abortForPain = () =>
    run(async () => {
      await abortSession(getDb(), session.id, new Date(), 'pain_stop');
      navigate(`/stopp/${session.id}`);
    });

  if (confirmAbort) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <h1 className="m-0 text-5xl leading-none font-extrabold">
            Avbryta passet?
          </h1>
          <p className="m-0 text-xl">Det du hunnit logga sparas.</p>
        </div>
        <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t-[3px] border-ink bg-surface-tint px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={() => setConfirmAbort(false)}>
            Fortsätt passet
          </Button>
          <Button variant="secondary" disabled={busy} onClick={abort}>
            Avbryt passet
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={abortForPain}
            aria-describedby="pain-abort-hint"
          >
            {PAIN_COPY.stopAbortPain}
          </Button>
          <p id="pain-abort-hint" className="m-0 text-center text-base">
            {PAIN_COPY.stopAbortPainHint}
          </p>
          {error ? (
            <p role="alert" className="m-0 text-center text-base font-bold">
              {PAIN_COPY.error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!step && !hasAfter) {
    return (
      <Redirect
        to={
          session.programId
            ? `/kansla/${session.id}/after`
            : `/smarta/${session.id}/after`
        }
      />
    );
  }

  if (!step) {
    return (
      <Summary
        session={session}
        logs={logs}
        seconds={seconds}
        onFinish={finish}
        snack={frame.snack}
      />
    );
  }

  if (step.kind === 'set') {
    const ex = exercises[step.exerciseId];
    const plan = session.plan[step.planIndex];
    const mine = logs
      .filter((l) => l.exerciseId === step.exerciseId)
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
      .at(-1);
    // The suggestion in the plan is the prefill; what the user logs becomes the base.
    const prior = mine;
    if (reporting && session.programId)
      return (
        <div className="mx-auto flex max-w-md flex-col gap-4 px-5 py-6">
          <ExerciseSymptoms
            onCancel={() => setReporting(false)}
            onSave={async (symptoms) => {
              await setFeedback(getDb(), session.id, step.exerciseId, {
                symptoms,
              });
              setReporting(false);
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              setReporting(false);
              setConfirmAbort(true);
            }}
          >
            Avbryt passet
          </Button>
        </div>
      );
    return (
      <SetScreen
        key={cursor}
        frame={frame}
        exercise={ex}
        step={step}
        totalSets={total(step.planIndex)}
        initialAmount={prefillAmount(prior, plan?.target ?? ex.range.start)}
        initialLoadIndex={prior?.loadIndex ?? plan?.loadIndex ?? 0}
        initialWeightKg={
          session.programId ? (prior?.weightKg ?? plan?.weightKg) : undefined
        }
        variantId={prior?.variantId ?? plan?.variantId}
        singleSide={plan?.sides?.length === 1}
        autoStartTimer={timedExercise === ex.id}
        onStartTimer={() => setTimedExercise(ex.id)}
        onCancelTimer={() => setTimedExercise(null)}
        onReportSymptoms={
          session.programId
            ? () => {
                setTimedExercise(null);
                setReporting(true);
              }
            : undefined
        }
        symptomReported={!!session.feedback[step.exerciseId]?.symptoms}
        busy={busy}
        onSkip={() =>
          run(async () => {
            setTimedExercise(null);
            const db = getDb();
            await setFeedback(db, session.id, step.exerciseId, {
              skipped: true,
            });
            advance({
              ...session.feedback,
              [step.exerciseId]: { skipped: true },
            });
            showSnack(`Hoppade över ${ex.name}`, () =>
              setFeedback(db, session.id, step.exerciseId, { skipped: false }),
            );
          })
        }
        onDone={(amount, loadIndex, weightKg, info?: CountInfo) =>
          run(async () => {
            // An early stop must not roll on into an automatic rest and next set.
            if (info?.endedEarly) setTimedExercise(null);
            const db = getDb();
            await logSet(
              db,
              session.id,
              {
                exerciseId: step.exerciseId,
                setNumber: step.setNumber,
                side: step.side,
                amount,
                loadIndex,
                weightKg,
                ...info,
              },
              new Date(),
            );
            tapFeedback();
            advance();
            showSnack(`Set ${step.setNumber} loggat`, async () => {
              await undoLastSet(db, session.id);
            });
          })
        }
      />
    );
  }

  if (step.kind === 'rest') {
    const upcoming = nextSetStep(steps, cursor + 1, session.feedback);
    return (
      <RestScreen
        key={cursor}
        frame={frame}
        restSec={step.restSec}
        nextExercise={upcoming ? exercises[upcoming.exerciseId] : undefined}
        nextStep={upcoming}
        nextTotalSets={upcoming ? total(upcoming.planIndex) : 0}
        onContinue={() => advance()}
        afterSet={steps[cursor - 1]?.kind === 'set'}
        autoContinue={
          timedExercise === step.exerciseId &&
          upcoming?.exerciseId === step.exerciseId
        }
      />
    );
  }

  const ex = exercises[step.exerciseId];
  const following = steps[cursor + 1];
  if (following?.kind === 'rest') {
    const upcoming = nextSetStep(steps, cursor + 2, session.feedback);
    return (
      <RestScreen
        key={cursor}
        frame={frame}
        restSec={following.restSec}
        nextExercise={upcoming ? exercises[upcoming.exerciseId] : undefined}
        nextStep={upcoming}
        nextTotalSets={upcoming ? total(upcoming.planIndex) : 0}
        onContinue={() => {
          void run(async () => {
            if (!restEffort)
              await setFeedback(getDb(), session.id, step.exerciseId, {
                effortSkipped: true,
              });
            setRestEffort(undefined);
            setCursor(cursor + 2);
          });
        }}
        afterSet
        effortExercise={ex}
        effort={restEffort}
        onEffort={(effort) => {
          setRestEffort(effort);
          void run(async () => {
            await setFeedback(getDb(), session.id, step.exerciseId, { effort });
          });
        }}
      />
    );
  }
  return (
    <EffortScreen
      key={cursor}
      frame={frame}
      exercise={ex}
      onPick={(effort: Effort) =>
        run(async () => {
          setTimedExercise(null);
          await setFeedback(getDb(), session.id, step.exerciseId, { effort });
          setSnack(null);
          advance({ ...session.feedback, [step.exerciseId]: { effort } });
        })
      }
    />
  );
}
