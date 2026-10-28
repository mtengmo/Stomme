import { Link } from 'wouter';
import { EFFORT_LABEL, UNIT_WORD } from '../../content/copy';
import { exercises } from '../../content/exercises';
import { programmeNames } from '../../content/programmes';
import { templates } from '../../content/templates';
import type { Session, SetLog } from '../../domain/types';
import { formatMinutes } from '../../lib/format';
import { Button, buttonClass } from '../../ui/Button';
import { PencilTick } from '../../ui/PencilTick';
import { SummaryNextLevel } from '../training/NextLevelSuggestions';
import { ShortWorkoutNotice } from './ShortWorkoutNotice';
import { TimeoutBanner } from './TimeoutNotice';
import { WorkoutEquipmentNotice } from './WorkoutEquipmentNotice';

interface SummaryProps {
  session: Session;
  logs: SetLog[];
  seconds: number;
  /** Set while the session is still open: shows the finishing button. */
  onFinish?: () => void;
  snack?: React.ReactNode;
}

/** What got done: time, sets, and one line per exercise. */
export function Summary({
  session,
  logs,
  seconds,
  onFinish,
  snack,
}: SummaryProps) {
  const aborted = session.status === 'aborted';
  const planned = session.plan.reduce((n, p) => n + p.sets, 0);
  const setsDone = new Set(logs.map((l) => `${l.exerciseId}:${l.setNumber}`))
    .size;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <div className="flex flex-1 flex-col gap-4 pt-6 pb-4">
        <h1 className="m-0 text-6xl leading-none font-extrabold">
          {aborted
            ? 'Passet avbröts'
            : `${session.customWorkoutName ?? templates[session.templateId].name} klart`}
        </h1>
        <p className="count m-0 text-4xl text-ink">
          {formatMinutes(seconds)} · {setsDone}/{planned} set
        </p>
        {session.abortReason === 'timeout' ? <TimeoutBanner /> : null}
        <ShortWorkoutNotice session={session} />
        <WorkoutEquipmentNotice session={session} />
        <ul className="m-0 flex list-none flex-col p-0">
          {session.programId ? (
            <li className="pb-3 text-lg font-bold">
              {programmeNames[session.programId]}
            </li>
          ) : null}
          {session.plan.map((p, i) => {
            const ex = exercises[p.exerciseId];
            const fb = session.feedback[p.exerciseId];
            const mine = logs.filter((l) => l.exerciseId === p.exerciseId);
            const amounts = [...new Set(mine.map((l) => l.amount))];
            const done =
              !fb?.skipped &&
              new Set(mine.map((l) => l.setNumber)).size >= p.sets;
            const kg = mine.at(-1)?.weightKg ?? 0;
            const detail = fb?.skipped
              ? 'Hoppade över'
              : mine.length === 0
                ? 'Inte gjord'
                : `${amounts.join('/')} ${UNIT_WORD[ex.unit]}${kg > 0 ? ` · ${kg} kg` : ''}`;
            return (
              <li
                key={p.exerciseId}
                className="flex items-center gap-3 border-b-2 border-edge py-2"
              >
                <span className="grid size-10 shrink-0 place-items-center">
                  {done ? <PencilTick size={34} variant={i} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-tight font-bold">
                    {ex.name}
                  </span>
                  <span className="block text-base text-ink-soft">
                    {detail}
                  </span>
                </span>
                {fb?.effort ? (
                  <span className="text-lg font-bold">
                    {EFFORT_LABEL[fb.effort]}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <SummaryNextLevel session={session} />
      </div>
      <div className="sticky bottom-0 -mx-5 flex flex-col">
        {snack}
        <div className="flex flex-col gap-2 border-t-[3px] border-ink bg-surface-tint px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {onFinish ? (
            <Button onClick={onFinish}>Avsluta pass</Button>
          ) : (
            <>
              {session.programId &&
              session.status === 'completed' &&
              !session.checkins?.after ? (
                <Link
                  href={`/kansla/${session.id}/after`}
                  className={buttonClass('secondary')}
                >
                  Svara på hur passet kändes
                </Link>
              ) : null}
              <Link href="/" className={buttonClass('primary')}>
                Till träningen
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
