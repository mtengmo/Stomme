import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import { deleteSession } from '../../db/history';
import type { ExerciseId, PainLog, SetLog } from '../../domain/types';
import { formatLongDate } from '../../lib/dates';
import { formatMinutes } from '../../lib/format';
import { Banner } from '../../ui/Banner';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { amountText, EFFORT_LABEL, kgText, StatusChip } from './labels';

const TIMING: Record<PainLog['timing'], string> = {
  before: 'Före',
  after: 'Efter',
  dayAfter: 'Dagen efter',
};
const TIMING_ORDER: PainLog['timing'][] = ['before', 'after', 'dayAfter'];
const SIDE: Record<SetLog['side'], string> = {
  right: 'höger',
  left: 'vänster',
  both: '',
};

async function load(id: string) {
  const db = getDb();
  const session = await db.sessions.get(id);
  const setLogs = await db.setLogs.where('sessionId').equals(id).toArray();
  const painLogs = await db.painLogs.where('sessionId').equals(id).toArray();
  return { session, setLogs, painLogs };
}

function BackLink() {
  return (
    <Link
      href="/historik"
      className="inline-flex min-h-12 items-center gap-1 self-start text-base font-bold text-ink"
    >
      <Icon name="back" />
      Historik
    </Link>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const data = useLiveQuery(() => load(id), [id]);
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!data) return null;
  const { session, setLogs, painLogs } = data;

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-28">
        <BackLink />
        <h1 className="m-0 text-5xl font-extrabold">Passet finns inte</h1>
        <p className="m-0 text-xl">
          Sidan är riven ur boken. Kanske raderades passet.
        </p>
        <Link href="/historik" className={buttonClass('secondary')}>
          Till historiken
        </Link>
      </div>
    );
  }

  const order = session.plan.map((p) => p.exerciseId);
  const present = [...new Set(setLogs.map((l) => l.exerciseId))].sort(
    (a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    },
  );
  const pain = TIMING_ORDER.flatMap((t) =>
    painLogs.filter((p) => p.timing === t),
  );
  const duration =
    session.finishedAt && session.status === 'completed'
      ? formatMinutes(
          (Date.parse(session.finishedAt) - Date.parse(session.startedAt)) /
            1000,
        )
      : null;

  async function remove() {
    try {
      await deleteSession(getDb(), id);
      navigate('/historik', { replace: true });
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-5 pt-4 pb-28">
      <BackLink />
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-5xl font-extrabold">
          Pass {session.templateId}
        </h1>
        <p className="m-0 text-xl">
          {formatLongDate(session.date)}
          {duration ? ` · ${duration}` : ''}
        </p>
        <div>
          <StatusChip session={session} />
        </div>
      </header>

      <section className="flex flex-col gap-4" aria-label="Set">
        <h2 className="m-0 text-3xl font-bold">Set</h2>
        {present.length === 0 ? (
          <p className="m-0 text-base text-ink-soft">
            Inga set hann skrivas upp i det här passet.
          </p>
        ) : (
          present.map((exId) => (
            <ExerciseSets
              key={exId}
              exerciseId={exId}
              logs={setLogs.filter((l) => l.exerciseId === exId)}
              effort={session.feedback[exId]?.effort}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label="Smärta">
        <h2 className="m-0 text-3xl font-bold">Smärta i högerknäet</h2>
        {pain.length === 0 ? (
          <p className="m-0 text-base text-ink-soft">
            Ingen smärta antecknad för det här passet.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pain.map((p) => {
              const flags = [
                p.redFlags.sharp ? 'skarp smärta' : null,
                p.redFlags.swelling ? 'svullnad' : null,
                p.redFlags.locking ? 'låsning' : null,
              ].filter(Boolean);
              return (
                <li
                  key={p.id}
                  className="flex items-baseline justify-between gap-3 border-b-2 border-edge pb-2 text-base"
                >
                  <span>
                    {TIMING[p.timing]}
                    {flags.length > 0 ? (
                      <span className="text-ink-soft">
                        {' '}
                        · {flags.join(', ')}
                      </span>
                    ) : null}
                  </span>
                  <span className="count text-3xl leading-none">
                    {p.score}
                    <span className="text-base font-normal text-ink-soft">
                      {' '}
                      av 10
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {session.note ? (
        <section className="flex flex-col gap-2" aria-label="Anteckning">
          <h2 className="m-0 text-3xl font-bold">Anteckning</h2>
          <p className="m-0 whitespace-pre-wrap text-xl">{session.note}</p>
        </section>
      ) : null}

      <section className="mt-6 flex flex-col gap-3" aria-label="Radera">
        {confirming ? (
          <>
            <Banner tone="warn">
              Radera passet? Alla set och smärtvärden för det här passet tas
              bort. Det går inte att ångra.
            </Banner>
            {failed ? (
              <Banner tone="warn">
                Det gick inte att radera. Inget har tagits bort, försök igen.
              </Banner>
            ) : null}
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Behåll passet
            </Button>
            <Button onClick={remove}>Ja, radera passet</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Radera passet
          </Button>
        )}
      </section>
    </div>
  );
}

function ExerciseSets({
  exerciseId,
  logs,
  effort,
}: {
  exerciseId: ExerciseId;
  logs: SetLog[];
  effort?: 'easy' | 'ok' | 'hard';
}) {
  const ex = exercises[exerciseId];
  const setNumbers = [...new Set(logs.map((l) => l.setNumber))].sort(
    (a, b) => a - b,
  );
  return (
    <div className="flex flex-col gap-2 rounded-md border-2 border-edge bg-paper p-4">
      <h3 className="m-0 flex flex-wrap items-baseline justify-between gap-x-3 text-xl font-bold">
        <Link href={`/ovning/${exerciseId}`} className="text-ink">
          {ex.name}
        </Link>
        {effort ? (
          <span className="text-base font-normal text-ink-soft">
            {EFFORT_LABEL[effort]}
          </span>
        ) : null}
      </h3>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {setNumbers.map((n) => {
          const row = logs
            .filter((l) => l.setNumber === n)
            .sort((a, b) => a.side.localeCompare(b.side));
          const first = row[0];
          return (
            <li key={n} className="flex flex-col text-base">
              <span className="text-ink-soft">
                Set {n}
                {first ? ` · ${kgText(first.weightKg)}` : ''}
              </span>
              <span className="flex flex-wrap gap-x-5">
                {row.map((l) => (
                  <span key={l.id}>
                    <span className="count text-2xl">
                      {amountText(l.amount, ex.unit)}
                    </span>
                    {SIDE[l.side] ? ` ${SIDE[l.side]}` : ''}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
