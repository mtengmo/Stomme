import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Redirect } from 'wouter';
import { getDb } from '../../db/db';
import { getSessionLogs } from '../../db/repo';
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
  const open = session?.s?.status === 'in_progress';

  if (session === undefined || logs === undefined) return null;
  if (!session.s) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-10">
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Passet finns inte
        </h1>
        <Link href="/" className={buttonClass('primary')}>
          Till träningen
        </Link>
      </div>
    );
  }
  if (!open) return <Finished id={id} />;
  // Rehab answers the check-in before the first set; regular training has none.
  if (session.s.programId === 'rehab' && !session.s.checkins?.before)
    return <Redirect to={`/kansla/${id}/before`} />;
  return (
    <Runner
      session={session.s}
      logs={logs}
      hasAfter={
        // Regular training has no "after" question; only rehab does.
        session.s.programId !== 'rehab' || !!session.s.checkins?.after
      }
    />
  );
}
