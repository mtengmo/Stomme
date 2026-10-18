import { useEffect, useRef } from 'react';
import { PencilTick } from './PencilTick';

export interface TallyItem {
  id: string;
  /** Sets left to do for this exercise; 0 means ticked. */
  remaining: number;
}

interface TallyProps {
  items: TallyItem[];
  /** Accessible name, e.g. "Pass A: 4 av 10 set klara". */
  label: string;
  size?: number;
  /** Outline colour: graphite for the lead card, edge for the receding one. */
  tone?: 'ink' | 'edge';
}

/** Row of set circles; finished ones carry a red pencil tick, others the sets left. */
export function Tally({ items, label, size = 48, tone = 'ink' }: TallyProps) {
  const doneNow = items.filter((i) => i.remaining === 0).length;
  const seen = useRef<Set<string> | null>(null);
  const fresh = new Set<string>();
  if (seen.current) {
    for (const i of items) {
      if (i.remaining === 0 && !seen.current.has(i.id)) fresh.add(i.id);
    }
  }
  useEffect(() => {
    seen.current = new Set(
      items.filter((i) => i.remaining === 0).map((i) => i.id),
    );
  }, [items]);

  return (
    <div
      role="img"
      aria-label={label}
      data-done={doneNow}
      className="flex gap-1.5"
    >
      {items.map((item, idx) => (
        <span
          key={item.id}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className={`count relative grid shrink-0 place-items-center rounded-full border-[3px] bg-paper ${
            tone === 'ink' ? 'border-ink' : 'border-edge'
          }`}
        >
          {item.remaining === 0 ? (
            <PencilTick
              size={Math.round(size * 0.82)}
              variant={idx}
              animate={fresh.has(item.id)}
              className="absolute"
            />
          ) : (
            <span
              className="text-ink"
              style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}
            >
              {item.remaining}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
