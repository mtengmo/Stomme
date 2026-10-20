import { useCallback, useEffect, useRef, useState } from 'react';
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
}: {
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
  const start = () => {
    deadline.current = Date.now() + 5_000;
    show('prepare', 5);
    timerVoice(`${side ? `${side}. ` : ''}Gör dig redo. Fem sekunder.`);
  };
  const pause = useCallback(() => {
    if (current.current !== 'prepare' && current.current !== 'hold') return;
    pausedPhase.current = current.current;
    const time = secondsLeft(deadline.current, Date.now());
    show('paused', time);
    stopTimerVoice();
  }, [show]);
  const resume = () => {
    deadline.current = Date.now() + remainingRef.current * 1_000;
    show(pausedPhase.current, remainingRef.current);
    timerVoice(
      pausedPhase.current === 'hold' ? 'Fortsätt hålla.' : 'Gör dig redo.',
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
      if (time > 0) return;
      if (current.current === 'prepare') {
        deadline.current = Date.now() + duration.current * 1_000;
        show('hold', duration.current);
        timerDone();
        timerVoice('Börja hålla.');
      } else {
        show('done', 0);
        timerDone();
        timerVoice('Klart. Släpp positionen.');
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
      if (current.current !== 'done') stopTimerVoice();
    };
  }, [pause, show]);

  return { phase, remaining, start, pause, resume, reset };
}
