import type { Session } from '../../domain/types';

export function ShortWorkoutNotice({ session }: { session: Session }) {
  if (session.workoutMode !== 'short') return null;
  return (
    <p className="m-0 text-base font-bold">
      Kortpass
      {session.fullPlan
        ? ` · ${session.plan.length} av ${session.fullPlan.length} övningar`
        : ''}
      . Ditt ordinarie A/B-pass behålls till nästa gång.
    </p>
  );
}
