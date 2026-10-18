import type { ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import { Tally, type TallyItem } from '../../ui/Tally';

export interface SessionFrameProps {
  title: string;
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
  clock,
  tally,
  onAbort,
  children,
  snack,
  actions,
}: SessionFrameProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <header className="flex items-center justify-between gap-3 pt-3">
        <p className="m-0 flex items-center gap-2 text-lg font-bold">
          {title}
          <span className="flex items-center gap-1 font-normal text-ink-soft">
            <Icon name="clock" size={20} />
            <span className="sr-only">Tid </span>
            <span>{clock}</span>
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
      <div className="mt-1">
        <Tally items={tally.items} label={tally.label} size={32} tone="edge" />
      </div>
      <div className="flex flex-1 flex-col gap-4 pt-4 pb-4">{children}</div>
      <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t-[3px] border-ink bg-paper px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {snack}
        {actions}
      </div>
    </div>
  );
}
