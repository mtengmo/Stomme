/**
 * DEV ONLY. SYNTHETIC demo data for screenshots and e2e, never real training
 * history. Reachable only through the DEV route #/dev/demo; the production
 * build does not include it.
 */
import { exercises } from '../content/exercises';
import { templates } from '../content/templates';
import type { PainLog, Session, SetLog, TemplateId } from '../domain/types';
import { addDays, toLocalDate, weekStart } from '../lib/dates';

export const DEMO_NOTE = 'Syntetisk testdata. Inte ett riktigt pass.';

export interface DemoData {
  sessions: Session[];
  setLogs: SetLog[];
  painLogs: PainLog[];
}

/** Twelve weeks back from `now`: two passes a week with a thin week and a missed one. */
export function buildDemoData(now: Date): DemoData {
  const today = toLocalDate(now);
  const monday = weekStart(today);
  const sessions: Session[] = [];
  const setLogs: SetLog[] = [];
  const painLogs: PainLog[] = [];
  let seq = 0;
  const id = (p: string) => `demo-${p}-${++seq}`;

  for (let w = 11; w >= 0; w--) {
    if (w === 7) continue; // a missed week
    const weekMonday = addDays(monday, -7 * w);
    const days: [TemplateId, number][] = [
      ['A', 1],
      ['B', 4],
    ];
    for (const [templateId, offset] of days) {
      if (w === 4 && templateId === 'B') continue; // a thin week
      const date = addDays(weekMonday, offset);
      if (date > today) continue;
      const progress = 11 - w;
      const startedAt = `${date}T17:30:00.000Z`;
      const sessionId = id('s');
      const session: Session = {
        id: sessionId,
        templateId,
        date,
        startedAt,
        finishedAt: `${date}T17:58:00.000Z`,
        status: 'completed',
        programWeek: progress + 1,
        plan: templates[templateId].items.map((it) => ({
          exerciseId: it.exerciseId,
          sets: it.sets,
          target: exercises[it.exerciseId].range.start,
          loadIndex: 0,
          weightKg: 0,
          restSec: it.restSec,
          reason: 'start_load',
        })),
        feedback: {},
        note: DEMO_NOTE,
      };
      let minute = 0;
      for (const it of templates[templateId].items) {
        const ex = exercises[it.exerciseId];
        const loadIndex = Math.min(
          ex.loadLadder.length - 1,
          ex.week1LoadIndex + Math.floor(progress / 4),
        );
        const load = ex.loadLadder[loadIndex];
        const amount = Math.min(
          ex.range.max,
          ex.range.start + (progress % 4) * ex.range.step,
        );
        session.plan = session.plan.map((p) =>
          p.exerciseId === it.exerciseId
            ? { ...p, target: amount, loadIndex, weightKg: load?.kg ?? 0 }
            : p,
        );
        session.feedback[it.exerciseId] = {
          effort: progress % 4 === 3 ? 'hard' : 'ok',
        };
        for (let n = 1; n <= it.sets; n++) {
          const sides: SetLog['side'][] = ex.perSide
            ? ['right', 'left']
            : ['both'];
          for (const side of sides) {
            minute += 1;
            setLogs.push({
              id: id('l'),
              sessionId,
              exerciseId: it.exerciseId,
              setNumber: n,
              side,
              amount,
              loadIndex,
              weightKg: load?.kg ?? 0,
              loggedAt: `${date}T17:${String(30 + (minute % 28)).padStart(2, '0')}:00.000Z`,
            });
          }
        }
      }
      sessions.push(session);

      const wave = (progress * 3 + (templateId === 'A' ? 0 : 1)) % 5;
      const scores = {
        before: Math.min(3, 1 + (wave % 3)),
        after: Math.min(5, 1 + wave),
        dayAfter: Math.max(0, wave - 1),
      };
      for (const timing of ['before', 'after', 'dayAfter'] as const) {
        const logDate = timing === 'dayAfter' ? addDays(date, 1) : date;
        if (logDate > today) continue;
        painLogs.push({
          id: id('p'),
          sessionId,
          date: logDate,
          timing,
          score: scores[timing],
          location: 'right_knee',
          redFlags: { sharp: false, swelling: false, locking: false },
          createdAt: `${logDate}T${timing === 'before' ? '17:25' : '18:00'}:00.000Z`,
        });
      }
    }
  }
  return { sessions, setLogs, painLogs };
}
