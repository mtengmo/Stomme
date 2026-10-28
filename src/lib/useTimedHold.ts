import { useCallback, useEffect, useRef, useState } from 'react';
import { cue } from './beep';
import { timerDone } from './haptics';
import { stopTimerVoice, timerVoice } from './timerVoice';
import { secondsLeft } from './useCountdown';

type Phase = 'idle' | 'prepare' | 'hold' | 'paused' | 'done';

/** A deliberate Start arms one exercise; each subsequent hold gets five seconds to prepare. */
export function useTimedHold({
  seconds,
  side,
  autoStart,
  onDone,
  moving = false,
}: {
  moving?: boolean;
  seconds: number;
  side: string;
  autoStart: boolean;
  onDone(): void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(seconds);
  const current = useRef<Phase>('idle');
  const deadline = useRef(0);
  const pausedPhase = useRef<'prepare' | 'hold'>('hold');
  const remainingRef = useRef(seconds);
  const done = useRef(onDone);
  done.current = onDone;
  const duration = useRef(seconds);
  duration.current = seconds;

  const show = useCallback((next: Phase, time: number) => {
    current.current = next;
    remainingRef.current = time;
    setPhase(next);
    setRemaining(time);
  }, []);
  const lastTick = useRef(-1);
  const start = () => {
    deadline.current = Date.now() + 5_000;
    lastTick.current = 5;
    show('prepare', 5);
    cue.start();
    timerVoice(`${side ? `${side}. ` : ''}Gör dig redo. Fem sekunder.`);
  };
  const pause = useCallback(() => {
    if (current.current !== 'prepare' && current.current !== 'hold') return;
    pausedPhase.current = current.current;
    const time = secondsLeft(deadline.current, Date.now());
    show('paused', time);
    stopTimerVoice();
    // A page that went to the background cannot play sound anyway.
    if (!document.hidden) cue.pause();
  }, [show]);
  const resume = () => {
    deadline.current = Date.now() + remainingRef.current * 1_000;
    lastTick.current = remainingRef.current;
    show(pausedPhase.current, remainingRef.current);
    cue.start();
    timerVoice(
      pausedPhase.current === 'hold'
        ? moving
          ? 'Fortsätt rörelsen.'
          : 'Fortsätt hålla.'
        : 'Gör dig redo.',
    );
  };
  const reset = () => {
    show('idle', duration.current);
    stopTimerVoice();
  };

  const startRef = useRef(start);
  startRef.current = start;
  const wasAutomatic = useRef(autoStart);
  useEffect(() => {
    if (autoStart && current.current === 'idle') startRef.current();
    else if (!autoStart && wasAutomatic.current) pause();
    wasAutomatic.current = autoStart;
  }, [autoStart, pause]);

  useEffect(() => {
    const tick = () => {
      if (
        document.hidden ||
        (current.current !== 'prepare' && current.current !== 'hold')
      )
        return;
      const time = secondsLeft(deadline.current, Date.now());
      remainingRef.current = time;
      setRemaining(time);
      // A tick for each second of the preparation and the last three seconds of the hold.
      if (
        time > 0 &&
        time !== lastTick.current &&
        (current.current === 'prepare' || time <= 3)
      ) {
        lastTick.current = time;
        cue.rep();
      }
      if (time > 0) return;
      if (current.current === 'prepare') {
        deadline.current = Date.now() + duration.current * 1_000;
        show('hold', duration.current);
        lastTick.current = duration.current;
        timerDone();
        cue.go();
        timerVoice(
          moving ? 'Börja rörelsen. Växla ben lugnt.' : 'Börja hålla.',
        );
      } else {
        show('done', 0);
        timerDone();
        cue.done();
        timerVoice(moving ? 'Klart. Vila.' : 'Klart. Släpp positionen.');
        done.current();
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      if (current.current !== 'done' && current.current !== 'idle')
        stopTimerVoice();
    };
  }, [pause, show, moving]);

  return { phase, remaining, start, pause, resume, reset };
}
