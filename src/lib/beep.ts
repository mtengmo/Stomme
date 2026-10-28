/** Short tones for timer cues; work in any language and need no voice installed. */
let context: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    if (!context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return undefined;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return undefined;
  }
}

/** Plays tones one after another, each `[hertz, milliseconds]`. */
function tones(sequence: readonly (readonly [number, number])[]): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    let at = ctx.currentTime;
    for (const [hertz, ms] of sequence) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = hertz;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + ms / 1000 + 0.02);
      at += ms / 1000 + 0.05;
    }
  } catch {
    // Sound is optional; visual cues and vibration still work.
  }
}

export const cue = {
  /** Start or restart: two rising tones. */
  start: () =>
    tones([
      [660, 110],
      [880, 160],
    ]),
  /** Counting begins. */
  go: () => tones([[1040, 220]]),
  /** Paused: one low falling pair. */
  pause: () =>
    tones([
      [520, 120],
      [390, 200],
    ]),
  /** One repetition counted. */
  rep: () => tones([[880, 70]]),
  /** Set finished. */
  done: () =>
    tones([
      [880, 120],
      [880, 120],
      [1175, 300],
    ]),
};
