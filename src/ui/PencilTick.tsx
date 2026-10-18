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
}

export function PencilTick({
  size,
  variant = 0,
  animate = false,
  className = '',
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
      className={`fill-red ${animate ? 'tick-new' : ''} ${className}`}
      style={{ transform: `rotate(${s.rotate}deg)` }}
    >
      <path d={s.d} />
    </svg>
  );
}
