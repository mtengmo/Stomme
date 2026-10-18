interface RingProps {
  done: number;
  total: number;
  /** Accessible name, e.g. "Pass A: 10 av 10 set klara". */
  label: string;
  size?: number;
}

const R = 30;
const C = 2 * Math.PI * R;

/** Set tally: one thick pencil segment per set, ticked ones in red, count centred. */
export function Ring({ done, total, label, size = 88 }: RingProps) {
  const count = Math.max(1, total);
  const gap = count > 1 ? 4 : 0;
  const seg = C / count - gap;
  const segments = Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    filled: i < done,
    offset: -(i * (seg + gap)),
  }));
  return (
    <div
      role="img"
      aria-label={label}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 80 80" width={size} height={size} aria-hidden="true">
        {segments.map((s) => (
          <circle
            key={s.id}
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="9"
            strokeDasharray={`${seg} ${C - seg}`}
            strokeDashoffset={s.offset}
            transform="rotate(-90 40 40)"
            className={s.filled ? 'stroke-red' : 'stroke-ink-soft/40'}
          />
        ))}
      </svg>
      <span
        className="count absolute inset-0 grid place-items-center text-[30px] leading-none"
        aria-hidden="true"
      >
        {done}
      </span>
    </div>
  );
}
