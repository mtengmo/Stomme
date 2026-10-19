import { useState } from 'react';
import { PAIN_COPY } from '../../content/copy';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { deleteSession } from '../../db/history';
import { finishSession } from '../../db/repo';
import type { Session } from '../../domain/types';
import { formatShortDate } from '../../lib/dates';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';

/** An in-progress session from an earlier day: finish it or throw it away. */
export function StaleSession({ session }: { session: Session }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Banner>
      <p className="m-0 font-bold">
        {templates[session.templateId].name} från{' '}
        {formatShortDate(session.date)} är inte avslutat.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(() => finishSession(getDb(), session.id, new Date()))
          }
        >
          Avsluta passet
        </Button>
        {confirmDiscard ? (
          <Button
            disabled={busy}
            onClick={() => run(() => deleteSession(getDb(), session.id))}
          >
            Ja, släng passet
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirmDiscard(true)}
          >
            Släng passet
          </Button>
        )}
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {PAIN_COPY.error}
          </p>
        ) : null}
      </div>
    </Banner>
  );
}
