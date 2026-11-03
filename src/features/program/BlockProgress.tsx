import type { CSSProperties } from 'react';
import { PencilTick } from '../../ui/PencilTick';

interface BlockProgressProps {
  /** Pass finished in the block. */
  done: number;
  /** Passes in the whole block (4 weeks x days per week). */
  total: number;
  /** Current block week, 1-4. */
  currentWeek: number;
  /** Weeks that are completely done. */
  completedWeeks: number;
  weeks?: number;
  /** Draws the tick of this week on (the week that was just completed). */
  newTickWeek?: number;
  /** Delay before the tick draws on, so it follows a stroke over the strip. */
  tickDelayMs?: number;
}

/** V1-V4: four 44 px boxes; done weeks hold a pencil tick, the current one says "Nu". */
export function BlockProgress({
  done,
  total,
  currentWeek,
  completedWeeks,
  weeks = 4,
  newTickWeek,
  tickDelayMs = 0,
}: BlockProgressProps) {
  return (
    <div className="flex items-start gap-4">
      <ol
        aria-label={`Blockets framsteg: ${completedWeeks} av ${weeks} veckor klara`}
        className="m-0 flex list-none gap-2 p-0"
      >
        {Array.from({ length: weeks }, (_, i) => {
          const week = i + 1;
          const isDone = week <= completedWeeks;
          const isNow = !isDone && week === currentWeek;
          return (
            <li
              key={week}
              aria-label={`Vecka ${week}, ${isDone ? 'klar' : isNow ? 'nu' : 'kommande'}`}
              className="flex w-11 flex-col items-center gap-1"
            >
              <span
                aria-hidden="true"
                className={`relative grid size-11 place-items-center rounded-sm bg-surface ${
                  isNow ? 'border-[3px] border-ink' : 'border-2 border-edge'
                }`}
              >
                <span className="count text-xl leading-none">V{week}</span>
                {isDone ? (
                  <span
                    className="tick-delayed absolute -top-3 -right-2"
                    style={
                      week === newTickWeek
                        ? ({
                            '--tick-delay': `${tickDelayMs}ms`,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <PencilTick
                      size={28}
                      variant={i}
                      animate={week === newTickWeek}
                    />
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="h-5 text-base leading-5 font-bold"
              >
                {isNow ? 'Nu' : ''}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="count m-0 pt-2 text-2xl leading-none">
        {done} av {total} pass
      </p>
    </div>
  );
}
