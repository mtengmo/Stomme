// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { programExcludedIds } from '../../content/programExclusions';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import type { Session, SetLog, TrainingPreferences } from '../../domain/types';
import { NextLevelSuggestions, SummaryNextLevel } from './NextLevelSuggestions';

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support'],
};
const sessions: Session[] = [1, 2].map((n) => ({
  id: `session-${n}`,
  programId: 'general',
  templateId: 'A',
  date: `2026-10-2${n}`,
  startedAt: `2026-10-2${n}T08:00:00Z`,
  status: 'completed',
  programWeek: 2,
  plan: [
    {
      exerciseId: 'push-up',
      sets: 1,
      target: 12,
      variantId: 'bodyweight',
      sides: ['both'],
      loadIndex: 0,
      weightKg: 0,
      restSec: 60,
      reason: 'first_time',
    },
  ],
  feedback: { 'push-up': { effort: 'easy' } },
  checkins: {
    after: {
      feeling: 'good',
      symptoms: null,
      recordedAt: `2026-10-2${n}T09:00:00Z`,
    },
  },
}));
const logs: SetLog[] = sessions.map((session) => ({
  id: `log-${session.id}`,
  sessionId: session.id,
  exerciseId: 'push-up',
  setNumber: 1,
  side: 'both',
  amount: 12,
  weightKg: 0,
  loadIndex: 0,
  variantId: 'bodyweight',
  loggedAt: session.startedAt,
}));

beforeEach(async () => {
  await getDb().delete();
  await getDb().open();
});
afterEach(cleanup);

describe('impact progression suggestions', () => {
  it('no longer offers the retired blast off push-up swap, only the remaining non-impact one', () => {
    render(
      <NextLevelSuggestions
        plan={sessions[0]?.plan ?? []}
        preferences={preferences}
        sessions={sessions}
        logs={logs}
        onChoose={() => {}}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Byt till blast off-armhävning' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Byt till smala armhävningar' }),
    ).toBeTruthy();
  });

  it('never offers excluded exercises when asked to exclude them', () => {
    render(
      <NextLevelSuggestions
        plan={sessions[0]?.plan ?? []}
        preferences={preferences}
        sessions={sessions}
        logs={logs}
        onChoose={() => {}}
        exclude={programExcludedIds}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Byt till blast off-armhävning' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Byt till smala armhävningar' }),
    ).toBeTruthy();
  });

  it('shows the non-impact summary suggestions', async () => {
    const session = sessions[1];
    if (!session) throw new Error('missing session');
    await setMeta(getDb(), 'training', preferences);
    await getDb().sessions.bulkAdd(sessions);
    await getDb().setLogs.bulkAdd(logs);
    render(<SummaryNextLevel session={session} />);
    expect(
      await screen.findByRole('link', { name: 'Smala armhävningar' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Blast off-armhävning' }),
    ).toBeNull();
  });
});
