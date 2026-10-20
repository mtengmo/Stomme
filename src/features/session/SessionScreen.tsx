import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { PAIN_COPY } from '../../content/copy';
import { getDb } from '../../db/db';
import {
  abortSession,
  getSessionLogs,
  listPainLogsBySession,
  replanSession,
} from '../../db/repo';
import type { PainLog, Session, SetLog } from '../../domain/types';
import { useElapsed } from '../../lib/useElapsed';
import { assessReading } from '../../rules/pain';
import { Button, buttonClass } from '../../ui/Button';
import { Runner } from './Runner';
import { Summary } from './Summary';

function Finished({ id }: { id: string }) {
  const session = useLiveQuery(() => getDb().sessions.get(id), [id]);
  const logs = useLiveQuery(() => getSessionLogs(getDb(), id), [id]);
  const seconds = useElapsed(
    session?.startedAt ?? new Date().toISOString(),
    session?.finishedAt,
  );
  if (!session || !logs) return null;
  return <Summary session={session} logs={logs} seconds={seconds} />;
}

/**
 * The running session. Defence in depth: the stored 'before' reading is
 * assessed again on load (stop aborts, warn without sets replans).
 */
function Open({
  session,
  logs,
  pain,
}: {
  session: Session;
  logs: SetLog[];
  pain: PainLog[];
}) {
  const [, navigate] = useLocation();
  const before = pain.find((p) => p.timing === 'before');
  const status = before ? assessReading(before).status : 'ok';
  const handled = useRef(false);
  const stopped = status === 'stop';
  const replan = status === 'warn' && logs.length === 0;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-triggers the effect on retry
  useEffect(() => {
    if (handled.current || (!stopped && !replan)) return;
    handled.current = true;
    void (async () => {
      const db = getDb();
      try {
        if (stopped) {
          await abortSession(db, session.id, new Date(), 'pain_stop');
          navigate(`/stopp/${session.id}`);
        } else {
          await replanSession(db, session.id);
        }
      } catch {
        // Let the user retry instead of leaving a blank screen.
        handled.current = false;
        setFailed(true);
      }
    })();
  }, [stopped, replan, session.id, navigate, attempt]);

  if (failed && (stopped || replan)) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-10">
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Något gick fel
        </h1>
        <p role="alert" className="m-0 text-xl font-bold">
          {PAIN_COPY.error}
        </p>
        <Button
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          Försök igen
        </Button>
        <Link href="/" className={buttonClass('secondary')}>
          Till veckan
        </Link>
      </div>
    );
  }

  if (stopped) return null;
  return (
    <Runner
      session={session}
      logs={logs}
      hasAfter={pain.some((p) => p.timing === 'after')}
    />
  );
}

/** #/session/:id: the running session, or the summary of a finished one. */
export function SessionScreen({ id }: { id: string }) {
  const session = useLiveQuery(
    async () => ({ s: await getDb().sessions.get(id) }),
    [id],
  );
  const logs = useLiveQuery(() => getSessionLogs(getDb(), id), [id]);
  const pain = useLiveQuery(() => listPainLogsBySession(getDb(), id), [id]);
  const open = session?.s?.status === 'in_progress';

  if (session === undefined || logs === undefined || pain === undefined)
    return null;
  if (!session.s) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-10">
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Passet finns inte
        </h1>
        <Link href="/" className={buttonClass('primary')}>
          Till veckan
        </Link>
      </div>
    );
  }
  if (!open) return <Finished id={id} />;
  if (session.s.programId) {
    if (!session.s.checkins?.before)
      return <Redirect to={`/kansla/${id}/before`} />;
    return (
      <Runner
        session={session.s}
        logs={logs}
        hasAfter={!!session.s.checkins?.after}
      />
    );
  }
  // The 'before' reading gates the session; 'after' gates the summary.
  if (!pain.some((p) => p.timing === 'before') && logs.length === 0) {
    return <Redirect to={`/smarta/${id}/before`} />;
  }
  return <Open session={session.s} logs={logs} pain={pain} />;
}
