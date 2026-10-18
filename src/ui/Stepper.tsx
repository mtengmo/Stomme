import { Icon } from './Icon';

interface StepperProps {
  /** Visible label above the value, e.g. "Antal". */
  label: string;
  value: string;
  /** Small unit after the value, e.g. "reps". */
  unit?: string;
  /** Extra line under the value, e.g. the load description. */
  note?: string;
  onDec(): void;
  onInc(): void;
  decDisabled?: boolean;
  incDisabled?: boolean;
  /** lg = the amount (huge numerals), md = secondary value such as the load. */
  size?: 'lg' | 'md' | 'sm';
}

const stepBtn =
  'grid size-16 shrink-0 place-items-center rounded-md border-[3px] border-ink bg-paper text-ink transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40';

const stepBtnSm = stepBtn.replace('size-16', 'size-12');

/** Big value with minus/plus buttons (64 px targets, 8 px+ from the value). */
export function Stepper({
  label,
  value,
  unit,
  note,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
  size = 'lg',
}: StepperProps) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="p-0 text-base font-bold text-ink-soft">{label}</legend>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={size === 'sm' ? stepBtnSm : stepBtn}
          onClick={onDec}
          disabled={decDisabled}
          aria-label={`Minska ${label.toLowerCase()}`}
        >
          <Icon name="minus" size={32} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <p
            className={`m-0 text-center leading-none ${
              size === 'lg'
                ? 'count text-7xl'
                : size === 'md'
                  ? 'count text-4xl'
                  : 'text-xl font-normal'
            }`}
            aria-live="polite"
          >
            {value}
            {unit ? (
              <span className="ml-2 text-2xl font-bold text-ink-soft">
                {unit}
              </span>
            ) : null}
          </p>
          {note ? (
            <p className="m-0 mt-1 text-center text-base text-ink-soft">
              {note}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={size === 'sm' ? stepBtnSm : stepBtn}
          onClick={onInc}
          disabled={incDisabled}
          aria-label={`Öka ${label.toLowerCase()}`}
        >
          <Icon name="plus" size={32} />
        </button>
      </div>
    </fieldset>
  );
}
