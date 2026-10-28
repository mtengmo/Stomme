import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { TIMEOUT_NOTICE } from '../../content/copy';
import { getDb } from '../../db/db';
import { listSessions } from '../../db/repo';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';

export const TIMEOUT_SEEN_KEY = 'stomme.timeoutNotice.seen';

function seenId(): string | null {
  try {
    return window.localStorage.getItem(TIMEOUT_SEEN_KEY);
  } catch {
    return null;
  }
}

/** The plain notice, used where the session itself is on screen. */
export function TimeoutBanner() {
  return <Banner>{TIMEOUT_NOTICE}</Banner>;
}

/**
 * Dismissible notice on the home screens for the newest session ended by
 * the idle timeout. The dismissed session id is remembered in localStorage.
 */
export function TimeoutNotice() {
  const latest = useLiveQuery(
    async () =>
      (await listSessions(getDb())).find((s) => s.abortReason === 'timeout'),
    [],
  );
  const [dismissed, setDismissed] = useState<string | null>(seenId);
  if (
    !latest ||
    latest.abortReason !== 'timeout' ||
    latest.status !== 'aborted'
  )
    return null;
  if (dismissed === latest.id) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(TIMEOUT_SEEN_KEY, latest.id);
    } catch {
      // Private mode: the notice just comes back next time.
    }
    setDismissed(latest.id);
  };
  return (
    <Banner>
      <p className="m-0">{TIMEOUT_NOTICE}</p>
      <Button variant="secondary" className="mt-2" onClick={dismiss}>
        Okej
      </Button>
    </Banner>
  );
}
