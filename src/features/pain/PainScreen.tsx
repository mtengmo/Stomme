import { type ReactNode, useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { PAIN_COPY } from '../../content/copy';
import { getDb } from '../../db/db';
import {
  abortSession,
  addPainLog,
  addWallSit,
  listPainLogsBySession,
  replanSession,
} from '../../db/repo';
import type { PainLog, PainStatus, Session } from '../../domain/types';
import {
  assessReading,
  dayAfterReference,
  isValidScore,
} from '../../rules/pain';
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
  | { kind: 'warn'; wallSit: boolean }
  | undefined;

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
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [score, setScore] = useState<number | null>(null);
  const [flags, setFlags] = useState<Flags>(NO_FLAGS);
  const [outcome, setOutcome] = useState<Outcome>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getDb()
      .sessions.get(sessionId)
      .then((s) => {
        if (!cancelled) setSession(s ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (session === undefined) return null;
  const live = session?.status === 'in_progress';
  if (!session || (timing !== 'dayAfter' && !live)) {
    return <Redirect to={session ? `/session/${sessionId}` : '/'} />;
  }

  const valid = isValidScore(score);

  const save = async () => {
    if (!isValidScore(score) || busy) return;
    setBusy(true);
    try {
      const db = getDb();
      const now = new Date();
      await addPainLog(db, { sessionId, timing, score, redFlags: flags }, now);
      const readings = await listPainLogsBySession(db, sessionId);
      const mine = readings.find((r) => r.timing === timing);
      const status: PainStatus = mine
        ? assessReading(
            mine,
            timing === 'dayAfter' ? dayAfterReference(readings) : undefined,
          ).status
        : 'warn';
      if (status === 'stop') {
        if (live) await abortSession(db, sessionId, now, 'pain_stop');
        setOutcome({ kind: 'stop' });
        return;
      }
      if (timing === 'before') await replanSession(db, sessionId);
      if (status === 'warn') {
        setOutcome({ kind: 'warn', wallSit: false });
        return;
      }
      navigate(timing === 'dayAfter' ? '/' : `/session/${sessionId}`);
    } finally {
      setBusy(false);
    }
  };

  if (outcome?.kind === 'stop') {
    const dayAfter = timing === 'dayAfter';
    return (
      <Shell>
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <Icon name="stop" size={56} />
          <h1 className="m-0 text-6xl leading-none font-extrabold">
            {dayAfter ? PAIN_COPY.stopTitleDayAfter : PAIN_COPY.stopTitle}
          </h1>
          <p className="m-0 text-2xl font-bold">{PAIN_COPY.stopBody}</p>
          {dayAfter ? null : (
            <p className="m-0 text-xl">Det du hunnit logga sparas.</p>
          )}
        </div>
        <Actions>
          <Button onClick={() => navigate('/')}>{PAIN_COPY.stopDone}</Button>
        </Actions>
      </Shell>
    );
  }

  if (outcome?.kind === 'warn') {
    const dayAfter = timing === 'dayAfter';
    const before = timing === 'before';
    const wallSit = outcome.wallSit;
    return (
      <Shell>
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <Icon name="warning" size={56} />
          <h1 className="m-0 text-6xl leading-none font-extrabold">
            {dayAfter ? PAIN_COPY.warnTitleDayAfter : PAIN_COPY.warnTitle}
          </h1>
          <p className="m-0 text-2xl font-bold">{PAIN_COPY.warnBody}</p>
          {before ? (
            <Toggle
              size="text-lg"
              label={PAIN_COPY.wallSit}
              on={wallSit}
              onToggle={() => setOutcome({ kind: 'warn', wallSit: !wallSit })}
            />
          ) : null}
        </div>
        <Actions>
          {before ? (
            <>
              <Button
                onClick={async () => {
                  if (wallSit) await addWallSit(getDb(), sessionId);
                  navigate(`/session/${sessionId}`);
                }}
              >
                {PAIN_COPY.warnContinue}
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  await abortSession(getDb(), sessionId, new Date(), 'user');
                  navigate('/');
                }}
              >
                {PAIN_COPY.warnEnd}
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
