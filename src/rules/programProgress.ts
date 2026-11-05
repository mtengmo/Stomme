import type { Session, TrainingProgram } from '../domain/types';

export const BLOCK_WEEKS = 4;

export interface ProgramProgress {
  /** Completed passes of this programme (short passes count, aborted do not). */
  done: number;
  /** 1..4, the week of the next pass. */
  week: number;
  /** 1..daysPerWeek, the pass to do next. */
  nextPass: number;
  blockDone: boolean;
  /** A week was just completed and no pass of the programme has been started since. */
  weekJustDone: boolean;
}

/** A sequence, not a calendar: a missed day only moves the programme forward. */
export function programProgress(
  program: Pick<TrainingProgram, 'id' | 'daysPerWeek'>,
  sessions: readonly Session[],
): ProgramProgress {
  const mine = sessions.filter(
    (session) => session.programPass?.programId === program.id,
  );
  const done = mine.filter((session) => session.status === 'completed').length;
  const n = program.daysPerWeek;
  return {
    done,
    week: Math.min(BLOCK_WEEKS, Math.floor(done / n) + 1),
    nextPass: (done % n) + 1,
    blockDone: done >= BLOCK_WEEKS * n,
    weekJustDone:
      done > 0 &&
      done % n === 0 &&
      !mine.some((session) => session.status === 'in_progress'),
  };
}
