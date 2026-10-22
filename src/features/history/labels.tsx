import type { Effort, Session, Unit } from '../../domain/types';
import { Icon } from '../../ui/Icon';

export const EFFORT_LABEL: Record<Effort, string> = {
  easy: 'Lätt',
  ok: 'Lagom',
  hard: 'Tungt',
};

const UNIT_WORD: Record<Unit, string> = {
  reps: 'rep.',
  seconds: 's',
  meters: 'm',
};

export function amountText(amount: number, unit: Unit): string {
  return `${amount} ${UNIT_WORD[unit]}`;
}

export function kgText(kg: number): string {
  return kg > 0 ? `${kg} kg` : 'kroppsvikt';
}

/** Done keeps its red outline; every other state is quiet and carries icon plus word. */
export function StatusChip({ session }: { session: Session }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-base font-bold';
  if (session.status === 'completed')
    return (
      <span className={`${base} border-2 border-done text-done`}>
        <Icon name="check" size={18} />
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
