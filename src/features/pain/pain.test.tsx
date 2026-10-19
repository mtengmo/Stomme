// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import {
  addPainLog,
  createSession,
  listPainLogsBySession,
  setMeta,
  startSession,
} from '../../db/repo';
import type { PlannedExercise } from '../../domain/types';
import { addDays, toLocalDate } from '../../lib/dates';
import { answerPain } from './testHelpers';

const none = { sharp: false, swelling: false, locking: false };

beforeEach(async () => {
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});
afterEach(() => cleanup());

function planFor(id: 'goblet-chair-squat'): PlannedExercise {
  return {
    exerciseId: id,
    sets: 2,
    target: 10,
    loadIndex: 0,
    weightKg: 0,
    restSec: 60,
    reason: 'week1_bodyweight',
  };
}

async function seedSession(
  daysAgo: number,
  status: 'completed' | 'aborted',
  abortReason?: 'pain_stop' | 'user',
) {
  const date = addDays(toLocalDate(new Date()), -daysAgo);
  return createSession(getDb(), {
    templateId: 'A',
    date,
    startedAt: `${date}T08:00:00.000Z`,
    finishedAt: `${date}T08:30:00.000Z`,
    status,
    abortReason,
    programWeek: 1,
    plan: [planFor('goblet-chair-squat')],
    feedback: {},
  });
}

describe('pain picker', () => {
  it('has eleven radios, anchors, three flags and cannot be saved empty', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    expect(await screen.findAllByRole('radio')).toHaveLength(11);
    expect(screen.getByText(/Ingen/)).toBeTruthy();
    expect(screen.getByText(/Värsta/)).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(3);
    const save = screen.getByRole('button', { name: 'Spara' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('radio', { name: '3' }));
    expect((save as HTMLButtonElement).disabled).toBe(false);
    await user.click(save);
    expect(await screen.findByText('Set 1 av 2')).toBeTruthy();
    const s = await getDb().sessions.toCollection().first();
    const logs = await listPainLogsBySession(getDb(), s?.id ?? '');
    expect(logs).toMatchObject([{ timing: 'before', score: 3 }]);
  });

  it('after the last set the after reading comes before the summary', async () => {
    const user = userEvent.setup();
    const s = await startSession(getDb(), 'A', new Date());
    await addPainLog(
      getDb(),
      { sessionId: s.id, timing: 'before', score: 1, redFlags: none },
      new Date(),
    );
    const feedback = Object.fromEntries(
      s.plan.map((p) => [p.exerciseId, { skipped: true }]),
    );
    await getDb().sessions.update(s.id, { feedback });
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /efter passet/ }),
    ).toBeTruthy();
    await answerPain(user, 2);
    expect(
      await screen.findByRole('button', { name: 'Avsluta pass' }),
    ).toBeTruthy();
  });
});

describe('stop and warn', () => {
  it('a red flag stops: stop screen, session aborted with pain_stop', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 1, ['Svullnad']);
    expect(
      await screen.findByRole('heading', { name: 'Avbryt passet.' }),
    ).toBeTruthy();
    expect(screen.getByText('Fråga fysioterapeuten.')).toBeTruthy();
    const s = await getDb().sessions.toCollection().first();
    expect(s).toMatchObject({ status: 'aborted', abortReason: 'pain_stop' });
  });

  it('a score above 3 warns, offers the wall sit and can continue', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 5);
    expect(
      await screen.findByRole('heading', { name: 'Smärtan är över 3.' }),
    ).toBeTruthy();
    expect(screen.getByText(/Fråga fysioterapeuten/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Avsluta' })).toBeTruthy();
    await user.click(screen.getByRole('switch', { name: /väggsittning/i }));
    await user.click(screen.getByRole('button', { name: 'Fortsätt ändå' }));
    expect(await screen.findByText('Set 1 av 2')).toBeTruthy();
    const s = await getDb().sessions.toCollection().first();
    expect(s?.plan.at(-1)).toMatchObject({
      exerciseId: 'wall-sit',
      sets: 3,
      target: 30,
    });
    expect(exercises['wall-sit'].optional).toBe(true);
  });

  it('Avsluta on the warn screen ends the session without pain_stop', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 4);
    await user.click(await screen.findByRole('button', { name: 'Avsluta' }));
    await waitFor(async () => {
      const s = await getDb().sessions.toCollection().first();
      expect(s).toMatchObject({ status: 'aborted', abortReason: 'user' });
    });
  });
});

describe('day after and banner', () => {
  it('prompts on the week view, and a worse reading warns', async () => {
    const user = userEvent.setup();
    const s = await seedSession(1, 'completed');
    await addPainLog(
      getDb(),
      { sessionId: s.id, timing: 'after', score: 2, redFlags: none },
      new Date(),
    );
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Hur känns knäet idag?' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Svara' }));
    await answerPain(user, 3);
    expect(
      await screen.findByRole('heading', {
        name: 'Knäet är värre än efter passet.',
      }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Till veckan' }));
    expect(await screen.findByText(/Knäet var värre dagen efter/)).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Hur känns knäet idag?' }),
    ).toBeNull();
  });

  it('no prompt when the session is older than two days', async () => {
    await seedSession(3, 'completed');
    render(<App />);
    await screen.findByRole('heading', { name: /Vecka/ });
    expect(
      screen.queryByRole('heading', { name: 'Hur känns knäet idag?' }),
    ).toBeNull();
  });

  it('shows the stop banner on week view and preview until a session starts', async () => {
    const user = userEvent.setup();
    await seedSession(5, 'aborted', 'pain_stop');
    const text =
      'Senast stoppade du på grund av knäet. Fråga fysioterapeuten innan nästa pass.';
    render(<App />);
    expect(await screen.findByText(text)).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Starta pass' }));
    expect(await screen.findByText(text)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Starta pass' }));
    await screen.findByRole('heading', { name: /smärta|knäet/i });
    expect(screen.queryByText(text)).toBeNull();
  });
});

describe('pass preview suggestions', () => {
  it('shows Förra gången and Idag with a reason and the physio line after a stop', async () => {
    await setMeta(getDb(), 'program', {
      startDate: addDays(toLocalDate(new Date()), -7),
    });
    const first = await seedSession(10, 'completed');
    await getDb().sessions.update(first.id, { programWeek: 2 });
    await getDb().setLogs.bulkAdd(
      [1, 2].map((n) => ({
        id: `l${n}`,
        sessionId: first.id,
        exerciseId: 'goblet-chair-squat' as const,
        setNumber: n,
        side: 'both' as const,
        amount: 10,
        loadIndex: 1,
        weightKg: 10,
        loggedAt: `2026-10-0${n}T08:00:00.000Z`,
      })),
    );
    window.location.hash = '#/pass/A';
    const { unmount } = render(<App />);
    expect(await screen.findAllByText('Förra gången')).toHaveLength(1);
    expect(screen.getAllByText('2×10 · 10 kg').length).toBe(1);
    expect(screen.getAllByText('Idag').length).toBe(5);
    expect(
      screen.getByText('Du klarade alla set. Lite fler denna gång.'),
    ).toBeTruthy();
    unmount();

    await seedSession(2, 'aborted', 'pain_stop');
    window.location.hash = '#/pass/A';
    render(<App />);
    expect(
      (await screen.findAllByText('Knäet gav stopp. Fråga fysioterapeuten.'))
        .length,
    ).toBeGreaterThan(0);
    // no per-row triangle line: the banner and the reason text already say it
    expect(screen.queryByText('Fråga fysioterapeuten')).toBeNull();
    expect(screen.queryByText('Fråga fysioterapeuten.')).toBeNull();
  });
});

async function openSession(opts: { before?: number; skipAll?: boolean } = {}) {
  const s = await startSession(getDb(), 'A', new Date());
  if (opts.before !== undefined) {
    await addPainLog(
      getDb(),
      { sessionId: s.id, timing: 'before', score: opts.before, redFlags: none },
      new Date(),
    );
  }
  if (opts.skipAll) {
    await getDb().sessions.update(s.id, {
      feedback: Object.fromEntries(
        s.plan.map((p) => [p.exerciseId, { skipped: true }]),
      ),
    });
  }
  return s;
}

describe('safety gates', () => {
  it('opening the session directly without a before reading goes to the pain screen', async () => {
    const s = await openSession();
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /Hur känns högra knäet nu/ }),
    ).toBeTruthy();
  });

  it('the before screen cannot be re-entered once a reading exists', async () => {
    const s = await openSession({ before: 2 });
    window.location.hash = `#/smarta/${s.id}/before`;
    render(<App />);
    expect(
      await screen.findByRole('button', { name: 'Klar set' }),
    ).toBeTruthy();
    expect(await listPainLogsBySession(getDb(), s.id)).toHaveLength(1);
  });

  it('the before screen cannot be re-entered once a set is logged', async () => {
    const s = await openSession();
    await getDb().setLogs.add({
      id: 'x',
      sessionId: s.id,
      exerciseId: 'goblet-chair-squat',
      setNumber: 1,
      side: 'both',
      amount: 10,
      loadIndex: 0,
      weightKg: 0,
      loggedAt: new Date().toISOString(),
    });
    window.location.hash = `#/smarta/${s.id}/before`;
    render(<App />);
    expect(
      await screen.findByRole('button', { name: 'Klar set' }),
    ).toBeTruthy();
    expect(await listPainLogsBySession(getDb(), s.id)).toHaveLength(0);
  });

  it('a knee problem mid-session aborts with pain_stop and shows the stop screen', async () => {
    const user = userEvent.setup();
    const s = await openSession({ before: 1 });
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Avbryt' }));
    await user.click(
      await screen.findByRole('button', { name: 'Avbryt på grund av knäet' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Avbryt passet.' }),
    ).toBeTruthy();
    expect(await getDb().sessions.get(s.id)).toMatchObject({
      status: 'aborted',
      abortReason: 'pain_stop',
    });
  });

  it('plain Avbryt keeps reason user', async () => {
    const user = userEvent.setup();
    const s = await openSession({ before: 1 });
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Avbryt' }));
    await user.click(
      await screen.findByRole('button', { name: 'Avbryt passet' }),
    );
    await waitFor(async () =>
      expect((await getDb().sessions.get(s.id))?.abortReason).toBe('user'),
    );
  });

  it('a stored before red flag is enforced on load', async () => {
    const s = await startSession(getDb(), 'A', new Date());
    await addPainLog(
      getDb(),
      {
        sessionId: s.id,
        timing: 'before',
        score: 1,
        redFlags: { ...none, sharp: true },
      },
      new Date(),
    );
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Avbryt passet.' }),
    ).toBeTruthy();
    expect((await getDb().sessions.get(s.id))?.abortReason).toBe('pain_stop');
    expect(screen.queryByRole('button', { name: 'Klar set' })).toBeNull();
  });

  it('a stored warn before reading replans when no sets are logged', async () => {
    const s = await openSession({ before: 6 });
    await getDb().sessions.update(s.id, { plan: [] });
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    await waitFor(async () =>
      expect(
        ((await getDb().sessions.get(s.id))?.plan ?? []).length,
      ).toBeGreaterThan(0),
    );
  });

  it('an after red flag aborts with pain_stop and the banner follows', async () => {
    const user = userEvent.setup();
    const s = await openSession({ before: 1, skipAll: true });
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    await answerPain(user, 2, ['Svullnad']);
    expect(
      await screen.findByRole('heading', { name: 'Avbryt passet.' }),
    ).toBeTruthy();
    expect(await getDb().sessions.get(s.id)).toMatchObject({
      status: 'aborted',
      abortReason: 'pain_stop',
    });
    await user.click(screen.getByRole('button', { name: 'Till veckan' }));
    expect(
      await screen.findByText(/Senast stoppade du på grund av knäet/),
    ).toBeTruthy();
  });

  it('an after warn continues to the summary with Gå vidare', async () => {
    const user = userEvent.setup();
    const s = await openSession({ before: 1, skipAll: true });
    window.location.hash = `#/session/${s.id}`;
    render(<App />);
    await answerPain(user, 5);
    expect(
      await screen.findByRole('heading', { name: 'Smärtan är över 3.' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Gå vidare' }));
    expect(
      await screen.findByRole('button', { name: 'Avsluta pass' }),
    ).toBeTruthy();
  });

  it('a day-after red flag shows the stop screen, keeps the session and holds the next plan', async () => {
    const user = userEvent.setup();
    await setMeta(getDb(), 'program', {
      startDate: addDays(toLocalDate(new Date()), -7),
    });
    const s = await seedSession(1, 'completed');
    window.location.hash = `#/smarta/${s.id}/dayAfter`;
    render(<App />);
    await answerPain(user, 1, ['Knät låser sig']);
    expect(
      await screen.findByRole('heading', {
        name: 'Fråga fysioterapeuten innan nästa pass.',
      }),
    ).toBeTruthy();
    expect((await getDb().sessions.get(s.id))?.status).toBe('completed');
    await user.click(screen.getByRole('button', { name: 'Till veckan' }));
    expect(
      await screen.findByText(/Senast stoppade du på grund av knäet/),
    ).toBeTruthy();
    cleanup();
    window.location.hash = '#/pass/A';
    render(<App />);
    expect(
      (await screen.findAllByText('Knäet gav stopp. Fråga fysioterapeuten.'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('a day-after reading outside the window is refused', async () => {
    const s = await seedSession(4, 'completed');
    window.location.hash = `#/smarta/${s.id}/dayAfter`;
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Vecka/ })).toBeTruthy();
  });

  it('above threshold only: the day-after screen does not claim worse than after', async () => {
    const user = userEvent.setup();
    const s = await seedSession(1, 'completed');
    await addPainLog(
      getDb(),
      { sessionId: s.id, timing: 'after', score: 6, redFlags: none },
      new Date(),
    );
    window.location.hash = `#/smarta/${s.id}/dayAfter`;
    render(<App />);
    await answerPain(user, 5);
    expect(
      await screen.findByRole('heading', { name: 'Smärtan är över 3.' }),
    ).toBeTruthy();
  });
});
