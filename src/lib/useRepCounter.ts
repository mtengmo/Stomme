import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type RepPhase,
  type RepTempo,
  repPosition,
  repProgress,
} from '../rules/repTempo';
import { cue } from './beep';
import { tapFeedback, timerDone } from './haptics';
import { canSpeakSwedish, stopTimerVoice, timerVoice } from './timerVoice';

type Phase = 'idle' | 'prepare' | 'active' | 'paused' | 'resuming' | 'done';

const PREPARE_MS = 5_000;
const RESUME_MS = 3_000;
const CUE: Partial<Record<RepPhase, string>> = {
  up: 'Upp',
  hold: 'Håll',
  down: 'Ner',
};

/**
 * Hands-free repetition counting. Time comes from timestamps minus paused
 * time; animation frames only redraw. A deliberate Start arms one exercise and
 * every following set gets five seconds to prepare.
 */
export function useRepCounter({
  reps,
  tempo,
  side,
  autoStart,
  onDone,
  onCancel,
}: {
  reps: number;
  /** Null for exercises counted by hand; the hook then stays idle. */
  tempo: RepTempo | null;
  side: string;
  autoStart: boolean;
  /** `early` is true when the user ended the set; `completed` is the reps finished. */
  onDone(completed: number, early: boolean): void;
  /** The user ended the set before the first rep finished; nothing is saved. */
  onCancel?(): void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [completed, setCompleted] = useState(0);
  const [leadSeconds, setLeadSeconds] = useState(5);
  const current = useRef<Phase>('idle');
  const leadDeadline = useRef(0);
  const leadLeftMs = useRef(PREPARE_MS);
  const segmentStart = useRef(0);
  const activeMs = useRef(0);
  const pausedFrom = useRef<'prepare' | 'active' | 'resuming'>('prepare');
  const lastCompleted = useRef(0);
  const lastMovement = useRef<RepPhase>('up');
  const lastLead = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;
  const cancelled = useRef(onCancel);
  cancelled.current = onCancel;
  const total = useRef(reps);
  total.current = reps;
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  // A pace change while paused keeps the position inside the rep.
  const lastRepMs = useRef(tempo?.repMs);
  const repMs = tempo?.repMs;
  useEffect(() => {
    const before = lastRepMs.current;
    lastRepMs.current = repMs;
    if (!repMs || !before || repMs === before) return;
    if (current.current !== 'paused' || !tempoRef.current) return;
    activeMs.current = (activeMs.current * repMs) / before;
    lastCompleted.current = repPosition(
      tempoRef.current,
      activeMs.current,
    ).completed;
  }, [repMs]);

  const show = useCallback((next: Phase) => {
    current.current = next;
    setPhase(next);
  }, []);
  const elapsed = useCallback(
    () =>
      current.current === 'active'
        ? activeMs.current + (Date.now() - segmentStart.current)
        : activeMs.current,
    [],
  );

  const begin = () => {
    activeMs.current = 0;
    lastCompleted.current = 0;
    lastMovement.current = 'up';
    setCompleted(0);
    leadLeftMs.current = PREPARE_MS;
    leadDeadline.current = Date.now() + PREPARE_MS;
    setLeadSeconds(5);
    lastLead.current = 5;
    show('prepare');
    cue.start();
    timerVoice(`${side ? `${side}. ` : ''}Gör dig redo. Fem sekunder.`);
  };
  const pause = useCallback(() => {
    const now = Date.now();
    if (current.current === 'prepare' || current.current === 'resuming') {
      leadLeftMs.current = Math.max(0, leadDeadline.current - now);
      pausedFrom.current = current.current;
    } else if (current.current === 'active') {
      activeMs.current += now - segmentStart.current;
      pausedFrom.current = 'active';
    } else return;
    show('paused');
    stopTimerVoice();
    cue.pause();
  }, [show]);
  const resume = () => {
    if (current.current !== 'paused') return;
    cue.start();
    if (pausedFrom.current === 'prepare') {
      leadDeadline.current = Date.now() + leadLeftMs.current;
      lastLead.current = Math.max(1, Math.ceil(leadLeftMs.current / 1_000));
      show('prepare');
      timerVoice('Gör dig redo.');
    } else {
      leadLeftMs.current = RESUME_MS;
      leadDeadline.current = Date.now() + RESUME_MS;
      setLeadSeconds(3);
      lastLead.current = 3;
      show('resuming');
      timerVoice('Fortsätt om tre. Två. Ett.');
    }
  };
  const reset = () => {
    activeMs.current = 0;
    lastCompleted.current = 0;
    setCompleted(0);
    show('idle');
    stopTimerVoice();
  };
  /** Saves the reps finished so far; the rep in progress does not count. */
  const endEarly = () => {
    const state = current.current;
    if (state !== 'active' && state !== 'paused' && state !== 'resuming')
      return;
    const t = tempoRef.current;
    if (!t) return;
    const count = Math.min(total.current, repPosition(t, elapsed()).completed);
    if (count < 1) {
      reset();
      cancelled.current?.();
      return;
    }
    show('done');
    setCompleted(count);
    stopTimerVoice();
    timerDone();
    done.current(count, count < total.current);
  };

  const startRef = useRef(begin);
  startRef.current = begin;
  const wasAutomatic = useRef(autoStart);
  useEffect(() => {
    if (autoStart && current.current === 'idle') startRef.current();
    else if (!autoStart && wasAutomatic.current) pause();
    wasAutomatic.current = autoStart;
  }, [autoStart, pause]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const now = Date.now();
      const state = current.current;
      if (state === 'prepare' || state === 'resuming') {
        const left = Math.max(0, leadDeadline.current - now);
        const shown = Math.max(1, Math.ceil(left / 1_000));
        setLeadSeconds(shown);
        if (left > 0) {
          // One tick on each displayed second.
          if (shown !== lastLead.current) {
            lastLead.current = shown;
            cue.rep();
          }
          return;
        }
        cue.go();
        if (state === 'prepare') {
          timerVoice(tempoRef.current?.hasHold ? 'Börja. Upp.' : 'Börja.');
          tapFeedback();
        }
        segmentStart.current = now;
        lastMovement.current = 'up';
        show('active');
        return;
      }
      if (state !== 'active') return;
      const t = tempoRef.current;
      if (!t) return;
      const position = repPosition(t, elapsed());
      const count = Math.min(total.current, position.completed);
      if (count >= total.current) {
        show('done');
        setCompleted(total.current);
        timerDone();
        cue.done();
        timerVoice('Klart.');
        done.current(total.current, false);
        return;
      }
      if (count !== lastCompleted.current) {
        lastCompleted.current = count;
        lastMovement.current = position.phase;
        setCompleted(count);
        tapFeedback();
        // Spoken numbers need a Swedish voice; otherwise a tick marks each rep.
        if (canSpeakSwedish()) {
          const next = CUE[position.phase];
          timerVoice(
            t.hasHold && position.phase === 'up' && next
              ? `${count}. ${next}`
              : String(count),
          );
        } else cue.rep();
      } else if (position.phase !== lastMovement.current) {
        lastMovement.current = position.phase;
        const word = CUE[position.phase];
        if (t.hasHold && word) timerVoice(word);
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      if (current.current !== 'done' && current.current !== 'idle')
        stopTimerVoice();
    };
  }, [pause, show, elapsed]);

  /** Movement position 0..1 on the same clock as the count; 0 outside a set. */
  const progress = useCallback(() => {
    const state = current.current;
    const t = tempoRef.current;
    if (
      !t ||
      (state !== 'active' && state !== 'paused' && state !== 'resuming')
    )
      return 0;
    return repProgress(t, elapsed());
  }, [elapsed]);

  return {
    progress,
    phase,
    completed,
    leadSeconds,
    start: begin,
    pause,
    resume,
    reset,
    endEarly,
  };
}
