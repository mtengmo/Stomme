import { templates } from '../content/templates';
import type { StommeDB } from '../db/db';
import { createSession, getActiveSession } from '../db/repo';
import type { Session, TemplateId } from '../domain/types';
import { toLocalDate } from '../lib/dates';
import { interimPlan } from '../rules/prescription';

/**
 * Test fixture: an in-progress session without a programme (the shape of
 * sessions stored before programmes existed), planned from the fixed
 * templates. The app no longer creates these; the helper exists so session
 * mechanics (logging, undo, timeout, backup) keep a plain, stable plan.
 * Returns the open session instead of starting a second one.
 */
export async function startSession(
  db: StommeDB,
  templateId: TemplateId,
  now: Date,
  programWeek = 1,
): Promise<Session> {
  const active = await getActiveSession(db);
  if (active) return active;
  return createSession(db, {
    templateId,
    date: toLocalDate(now),
    startedAt: now.toISOString(),
    status: 'in_progress',
    programWeek,
    plan: interimPlan(templates[templateId], programWeek),
    feedback: {},
  });
}
