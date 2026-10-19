import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Redirect } from 'wouter';
import { getDb } from '../../db/db';
import { getSessionLogs, listPainLogsBySession } from '../../db/repo';
import { useElapsed } from '../../lib/useElapsed';
import { buttonClass } from '../../ui/Button';
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
  // The 'before' reading gates the session; 'after' gates the summary.
  if (!pain.some((p) => p.timing === 'before')) {
    return <Redirect to={`/smarta/${id}/before`} />;
  }
  return (
    <Runner
      session={session.s}
      logs={logs}
      hasAfter={pain.some((p) => p.timing === 'after')}
    />
  );
}
