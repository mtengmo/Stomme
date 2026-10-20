import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { exerciseChoices, selectedTemplate } from '../../content/alternatives';
import {
  PAIN_COPY,
  resultLine,
  SEE_PHYSIO,
  suggestionReason,
} from '../../content/copy';
import { exercises } from '../../content/exercises';
import { primaryMuscleLabel } from '../../content/muscles';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import {
  getActiveSession,
  planningData,
  programStartDate,
  startSession,
} from '../../db/repo';
import type { ExerciseId, TemplateId } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { buildPlan } from '../../rules/nextPlan';
import { assessReading } from '../../rules/pain';
import { programWeek } from '../../rules/schedule';
import { Banner } from '../../ui/Banner';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { careState } from '../pain/careState';
import { StopBanner } from '../pain/PainNotices';
import { readChoiceDraft, writeChoiceDraft } from './selectionDraft';

/** #/pass/:id: today's suggestion for the pass, then start (or continue). */
export function PassPreview({ id }: { id: TemplateId }) {
  const [, navigate] = useLocation();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<
    Partial<Record<TemplateId, ExerciseId[]>>
  >(() => ({ A: readChoiceDraft('A'), B: readChoiceDraft('B') }));
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const data = useLiveQuery(async () => {
    const db = getDb();
    return {
      active: (await getActiveSession(db)) ?? null,
      program: await programStartDate(db),
      planning: await planningData(db),
    };
  }, []);
  if (data === undefined) return null;

  const template = templates[id];
  const today = toLocalDate(new Date());
  const active = data.active;
  const week =
    active?.templateId === id
      ? active.programWeek
      : data.program
        ? programWeek(data.program, today)
        : 1;
  const selected =
    selections[id] ?? template.items.map((item) => item.exerciseId);
  const adapted = selected.some(
    (exerciseId, slot) => exerciseId !== template.items[slot]?.exerciseId,
  );
  const snapshot = active?.templateId === id ? active.plan : undefined;
  const before = active
    ? data.planning.painLogs.find(
        (p) => p.sessionId === active.id && p.timing === 'before',
      )
    : undefined;
  const computed = buildPlan(
    snapshot
      ? {
          ...template,
          items: snapshot.map((item) => ({
            exerciseId: item.exerciseId,
            sets: item.sets,
            restSec: item.restSec,
          })),
        }
      : selectedTemplate(id, selected),
    week,
    data.planning,
    before ? assessReading(before).status : 'ok',
    active?.id,
  );
  // An active session shows its stored snapshot, not a recompute.
  const items = computed.map((item, slot) => {
    const stored = snapshot?.[slot];
    return stored
      ? {
          ...item,
          plan: stored,
          suggestion: {
            ...item.suggestion,
            reason: stored.reason,
            seePhysio:
              stored.reason === 'pain_stop_hold' ||
              (stored.reason === 'week1_bodyweight' &&
                item.suggestion.seePhysio),
          },
        }
      : item;
  });
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
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const s = await startSession(getDb(), id, new Date(), selected);
      writeChoiceDraft(id);
      navigate(`/smarta/${s.id}/before`);
    } catch {
      setError(PAIN_COPY.error);
      setStarting(false);
    }
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
      <Link
        href="/ovningar"
        className="flex min-h-12 items-center self-start text-base font-bold text-ink underline decoration-2 underline-offset-4"
      >
        Se alla övningar
      </Link>
      {care.stopBanner ? <StopBanner /> : null}
      {physioOnce ? <Banner tone="care">{SEE_PHYSIO}.</Banner> : null}
      {other ? (
        <Banner>
          Du har {templates[active.templateId].name} igång. Fortsätt det först.
        </Banner>
      ) : null}
      {!active ? (
        <div>
          <p className="m-0 text-base text-ink-soft">
            Du kan byta vissa övningar innan du startar. Smärtfrågorna gäller
            oavsett ditt val.
          </p>
          {adapted ? (
            <button
              type="button"
              disabled={starting}
              className="min-h-12 text-base font-bold underline decoration-2 underline-offset-4 disabled:opacity-50"
              onClick={() => {
                setSelections((current) => ({ ...current, [id]: undefined }));
                writeChoiceDraft(id);
                setEditingSlot(null);
              }}
            >
              Återställ passet
            </button>
          ) : null}
        </div>
      ) : null}
      <ol className="m-0 flex list-none flex-col p-0">
        {items.map(({ plan: p, suggestion, last }, slot) => {
          const ex = exercises[p.exerciseId];
          const choices = exerciseChoices(id, slot);
          return (
            <li
              key={snapshot ? p.exerciseId : template.items[slot]?.exerciseId}
              className="border-b-2 border-edge py-3"
            >
              <Link
                href={`/ovning/${ex.id}`}
                className="-my-1 block min-h-12 py-3.5 text-ink no-underline"
              >
                <span className="block text-lg leading-tight font-bold underline decoration-2 underline-offset-4">
                  {ex.name}
                </span>
              </Link>
              <p className="m-0 text-base text-ink-soft">
                Tränar främst: {primaryMuscleLabel(ex.id)}
              </p>
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
              {!active && choices.length > 1 ? (
                <>
                  <button
                    type="button"
                    disabled={starting}
                    aria-expanded={editingSlot === slot}
                    aria-controls={`exercise-choice-${id}-${slot}`}
                    className="min-h-12 text-base font-bold underline decoration-2 underline-offset-4 disabled:opacity-50"
                    onClick={() =>
                      setEditingSlot(editingSlot === slot ? null : slot)
                    }
                  >
                    {editingSlot === slot ? 'Stäng övningsval' : 'Byt övning'}
                  </button>
                  {editingSlot === slot ? (
                    <div id={`exercise-choice-${id}-${slot}`}>
                      <label
                        htmlFor={`exercise-select-${id}-${slot}`}
                        className="mb-2 block text-base font-bold"
                      >
                        Övning i moment {slot + 1}
                      </label>
                      <select
                        id={`exercise-select-${id}-${slot}`}
                        disabled={starting}
                        value={p.exerciseId}
                        className="min-h-12 w-full rounded-sm border-2 border-ink bg-paper px-3 text-base text-ink"
                        onChange={(event) => {
                          const next = [...selected];
                          next[slot] = event.target.value as ExerciseId;
                          selectedTemplate(id, next);
                          writeChoiceDraft(id, next);
                          setSelections((current) => ({
                            ...current,
                            [id]: next,
                          }));
                        }}
                      >
                        {choices.map((choice) => {
                          const used =
                            choice.exerciseId !== p.exerciseId &&
                            selected.includes(choice.exerciseId);
                          return (
                            <option
                              key={choice.exerciseId}
                              value={choice.exerciseId}
                              disabled={used}
                            >
                              {exercises[choice.exerciseId].name}
                              {used ? ' – finns redan i passet' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : null}
                </>
              ) : !active ? (
                <p className="m-0 mt-2 text-base text-ink-soft">
                  Inget byte i det här passet.
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="sticky bottom-[var(--app-nav-height)] -mx-5 mt-auto flex flex-col gap-2 border-t-[3px] border-ink bg-paper px-5 py-3">
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {error}
          </p>
        ) : null}
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
        Till träningen
      </Link>
    </div>
  );
}
