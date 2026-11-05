/** Hand-drawn tapered tick, a few slightly different strokes. Not the UI check glyph. */
const STROKES = [
  {
    d: 'M6 27C8 25 10 25 13 30C18 19 28 9 42 4C43 5 43 6 41 8C30 15 22 26 17 39C15 41 13 40 12 38C10 34 8 31 5 29C5 28 5 27 6 27Z',
    rotate: -3,
  },
  {
    d: 'M5 25C7 23 10 24 14 31C19 21 29 11 43 6C44 7 43 8 42 9C31 17 23 27 18 38C16 40 14 40 13 38C11 35 8 31 4 28C4 26 4 25 5 25Z',
    rotate: 2,
  },
  {
    d: 'M7 28C8 26 11 25 14 29C20 18 30 8 41 5C42 6 42 7 40 9C31 15 24 25 19 40C17 41 15 41 14 39C12 35 9 32 6 30C6 29 6 28 7 28Z',
    rotate: -1,
  },
];

interface PencilTickProps {
  size: number;
  variant?: number;
  /** Plays the draw-on once. Only set for a set that was just completed. */
  animate?: boolean;
  className?: string;
  /** Overrides the --done fill (theme previews). */
  fill?: string;
}

export function PencilTick({
  size,
  variant = 0,
  animate = false,
  className = '',
  fill,
}: PencilTickProps) {
  const s = STROKES[Math.abs(variant) % STROKES.length] ?? STROKES[0];
  if (!s) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={`fill-(--done-mark) ${animate ? 'tick-new' : ''} ${className}`}
      style={{ transform: `rotate(${s.rotate}deg)`, ...(fill ? { fill } : {}) }}
    >
      <path d={s.d} />
    </svg>
  );
}

/**
 * A hand-drawn pencil stroke laid under a label (the active nav tab). Same
 * tapered, slightly uneven hand as the tick, but in the text colour: the done
 * colour means done. Stretches to the width of its box.
 */
const UNDERLINE =
  'M2 5C10 3 22 4 34 3.5C46 3 56 3.8 62 2.5C63 3.5 62.5 4.8 60 5.4C48 6.6 30 6.2 14 6.6C8 6.8 4 6.9 2 6.3C1 5.8 1.2 5.2 2 5Z';

export function PencilStroke({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={`block h-2 w-full fill-current ${className}`}
    >
      <path d={UNDERLINE} />
    </svg>
  );
}
