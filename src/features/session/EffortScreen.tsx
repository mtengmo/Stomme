import { EFFORT_LABEL } from '../../content/copy';
import type { Effort, Exercise } from '../../domain/types';
import { Button } from '../../ui/Button';
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
      <h1 className="m-0 text-5xl leading-none font-extrabold">
        Hur kändes det?
      </h1>
    </SessionFrame>
  );
}
