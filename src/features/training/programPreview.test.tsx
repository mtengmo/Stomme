// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import { saveTrainingProgram } from '../../db/program';
import { createSession, listSessions, setMeta } from '../../db/repo';
import { programFixture } from '../../test/programFixture';

const prefs = {
  programId: 'general',
  experience: 'new',
  equipment: ['bodyweight', 'chair', 'support'],
};

beforeEach(async () => {
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
  await setMeta(getDb(), 'training', prefs);
  await saveTrainingProgram(getDb(), programFixture());
});
afterEach(cleanup);

it('shows pass 1 for a wrong n, hides routine controls and E-codes, and saves programPass', async () => {
  window.location.hash = '#/traning/A?program=2';
  const user = userEvent.setup();
  render(<App />);
  expect(
    await screen.findByRole('heading', { level: 1, name: /^Pass 1 · / }),
  ).toBeTruthy();
  expect(screen.getByText('Vecka 1 av 4')).toBeTruthy();
  expect(screen.queryByText(/Saknas:/)).toBeNull();
  expect(screen.queryByText(/\bE\d{2}\b/)).toBeNull();
  expect(screen.queryByText(/Spara som mitt standardpass/i)).toBeNull();
  expect(screen.queryByRole('button', { name: /standard/i })).toBeNull();
  expect(
    screen.getByText('Sitta ner och resa sig från stol', { exact: false }),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Starta passet' }));
  await waitFor(async () =>
    expect((await listSessions(getDb())).length).toBe(1),
  );
  const [session] = await listSessions(getDb());
  expect(session?.programPass).toEqual({
    programId: 'prog-1',
    pass: 1,
    week: 1,
  });
  expect(session?.templateId).toBe('A');
  expect(session?.plan.map((p) => p.exerciseId)).toEqual(
    programFixture().passes[0]?.exerciseIds,
  );
});

it('shows the next pass after a completed one and keeps the start gate', async () => {
  await createSession(getDb(), {
    templateId: 'A',
    programId: 'general',
    date: '2026-11-03',
    startedAt: '2026-11-03T08:00:00.000Z',
    status: 'completed',
    programWeek: 1,
    programPass: { programId: 'prog-1', pass: 1, week: 1 },
    plan: [],
    feedback: {},
    checkins: {},
  });
  window.location.hash = '#/traning/A?program=1';
  render(<App />);
  expect(
    await screen.findByRole('heading', { level: 1, name: /^Pass 2 · / }),
  ).toBeTruthy();
  expect(screen.getByText('Vecka 1 av 4')).toBeTruthy();
  const start = screen.getByRole('button', { name: 'Starta passet' });
  expect((start as HTMLButtonElement).disabled).toBe(false);
  expect(screen.queryByText('Börja passet')).toBeNull();
});

it('without the parameter the ordinary preview is shown', async () => {
  window.location.hash = '#/traning/A';
  render(<App />);
  expect(
    await screen.findByRole('button', { name: 'Starta passet' }),
  ).toBeTruthy();
  expect(screen.queryByText(/Vecka \d av 4/)).toBeNull();
});

it('leaves out pass exercises that no longer fit the equipment and says so', async () => {
  await saveTrainingProgram(
    getDb(),
    programFixture({
      passes: [
        {
          focus: 'full',
          template: 'A',
          exerciseIds: [
            'goblet-chair-squat',
            'glute-bridge',
            'back-extension',
            'step-up',
            'dead-bug',
          ],
        },
        programFixture().passes[1] as never,
      ],
    }),
  );
  window.location.hash = '#/traning/A?program=1';
  render(<App />);
  expect(
    await screen.findByText(/Borttaget ur dagens pass eftersom utrustningen/),
  ).toBeTruthy();
  expect(
    screen.getByText(
      (_, el) =>
        el?.tagName === 'P' &&
        !!el.textContent?.includes(
          exercises['step-up'].name.toLocaleLowerCase('sv'),
        ),
    ),
  ).toBeTruthy();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Starta passet' }));
  await waitFor(async () =>
    expect((await listSessions(getDb())).length).toBe(1),
  );
  const [session] = await listSessions(getDb());
  expect(session?.plan.map((p) => p.exerciseId)).not.toContain('step-up');
  expect(session?.plan.length).toBe(4);
});

it('a rehab user opening ?program=1 gets the ordinary rehab preview', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'rehab',
    rehabFocus: 'custom',
    experience: 'new',
    equipment: ['bodyweight', 'chair', 'support'],
  });
  window.location.hash = '#/traning/A?program=1';
  render(<App />);
  await screen.findByRole('heading', { level: 1 });
  expect(screen.queryByText(/Vecka \d av 4/)).toBeNull();
  expect(
    screen.queryByRole('heading', { level: 1, name: /^Pass 1 · / }),
  ).toBeNull();
});

it('opens the row editor of the exercise named by ?byt=', async () => {
  const target = programFixture().passes[0]?.exerciseIds[1];
  window.location.hash = `#/traning/A?program=1&byt=${target}`;
  render(<App />);
  const open = await screen.findByRole('button', { name: /Stäng/ });
  expect(open.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('button', { name: 'Byt övning' })).toBeTruthy();
});

it('opens the editor without a row for ?byt=alla', async () => {
  window.location.hash = '#/traning/A?program=1&byt=alla';
  render(<App />);
  await screen.findByRole('button', { name: 'Visa passöversikt' });
  expect(screen.queryByRole('button', { name: 'Byt övning' })).toBeNull();
});

/** The draft key prefix of the programme pass preview, found from what it stores. */
async function draftPrefix(): Promise<string> {
  window.location.hash = '#/traning/A?program=1';
  render(<App />);
  await screen.findByRole('button', { name: 'Starta passet' });
  await waitFor(() =>
    expect(
      Object.keys(sessionStorage).some((key) => key.endsWith('.short')),
    ).toBe(true),
  );
  const key = Object.keys(sessionStorage).find((k) => k.endsWith('.short'));
  cleanup();
  return (key as string).slice(0, -'.short'.length);
}

it('?byt= opens the editor even when Kortpass was chosen earlier', async () => {
  const prefix = await draftPrefix();
  sessionStorage.setItem(`${prefix}.short`, 'true');
  const target = programFixture().passes[0]?.exerciseIds[1];
  window.location.hash = `#/traning/A?program=1&byt=${target}`;
  render(<App />);
  const open = await screen.findByRole('button', { name: /Stäng/ });
  expect(open.getAttribute('aria-expanded')).toBe('true');
  await waitFor(() =>
    expect(sessionStorage.getItem(`${prefix}.short`)).toBe('false'),
  );
});

it('?byt= for an exercise that is not in the draft opens no other row', async () => {
  const prefix = await draftPrefix();
  sessionStorage.setItem(`${prefix}.open`, '0');
  window.location.hash = '#/traning/A?program=1&byt=finns-inte';
  render(<App />);
  await screen.findByRole('button', { name: 'Visa passöversikt' });
  expect(screen.queryByRole('button', { name: /Stäng/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Byt övning' })).toBeNull();
});
