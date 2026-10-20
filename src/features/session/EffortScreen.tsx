import { EFFORT_LABEL } from '../../content/copy';
import type { Effort, Exercise } from '../../domain/types';
import { Button } from '../../ui/Button';
import { PencilTick } from '../../ui/PencilTick';
import { SessionFrame, type SessionFrameProps } from './SessionFrame';

const OPTIONS: Effort[] = ['easy', 'ok', 'hard'];

interface EffortScreenProps {
  frame: Omit<SessionFrameProps, 'children' | 'actions'>;
  exercise: Exercise;
  onPick(effort: Effort): void;
}

/** Three words, three big buttons; tapping one logs and moves on. */
export function EffortScreen({ frame, exercise, onPick }: EffortScreenProps) {
  return (
    <SessionFrame
      {...frame}
      actions={OPTIONS.map((e) => (
        <Button
          key={e}
          variant="secondary"
          className="min-h-16"
          onClick={() => onPick(e)}
        >
          {EFFORT_LABEL[e]}
        </Button>
      ))}
    >
      <p className="m-0 text-lg font-bold text-ink-soft">{exercise.name}</p>
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Hur ansträngande var övningen?
        </h1>
        <PencilTick size={88} animate variant={2} className="shrink-0" />
      </div>
      <p className="m-0 text-base text-ink-soft">
        Bedöm ansträngningen, inte smärtan. Rapportera besvär separat.
      </p>
    </SessionFrame>
  );
}
