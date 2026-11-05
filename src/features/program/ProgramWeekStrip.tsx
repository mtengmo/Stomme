import { formatLongDate, weekDates } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { PencilTick } from '../../ui/PencilTick';

const ABBR = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];

interface ProgramWeekStripProps {
  /** Local date (YYYY-MM-DD) of today; the strip shows its calendar week, Monday first. */
  today: string;
  /** Dates with a suggested pass. */
  plannedDates: readonly string[];
  /** Dates on which a programme pass was finished. */
  doneDates: readonly string[];
  /** The next planned date, marked "Nästa". */
  nextDate?: string;
  /** ISO weekdays (1 = Monday) for the line "Förslag: tor · lör". */
  suggestedWeekdays?: readonly number[];
}

/** Seven day squares for this calendar week; planned = accent outline, done = pencil tick. */
export function ProgramWeekStrip({
  today,
  plannedDates,
  doneDates,
  nextDate,
  suggestedWeekdays,
}: ProgramWeekStripProps) {
  const dates = weekDates(today);
  const nextIndex = nextDate ? dates.indexOf(nextDate) : -1;
  const suggestion = suggestedWeekdays
    ?.map((d) => ABBR[d - 1])
    .filter(Boolean)
    .join(' · ');
  return (
    <div>
      <ul
        aria-label="Veckan"
        className="m-0 grid list-none grid-cols-7 gap-1 p-0"
      >
        {dates.map((date, i) => {
          const isToday = date === today;
          const planned = plannedDates.includes(date);
          const done = doneDates.includes(date);
          const label = [
            formatLongDate(date),
            isToday ? 'idag' : null,
            planned ? 'planerat' : null,
            done ? 'klart' : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li
              key={date}
              aria-label={label}
              className="relative flex justify-center"
            >
              <span
                aria-hidden="true"
                className={`relative flex h-11 w-full max-w-11 min-w-0 flex-col items-center justify-center rounded-sm leading-none ${
                  isToday
                    ? 'border-2 border-ink bg-today text-today-ink'
                    : planned
                      ? 'border-[3px] border-accent bg-surface text-ink'
                      : 'border-2 border-edge bg-surface text-ink'
                }`}
              >
                {/* Shrinks with the column so "mån" and "tors" stay inside the square at large text sizes. */}
                <span className="text-[min(1rem,calc((100vw-84px)/14.7))]">
                  {ABBR[i]}
                </span>
                <span className="count text-xl">
                  {Number(date.slice(8, 10))}
                </span>
                {isToday ? (
                  <Icon
                    name="sun"
                    size={16}
                    className="absolute -top-4 -left-2 rounded-full bg-paper text-ink"
                  />
                ) : null}
                {done ? (
                  <PencilTick
                    size={24}
                    variant={i}
                    className="absolute -top-5 -right-3"
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {nextIndex >= 0 ? (
        <div aria-hidden="true" className="mt-1 grid grid-cols-7 gap-1">
          <span
            style={{ gridColumnStart: nextIndex + 1 }}
            className={`inline-block whitespace-nowrap rounded-sm bg-upcoming px-2.5 py-1 text-base font-bold text-upcoming-ink ${
              nextIndex === 6 ? 'justify-self-end' : 'justify-self-start'
            }`}
          >
            Nästa
          </span>
        </div>
      ) : null}
      {suggestion ? (
        <p className="m-0 mt-2 text-base text-ink-soft">
          Förslag: {suggestion}. Träna när det passar.
        </p>
      ) : null}
    </div>
  );
}
