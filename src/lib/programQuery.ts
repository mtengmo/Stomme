import type { Session, TrainingProgram } from '../domain/types';
import { programProgress } from '../rules/programProgress';

export interface ProgramPassRequest {
  /** 1..daysPerWeek, always the next pass of the programme. */
  pass: number;
  /** 1..4. */
  week: number;
}

/**
 * Whitelist for `?program=n`. Untrusted input never picks a pass: n is only
 * accepted when it is an integer equal to the next pass; any other value
 * (wrong, out of range, not a number) shows the next pass anyway. Without the
 * parameter, without a programme or with a finished block the result is
 * `null`, which means the ordinary preview.
 */
export function parseProgramPass(
  search: string,
  program: Pick<TrainingProgram, 'id' | 'daysPerWeek'> | null | undefined,
  sessions: readonly Session[],
): ProgramPassRequest | null {
  if (!new URLSearchParams(search).has('program') || !program) return null;
  const progress = programProgress(program, sessions);
  if (progress.blockDone) return null;
  return { pass: progress.nextPass, week: progress.week };
}
