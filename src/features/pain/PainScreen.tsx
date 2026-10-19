import { type ReactNode, useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { PAIN_COPY } from '../../content/copy';
import { getDb } from '../../db/db';
import {
  abortSession,
  addWallSit,
  listPainLogsBySession,
  recordPainReading,
} from '../../db/repo';
import type { PainLog, PainReason, Session } from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { isValidScore, shouldPromptDayAfter } from '../../rules/pain';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export type PainTiming = PainLog['timing'];

export function isTiming(v: string): v is PainTiming {
  return v === 'before' || v === 'after' || v === 'dayAfter';
}

type Flags = PainLog['redFlags'];
const NO_FLAGS: Flags = { sharp: false, swelling: false, locking: false };
const FLAG_KEYS: (keyof Flags)[] = ['sharp', 'swelling', 'locking'];

/** Fixed bottom area for the primary action, in thumb reach. */
function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t-[3px] border-ink bg-paper px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      {children}
    </div>
  );
}

/** 0-10 as eleven 48 px+ radio buttons with word anchors at both ends. */
function ScorePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange(n: number): void;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="sr-only">{PAIN_COPY.scoreLabel}</legend>
      <p className="m-0 text-base font-bold text-ink-soft">
        0 · {PAIN_COPY.anchorLow}
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 11 }, (_, n) => n).map((n) => {
          const on = value === n;
          return (
            <label key={n} className="block cursor-pointer">
              <input
                type="radio"
                name="pain-score"
                value={n}
                checked={on}
                onChange={() => onChange(n)}
                aria-label={
                  n === 0
                    ? `0, ${PAIN_COPY.anchorLow.toLowerCase()}`
                    : n === 10
                      ? `10, ${PAIN_COPY.anchorHigh.toLowerCase()}`
                      : String(n)
                }
                className="peer sr-only"
              />
              <span
                className={`count grid h-14 min-w-12 place-items-center rounded-md border-[3px] border-ink text-3xl transition-transform duration-150 ease-out peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-blue active:scale-[0.96] ${
                  on ? 'bg-ink text-paper' : 'bg-paper text-ink'
                }`}
              >
                {n}
              </span>
            </label>
          );
        })}
      </div>
      <p className="m-0 text-right text-base font-bold text-ink-soft">
        10 · {PAIN_COPY.anchorHigh}
      </p>
    </fieldset>
  );
}

function Toggle({
  label,
  on,
  onToggle,
  size = 'text-xl',
}: {
  label: string;
  on: boolean;
  onToggle(): void;
  size?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-md bg-paper px-4 text-left text-ink transition-transform duration-150 ease-out active:scale-[0.98] ${size} ${
        on ? 'border-[3px] border-ink font-bold' : 'border-2 border-edge'
      }`}
    >
      <span>{label}</span>
      <span className="flex shrink-0 items-center gap-1.5 text-base font-bold">
        <Icon name={on ? 'check' : 'minus'} size={20} />
        {on ? PAIN_COPY.yes : PAIN_COPY.no}
      </span>
    </button>
  );
}

type Outcome =
  | { kind: 'stop' }
  | { kind: 'warn'; wallSit: boolean; reasons: PainReason[] }
  | undefined;

/** Stop screen: an ink field with paper text (no red), clearly unlike the warn screen. */
export function StopScreen({
  dayAfter = false,
  afterSession = false,
  onHome,
}: {
  dayAfter?: boolean;
  /** Red flag in the 'after' reading: the session is already complete. */
  afterSession?: boolean;
  onHome(): void;
}) {
  return (
    <div className="min-h-dvh bg-ink text-paper">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <Icon name="stop" size={64} />
          <h1
            className={`m-0 leading-none font-extrabold break-words ${dayAfter || afterSession ? 'text-5xl' : 'text-6xl'}`}
          >
            {dayAfter
              ? PAIN_COPY.stopTitleDayAfter
              : afterSession
                ? PAIN_COPY.stopTitleAfter
                : PAIN_COPY.stopTitle}
          </h1>
          {dayAfter || afterSession ? null : (
            <>
              <p className="m-0 text-2xl font-bold">{PAIN_COPY.stopBody}</p>
              <p className="m-0 text-xl">Det du hunnit logga sparas.</p>
            </>
          )}
        </div>
        <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t-[3px] border-paper bg-ink px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onHome}
            className="flex min-h-16 w-full items-center justify-center rounded-md bg-paper px-6 text-xl font-bold text-ink active:scale-[0.98]"
          >
            {PAIN_COPY.stopDone}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Loaded {
  session: Session | null;
  hasBefore: boolean;
  anySets: boolean;
  dayAfterDue: boolean;
}

/** #/smarta/:sessionId/:timing: one pain reading, then ok / warn / stop. */
export function PainScreen({
  sessionId,
  timing,
}: {
  sessionId: string;
  timing: PainTiming;
}) {
  const [, navigate] = useLocation();
  // Loaded once: a stop aborts the session and the result must stay on screen.
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const [score, setScore] = useState<number | null>(null);
  const [flags, setFlags] = useState<Flags>(NO_FLAGS);
  const [outcome, setOutcome] = useState<Outcome>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const db = getDb();
      const session = (await db.sessions.get(sessionId)) ?? null;
      const readings = await listPainLogsBySession(db, sessionId);
      const sets = await db.setLogs
        .where('sessionId')
        .equals(sessionId)
        .count();
      const all = await db.sessions.toArray();
      const due = session
        ? shouldPromptDayAfter(session, readings, toLocalDate(new Date()), all)
        : false;
      if (!cancelled) {
        setLoaded({
          session,
          hasBefore: readings.some((r) => r.timing === 'before'),
          anySets: sets > 0,
          dayAfterDue: due,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loaded === undefined) return null;
  const { session } = loaded;
  const live = session?.status === 'in_progress';
  if (!session) return <Redirect to="/" />;
  // 'before' is one-shot: Android back from the session must not re-enter it.
  if (
    timing === 'before' &&
    (!live || loaded.hasBefore || loaded.anySets) &&
    outcome === undefined
  ) {
    return <Redirect to={`/session/${sessionId}`} />;
  }
  if (timing === 'after' && !live && outcome === undefined) {
    return <Redirect to={`/session/${sessionId}`} />;
  }
  if (timing === 'dayAfter' && !loaded.dayAfterDue && outcome === undefined) {
    return <Redirect to="/" />;
  }

  const valid = isValidScore(score);

  /** Runs an action once at a time; shows a Swedish error instead of failing silently. */
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

  const save = () =>
    run(async () => {
      if (!isValidScore(score)) return;
      const result = await recordPainReading(
        getDb(),
        { sessionId, timing, score, redFlags: flags },
        new Date(),
      );
      if (result.status === 'stop') {
        setOutcome({ kind: 'stop' });
      } else if (result.status === 'warn') {
        setOutcome({ kind: 'warn', wallSit: false, reasons: result.reasons });
      } else {
        navigate(timing === 'dayAfter' ? '/' : `/session/${sessionId}`);
      }
    });

  if (outcome?.kind === 'stop') {
    return (
      <StopScreen
        dayAfter={timing === 'dayAfter'}
        afterSession={timing === 'after'}
        onHome={() => navigate('/')}
      />
    );
  }

  const errorLine = error ? (
    <p role="alert" className="m-0 text-center text-base font-bold">
      {PAIN_COPY.error}
    </p>
  ) : null;

  if (outcome?.kind === 'warn') {
    const dayAfter = timing === 'dayAfter';
    const before = timing === 'before';
    const wallSit = outcome.wallSit;
    const worse = outcome.reasons.includes('worse_than_previous_day');
    return (
      <Shell>
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <Icon name="warning" size={56} />
          <h1 className="m-0 text-6xl leading-none font-extrabold">
            {dayAfter && worse
              ? PAIN_COPY.warnTitleDayAfter
              : PAIN_COPY.warnTitle}
          </h1>
          <p className="m-0 text-2xl font-bold">{PAIN_COPY.warnBody}</p>
          {before ? (
            <Toggle
              size="text-lg"
              label={PAIN_COPY.wallSit}
              on={wallSit}
              onToggle={() => setOutcome({ ...outcome, wallSit: !wallSit })}
            />
          ) : null}
        </div>
        <Actions>
          {errorLine}
          {before ? (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await abortSession(getDb(), sessionId, new Date(), 'user');
                    navigate('/');
                  })
                }
              >
                {PAIN_COPY.warnEnd}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (wallSit) await addWallSit(getDb(), sessionId);
                    navigate(`/session/${sessionId}`);
                  })
                }
              >
                {PAIN_COPY.warnContinue}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate(dayAfter ? '/' : `/session/${sessionId}`)}
            >
              {dayAfter ? PAIN_COPY.warnBackHome : PAIN_COPY.warnAfterContinue}
            </Button>
          )}
        </Actions>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col gap-5 pt-6 pb-4">
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          {PAIN_COPY.title[timing]}
        </h1>
        <ScorePicker value={score} onChange={setScore} />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-base font-bold text-ink-soft">
            {PAIN_COPY.flagsLabel}
          </legend>
          {FLAG_KEYS.map((k) => (
            <Toggle
              key={k}
              label={PAIN_COPY.flags[k]}
              on={flags[k]}
              onToggle={() => setFlags({ ...flags, [k]: !flags[k] })}
            />
          ))}
        </fieldset>
      </div>
      <Actions>
        {errorLine}
        {valid ? null : (
          <p className="m-0 text-center text-base text-ink-soft">
            {PAIN_COPY.pickFirst}
          </p>
        )}
        <Button onClick={save} disabled={!valid || busy}>
          {PAIN_COPY.save}
        </Button>
      </Actions>
    </Shell>
  );
}
