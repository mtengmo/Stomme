import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { prescriptionText, reasonText } from '../../content/copy';
import { exercises } from '../../content/exercises';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { getActiveSession, getMeta, startSession } from '../../db/repo';
import type { TemplateId } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { interimPlan } from '../../rules/prescription';
import { programWeek } from '../../rules/schedule';
import { Banner } from '../../ui/Banner';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

/** #/pass/:id: today's prescription for the pass, then start (or continue). */
export function PassPreview({ id }: { id: TemplateId }) {
  const [, navigate] = useLocation();
  const [starting, setStarting] = useState(false);
  const data = useLiveQuery(async () => {
    const db = getDb();
    return {
      active: (await getActiveSession(db)) ?? null,
      program: (await getMeta<{ startDate: string }>(db, 'program')) ?? null,
    };
  }, []);
  if (data === undefined) return null;

  const template = templates[id];
  const today = toLocalDate(new Date());
  const week = data.program ? programWeek(data.program.startDate, today) : 1;
  const plan = interimPlan(template, week);
  const active = data.active;
  const other = active && active.templateId !== id;

  const start = async () => {
    if (active) {
      navigate(`/session/${active.id}`);
      return;
    }
    setStarting(true);
    const s = await startSession(getDb(), id, new Date());
    navigate(`/session/${s.id}`);
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
          Vecka {week} · {plan.reduce((n, p) => n + p.sets, 0)} set
        </p>
      </header>
      {other ? (
        <Banner>
          Du har {templates[active.templateId].name} igång. Fortsätt det först.
        </Banner>
      ) : null}
      <ol className="m-0 flex list-none flex-col p-0">
        {plan.map((p) => {
          const ex = exercises[p.exerciseId];
          return (
            <li key={p.exerciseId} className="border-b-2 border-edge py-3">
              <p className="m-0 text-lg leading-tight font-bold">{ex.name}</p>
              <p className="count m-0 mt-1 text-2xl text-ink">
                {prescriptionText(p, ex)}
              </p>
              <p className="m-0 text-base text-ink-soft">
                {reasonText(p.reason)}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="sticky bottom-[5.25rem] mt-auto">
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
