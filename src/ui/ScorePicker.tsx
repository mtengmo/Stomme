import { useId } from 'react';

/** A bounded 0–10 rating: select a value without editing numeric text. */
export function ScorePicker({
  value,
  onChange,
  label,
  low,
  high,
  showLabel = true,
}: {
  value: number | null;
  onChange(value: number): void;
  label: string;
  low: string;
  high: string;
  showLabel?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className={showLabel ? 'mb-2 text-base font-bold' : 'sr-only'}>
        {label}
      </legend>
      <p className="m-0 text-base font-bold text-ink-soft">0 · {low}</p>
      <div className="grid grid-cols-5 gap-1.5 min-[360px]:grid-cols-6">
        {Array.from({ length: 11 }, (_, score) => score).map((score) => (
          <label key={score} className="block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
              aria-label={
                score === 0
                  ? `0, ${low.toLowerCase()}`
                  : score === 10
                    ? `10, ${high.toLowerCase()}`
                    : String(score)
              }
              className="peer sr-only"
            />
            <span
              className={`count grid h-14 min-w-12 place-items-center rounded-md border-[3px] border-ink text-3xl transition-transform duration-150 ease-out peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-(--focus-outline) peer-focus-visible:[box-shadow:var(--focus-ring)] active:scale-[0.96] ${value === score ? 'bg-action text-action-ink' : 'bg-surface text-ink'}`}
            >
              {score}
            </span>
          </label>
        ))}
      </div>
      <p className="m-0 text-right text-base font-bold text-ink-soft">
        10 · {high}
      </p>
    </fieldset>
  );
}
