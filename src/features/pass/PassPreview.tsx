import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { resultLine, SEE_PHYSIO, suggestionReason } from '../../content/copy';
import { exercises } from '../../content/exercises';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import {
  getActiveSession,
  getMeta,
  planningData,
  startSession,
} from '../../db/repo';
import type { TemplateId } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { buildPlan } from '../../rules/nextPlan';
import { assessReading } from '../../rules/pain';
import { programWeek } from '../../rules/schedule';
import { Banner } from '../../ui/Banner';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { careState } from '../pain/careState';
import { StopBanner } from '../pain/PainNotices';

/** #/pass/:id: today's suggestion for the pass, then start (or continue). */
export function PassPreview({ id }: { id: TemplateId }) {
  const [, navigate] = useLocation();
  const [starting, setStarting] = useState(false);
  const data = useLiveQuery(async () => {
    const db = getDb();
    return {
      active: (await getActiveSession(db)) ?? null,
      program: (await getMeta<{ startDate: string }>(db, 'program')) ?? null,
      planning: await planningData(db),
    };
  }, []);
  if (data === undefined) return null;

  const template = templates[id];
  const today = toLocalDate(new Date());
  const week = data.program ? programWeek(data.program.startDate, today) : 1;
  const active = data.active;
  const before = active
    ? data.planning.painLogs.find(
        (p) => p.sessionId === active.id && p.timing === 'before',
      )
    : undefined;
  const computed = buildPlan(
    template,
    week,
    data.planning,
    before ? assessReading(before).status : 'ok',
    active?.id,
  );
  // An active session shows its stored snapshot, not a recompute.
  const snapshot = active?.templateId === id ? active.plan : undefined;
  const items = computed.map((i) => ({
    ...i,
    plan: snapshot?.find((p) => p.exerciseId === i.plan.exerciseId) ?? i.plan,
  }));
  const care = careState(data.planning.sessions, data.planning.painLogs, today);
  // The physio line once, as a banner: not per row, and not when a row's
  // reason text or the stop banner already says it.
  const physioOnce =
    items.some((i) => i.suggestion.seePhysio) &&
    !care.stopBanner &&
    !items.some((i) =>
      suggestionReason(i.suggestion, week).includes(SEE_PHYSIO),
    );
  const other = active && active.templateId !== id;

  const start = async () => {
    if (active) {
      navigate(`/session/${active.id}`);
      return;
    }
    setStarting(true);
    const s = await startSession(getDb(), id, new Date());
    navigate(`/smarta/${s.id}/before`);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-md flex-col gap-4 px-5 pt-3 pb-28">
      <Link
        href="/"
        className="-ml-2 flex min-h-12 items-center gap-1 self-start px-2 text-base font-bold text-ink no-underline"
      >
        <Icon name="back" />
        Veckan
      </Link>
      <header>
        <h1 className="m-0 text-6xl leading-none font-extrabold">
          {template.name}
        </h1>
        <p className="m-0 mt-2 text-base text-ink-soft">
          Vecka {week} · {items.reduce((n, i) => n + i.plan.sets, 0)} set
        </p>
      </header>
      {care.stopBanner ? <StopBanner /> : null}
      {physioOnce ? <Banner tone="care">{SEE_PHYSIO}.</Banner> : null}
      {other ? (
        <Banner>
          Du har {templates[active.templateId].name} igång. Fortsätt det först.
        </Banner>
      ) : null}
      <ol className="m-0 flex list-none flex-col p-0">
        {items.map(({ plan: p, suggestion, last }) => {
          const ex = exercises[p.exerciseId];
          return (
            <li key={p.exerciseId} className="border-b-2 border-edge py-3">
              <Link
                href={`/ovning/${ex.id}`}
                className="-my-1 block min-h-12 py-3.5 text-ink no-underline"
              >
                <span className="block text-lg leading-tight font-bold underline decoration-2 underline-offset-4">
                  {ex.name}
                </span>
              </Link>
              {last ? (
                <p className="m-0 mt-1 grid grid-cols-[7rem_1fr] items-baseline gap-2 text-base text-ink-soft">
                  <span>Förra gången</span>
                  <span className="count text-xl">
                    {resultLine(ex, last.sets, last.amount, last.loadIndex)}
                  </span>
                </p>
              ) : null}
              <p className="m-0 mt-1 grid grid-cols-[7rem_1fr] items-baseline gap-2 text-base font-bold">
                <span>Idag</span>
                <span className="count text-2xl">
                  {resultLine(ex, p.sets, p.target, p.loadIndex)}
                </span>
              </p>
              <p className="m-0 mt-1 text-base text-ink-soft">
                {suggestionReason(suggestion, week)}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="sticky bottom-[4.2rem] -mx-5 mt-auto border-t-[3px] border-ink bg-paper px-5 py-3">
        {active ? (
          <Button onClick={start}>Fortsätt passet</Button>
        ) : (
          <Button onClick={start} disabled={starting}>
            Starta pass
          </Button>
        )}
      </div>
    </div>
  );
}

export function UnknownPass() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-28">
      <h1 className="m-0 text-4xl font-bold">Passet finns inte</h1>
      <Link href="/" className={buttonClass('primary')}>
        Till veckan
      </Link>
    </div>
  );
}
