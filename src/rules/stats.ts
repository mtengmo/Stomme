import { exercises } from '../content/exercises';
import type { ExerciseId, PainLog, Session, SetLog } from '../domain/types';
import { addDays, daysBetween, toLocalDate, weekStart } from '../lib/dates';

/** Pure statistics for the history charts. No React, no Dexie. */

export interface WeekVolume {
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string;
  /** Sets done; a per-side set (right + left) counts once. */
  sets: number;
  /** Sum of weightKg x amount over rep-based logs (both sides count). */
  tonnageKg: number;
}

export interface WeeklyVolumeOptions {
  /** A date; the series runs at least through the week containing it. */
  through?: string;
  /** Return exactly this many weeks ending at the last week (zero-filled backwards). */
  weeks?: number;
}

/**
 * Volume per Monday-first week, zero-filled between the first and last week.
 * A week belongs to the session's `date`. Logs of unknown sessions are ignored.
 */
export function weeklyVolume(
  sessions: readonly Session[],
  logs: readonly SetLog[],
  opts: WeeklyVolumeOptions = {},
): WeekVolume[] {
  const weekOf = new Map(sessions.map((s) => [s.id, weekStart(s.date)]));
  const sets = new Map<string, Set<string>>();
  const tonnage = new Map<string, number>();
  for (const log of logs) {
    const week = weekOf.get(log.sessionId);
    if (week === undefined) continue;
    let keys = sets.get(week);
    if (!keys) {
      keys = new Set();
      sets.set(week, keys);
    }
    keys.add(`${log.sessionId}|${log.exerciseId}|${log.setNumber}`);
    if (exercises[log.exerciseId]?.unit === 'reps') {
      tonnage.set(week, (tonnage.get(week) ?? 0) + log.weightKg * log.amount);
    }
  }

  const weeks = [...weekOf.values()];
  let first = weeks.length > 0 ? weeks.reduce((a, b) => (a < b ? a : b)) : null;
  let last = weeks.length > 0 ? weeks.reduce((a, b) => (a > b ? a : b)) : null;
  if (opts.through) {
    const t = weekStart(opts.through);
    if (last === null || t > last) last = t;
    if (first === null) first = t;
  }
  if (first === null || last === null) return [];
  if (opts.weeks !== undefined) first = addDays(last, -7 * (opts.weeks - 1));

  const out: WeekVolume[] = [];
  const count = daysBetween(first, last) / 7;
  for (let i = 0; i <= count; i++) {
    const ws = addDays(first, 7 * i);
    out.push({
      weekStart: ws,
      sets: sets.get(ws)?.size ?? 0,
      tonnageKg: tonnage.get(ws) ?? 0,
    });
  }
  return out;
}

export interface LoadPoint {
  sessionId: string;
  /** Local date of the session's first logged set for this exercise. */
  date: string;
  /** ISO instant used for ordering. */
  at: string;
  weightKg: number;
  amount: number;
}

/** One point per session: the heaviest weight and the largest amount logged. */
export function loadPerExercise(
  logs: readonly SetLog[],
  exerciseId: ExerciseId,
): LoadPoint[] {
  const bySession = new Map<string, LoadPoint>();
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue;
    const p = bySession.get(log.sessionId);
    if (!p) {
      bySession.set(log.sessionId, {
        sessionId: log.sessionId,
        date: toLocalDate(new Date(log.loggedAt)),
        at: log.loggedAt,
        weightKg: log.weightKg,
        amount: log.amount,
      });
    } else {
      p.weightKg = Math.max(p.weightKg, log.weightKg);
      p.amount = Math.max(p.amount, log.amount);
      if (log.loggedAt < p.at) {
        p.at = log.loggedAt;
        p.date = toLocalDate(new Date(log.loggedAt));
      }
    }
  }
  return [...bySession.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** Exercises that have at least one log, in catalogue order. */
export function loggedExerciseIds(logs: readonly SetLog[]): ExerciseId[] {
  const seen = new Set(logs.map((l) => l.exerciseId));
  return (Object.keys(exercises) as ExerciseId[]).filter((id) => seen.has(id));
}

export interface PainPoint {
  sessionId: string;
  date: string;
  score: number;
}

export type PainSeries = Record<PainLog['timing'], PainPoint[]>;

/** Pain scores grouped by timing, each sorted by date (then creation time). */
export function painSeries(painLogs: readonly PainLog[]): PainSeries {
  const sorted = [...painLogs].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
  const out: PainSeries = { before: [], after: [], dayAfter: [] };
  for (const l of sorted) {
    out[l.timing].push({
      sessionId: l.sessionId,
      date: l.date,
      score: l.score,
    });
  }
  return out;
}
