import type { ReactNode } from 'react';
import { Tally, type TallyItem } from '../../ui/Tally';

export interface SessionFrameProps {
  title: string;
  /** Index of the current step; exposed as data-step for the e2e flow. */
  stepId: number;
  clock: string;
  tally: { items: TallyItem[]; label: string };
  onAbort(): void;
  children: ReactNode;
  /** Snackbar slot, sits directly above the actions. */
  snack?: ReactNode;
  /** The action stack in the bottom third. */
  actions: ReactNode;
}

/** Full-screen session layout: header, one thing in the middle, actions at the thumb. */
export function SessionFrame({
  title,
  stepId,
  clock,
  tally,
  onAbort,
  children,
  snack,
  actions,
}: SessionFrameProps) {
  return (
    <div
      data-step={stepId}
      className="session-frame mx-auto flex h-dvh max-w-md flex-col px-5"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 pt-1">
        <p className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 text-base font-bold">
          {title}
          <span className="flex items-center gap-1 font-normal text-ink-soft">
            <span>Passets tid {clock}</span>
          </span>
        </p>
        <button
          type="button"
          onClick={onAbort}
          className="min-h-12 px-2 text-base font-bold underline decoration-2 underline-offset-4"
        >
          Avbryt
        </button>
      </header>
      <div className="flex shrink-0 items-center gap-3">
        <Tally items={tally.items} label={tally.label} size={32} tone="edge" />
        <span className="text-base text-ink-soft" aria-hidden="true">
          set kvar
        </span>
      </div>
      <div className="session-content flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-2">
        {children}
      </div>
      <div className="-mx-5 flex shrink-0 flex-col">
        {snack}
        <div className="flex flex-col gap-1 border-t-[3px] border-ink bg-paper px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {actions}
        </div>
      </div>
    </div>
  );
}
