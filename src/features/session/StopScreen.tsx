import { PAIN_COPY } from '../../content/copy';
import { Icon } from '../../ui/Icon';

/**
 * Stop screen after "Avbryt – det gör ont": paper inside a 6 px --care frame,
 * icon plus the word Stopp, a --care button. Rehab is told to ask the
 * physiotherapist; regular training gets a plain pointer to care (1177).
 */
export function StopScreen({
  physio,
  onHome,
}: {
  /** Rehab sessions are followed by a physiotherapist. */
  physio: boolean;
  onHome(): void;
}) {
  return (
    <div className="min-h-dvh border-[6px] border-care bg-paper text-ink">
      <div className="mx-auto flex min-h-[calc(100dvh-12px)] max-w-md flex-col px-5">
        <div className="flex flex-1 flex-col gap-4 pt-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-care">
            <Icon name="stop" size={64} />
            <p className="m-0 text-[clamp(2.25rem,18vw,3.75rem)] leading-none font-extrabold">
              Stopp
            </p>
          </div>
          <h1 className="m-0 text-6xl leading-none font-extrabold break-words">
            {PAIN_COPY.stopTitle}
          </h1>
          <p className="m-0 text-2xl font-bold break-words">
            {physio ? PAIN_COPY.stopBody : PAIN_COPY.stopBodyRegular}
          </p>
          <p className="m-0 text-xl">Det du hunnit logga sparas.</p>
        </div>
        <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t-[3px] border-care bg-surface-tint px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onHome}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-md bg-care px-6 text-xl font-bold text-care-ink active:scale-[0.98]"
          >
            <Icon name="back" size={28} />
            {PAIN_COPY.stopDone}
          </button>
        </div>
      </div>
    </div>
  );
}
