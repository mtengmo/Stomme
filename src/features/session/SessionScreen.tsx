import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { exerciseList } from '../../content/exercises';
import { getDb } from '../../db/db';
import { getSessionLogs, lastLogFor } from '../../db/repo';
import type { ExerciseId, SetLog } from '../../domain/types';
import { useElapsed } from '../../lib/useElapsed';
import { buttonClass } from '../../ui/Button';
import { Runner } from './Runner';
import { Summary } from './Summary';

/** Last logged set per exercise, read once when the session screen opens. */
function usePriorLogs(ready: boolean) {
  const [last, setLast] = useState<
    Partial<Record<ExerciseId, SetLog>> | undefined
  >(undefined);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void Promise.all(
      exerciseList.map(
        async (e) => [e.id, await lastLogFor(getDb(), e.id)] as const,
      ),
    ).then((pairs) => {
      if (cancelled) return;
      const m: Partial<Record<ExerciseId, SetLog>> = {};
      for (const [id, l] of pairs) if (l) m[id] = l;
      setLast(m);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return last;
}

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

/** #/session/:id: the running session, or the summary of a finished one. */
export function SessionScreen({ id }: { id: string }) {
  const session = useLiveQuery(
    async () => ({ s: await getDb().sessions.get(id) }),
    [id],
  );
  const logs = useLiveQuery(() => getSessionLogs(getDb(), id), [id]);
  const open = session?.s?.status === 'in_progress';
  // Prefill is read once, before the runner mounts, so it ignores this session's own sets.
  const last = usePriorLogs(open);

  if (session === undefined || logs === undefined) return null;
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
  if (last === undefined) return null;
  return <Runner session={session.s} logs={logs} last={last} />;
}
