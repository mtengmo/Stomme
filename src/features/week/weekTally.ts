import { exercises } from '../../content/exercises';
import { templates } from '../../content/templates';
import type { Session, SetLog, TemplateId } from '../../domain/types';
import type { TallyItem } from '../../ui/Tally';

/** A saved roster owns its totals; right + left make one complete set. */
export function weekTally(
  templateId: TemplateId,
  session: Session | undefined,
  logs: readonly SetLog[],
): { total: number; done: number; items: TallyItem[] } {
  const plan = session?.plan ?? templates[templateId].items;
  const sessionLogs = session
    ? logs.filter((log) => log.sessionId === session.id)
    : [];
  let done = 0;
  let total = 0;
  const items = plan.map((item): TallyItem => {
    const skipped = session?.feedback[item.exerciseId]?.skipped === true;
    if (skipped) return { id: item.exerciseId, remaining: 0, skipped: true };
    const sides: SetLog['side'][] = exercises[item.exerciseId].perSide
      ? ['right', 'left']
      : ['both'];
    let complete = 0;
    for (let set = 1; set <= item.sets; set++) {
      if (
        sides.every((side) =>
          sessionLogs.some(
            (log) =>
              log.exerciseId === item.exerciseId &&
              log.setNumber === set &&
              log.side === side,
          ),
        )
      )
        complete += 1;
    }
    total += item.sets;
    done += complete;
    return { id: item.exerciseId, remaining: item.sets - complete };
  });
  return { total, done, items };
}
