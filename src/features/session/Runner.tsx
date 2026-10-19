import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { PAIN_COPY } from '../../content/copy';
import { exercises } from '../../content/exercises';
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
import {
  buildSteps,
  nextIndex,
  nextSetStep,
  resumeIndex,
} from '../../rules/sessionPlan';
import { Button } from '../../ui/Button';
import { Snackbar } from '../../ui/Snackbar';
import type { TallyItem } from '../../ui/Tally';
import { EffortScreen } from './EffortScreen';
import { RestScreen } from './RestScreen';
import { SetScreen } from './SetScreen';
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
  const [abortError, setAbortError] = useState(false);
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

  const runUndo = async () => {
    const s = snack;
    setSnack(null);
    if (!s) return;
    await s.undo();
    await resync();
  };

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
        if (count >= sidesOf(p.exerciseId)) complete += 1;
      }
      items.push({ id: p.exerciseId, remaining: p.sets - complete, active });
      done += complete;
      all += p.sets;
    });
    return { items, label: `${done} av ${all} set klara` };
  }, [session.plan, session.feedback, logs, steps, cursor]);

  const frame = {
    title: templates[session.templateId].name,
    stepId: cursor,
    clock: formatClock(seconds),
    tally,
    onAbort: () => setConfirmAbort(true),
    snack: snack ? (
      <Snackbar
        key={snack.key}
        message={snack.message}
        onUndo={runUndo}
        onExpire={expire}
      />
    ) : undefined,
  };

  const advance = (feedback = session.feedback) =>
    setCursor(nextIndex(steps, cursor, feedback));

  const finish = async () => {
    await finishSession(getDb(), session.id, new Date());
    navigate('/');
  };

  const abort = async () => {
    await abortSession(getDb(), session.id, new Date(), 'user');
    navigate('/');
  };

  const abortForKnee = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await abortSession(getDb(), session.id, new Date(), 'pain_stop');
      navigate(`/stopp/${session.id}`);
    } catch {
      setAbortError(true);
    } finally {
      setBusy(false);
    }
  };

  if (confirmAbort) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <h1 className="m-0 text-5xl leading-none font-extrabold">
            Avbryta passet?
          </h1>
          <p className="m-0 text-xl">Det du hunnit logga sparas.</p>
        </div>
        <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t-[3px] border-ink bg-paper px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={() => setConfirmAbort(false)}>
            Fortsätt passet
          </Button>
          <Button variant="secondary" onClick={abort}>
            Avbryt passet
          </Button>
          {abortError ? (
            <p role="alert" className="m-0 text-center text-base font-bold">
              {PAIN_COPY.error}
            </p>
          ) : null}
          <Button variant="secondary" disabled={busy} onClick={abortForKnee}>
            {PAIN_COPY.stopAbortKnee}
          </Button>
        </div>
      </div>
    );
  }

  if (!step && !hasAfter) {
    return <Redirect to={`/smarta/${session.id}/after`} />;
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
    return (
      <SetScreen
        key={cursor}
        frame={frame}
        exercise={ex}
        step={step}
        totalSets={total(step.planIndex)}
        initialAmount={prior?.amount ?? plan?.target ?? ex.range.start}
        initialLoadIndex={prior?.loadIndex ?? plan?.loadIndex ?? 0}
        busy={busy}
        onSkip={async () => {
          const db = getDb();
          await setFeedback(db, session.id, step.exerciseId, { skipped: true });
          advance({
            ...session.feedback,
            [step.exerciseId]: { skipped: true },
          });
          showSnack(`Hoppade över ${ex.name}`, () =>
            setFeedback(db, session.id, step.exerciseId, { skipped: false }),
          );
        }}
        onDone={async (amount, loadIndex) => {
          if (busy) return;
          setBusy(true);
          try {
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
              },
              new Date(),
            );
            tapFeedback();
            advance();
            showSnack(`Set ${step.setNumber} loggat`, async () => {
              await undoLastSet(db, session.id);
            });
          } finally {
            setBusy(false);
          }
        }}
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
      />
    );
  }

  const ex = exercises[step.exerciseId];
  return (
    <EffortScreen
      key={cursor}
      frame={frame}
      exercise={ex}
      onPick={async (effort: Effort) => {
        await setFeedback(getDb(), session.id, step.exerciseId, { effort });
        setSnack(null);
        advance({ ...session.feedback, [step.exerciseId]: { effort } });
      }}
    />
  );
}
