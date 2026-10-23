import type { Effort, Session, Unit } from '../../domain/types';
import { Icon } from '../../ui/Icon';
import { PencilTick } from '../../ui/PencilTick';

export const EFFORT_LABEL: Record<Effort, string> = {
  easy: 'Lätt',
  ok: 'Lagom',
  hard: 'Tungt',
};

const UNIT_WORD: Record<Unit, string> = {
  reps: 'rep.',
  seconds: 's',
  meters: 'm',
  laps: 'varv',
};

export function amountText(amount: number, unit: Unit): string {
  return `${amount} ${UNIT_WORD[unit]}`;
}

export function kgText(kg: number): string {
  return kg > 0 ? `${kg} kg` : 'kroppsvikt';
}

/** Done is an outline in --done (a fill in Hav light); every other state is quiet and carries icon plus word. */
export function StatusChip({ session }: { session: Session }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-base font-bold';
  if (session.status === 'completed')
    return (
      <span
        className={`${base} border-2 border-(--done-chip-border) bg-(--done-fill) text-(--done-fill-ink)`}
      >
        <PencilTick size={22} fill="var(--done-fill-ink)" />
        Klar
      </span>
    );
  if (session.status === 'aborted')
    return (
      <span className={`${base} bg-upcoming text-upcoming-ink`}>
        <Icon name="minus" size={18} />
        {session.abortReason === 'pain_stop' ? 'Stoppad' : 'Avbruten'}
      </span>
    );
  return (
    <span className={`${base} border-2 border-accent text-accent`}>
      <Icon name="clock" size={18} />
      Pågår
    </span>
  );
}
