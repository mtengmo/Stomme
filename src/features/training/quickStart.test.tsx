// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';

beforeEach(async () => {
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);
it('asks only about focus first and persists only explicitly selected equipment through Back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad vill du träna?' });
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('heading', { name: /Vecka/ })).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Huvudmeny' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Bli starkare' }));
  expect(screen.queryByRole('checkbox', { checked: true })).toBeNull();
  expect(
    screen
      .getByRole('combobox', { name: 'Träningsvana' })
      .closest('details')
      ?.hasAttribute('open'),
  ).toBe(undefined);
  await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Antal hantlar' }),
    '2',
  );
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(screen.getByRole('button', { name: 'Bli starkare' }));
  expect(
    (
      screen.getByRole('combobox', {
        name: 'Antal hantlar',
      }) as HTMLSelectElement
    ).value,
  ).toBe('2');
  await user.click(screen.getByRole('button', { name: 'Visa mitt pass' }));
  await screen.findByRole('button', { name: 'Börja passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'general',
    equipment: ['bodyweight', 'dumbbell-2'],
    experience: 'new',
  });
  expect(screen.queryByLabelText('Set', { exact: true })).toBeNull();
  expect(await getDb().sessions.count()).toBe(0);
});
it('preserves a returning user’s active session and makes resuming the primary action', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'running',
    equipment: ['bodyweight'],
    experience: 'new',
  });
  const session = await createSession(getDb(), {
    templateId: 'A',
    programId: 'running',
    date: '2026-10-20',
    startedAt: '2026-10-20T08:00:00Z',
    status: 'in_progress',
    programWeek: 1,
    plan: [],
    feedback: {},
    checkins: {
      before: {
        recordedAt: '2026-10-20T08:00:00Z',
        feeling: 'ready',
        symptoms: null,
      },
    },
  });
  const user = userEvent.setup();
  render(<App />);
  const resume = await screen.findByRole('link', {
    name: 'Fortsätt passet',
  });
  expect(resume.getAttribute('href')).toBe(`#/session/${session.id}`);
  expect(
    screen.queryByRole('heading', { name: 'Vad vill du träna?' }),
  ).toBeNull();
  await user.click(screen.getByText('Ändra', { exact: true }));
  expect(
    (
      screen.getByRole('button', {
        name: 'Byt inriktning eller utrustning',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(await getDb().sessions.get(session.id)).toMatchObject({
    status: 'in_progress',
    programId: 'running',
  });
});

it('starts ordinary running strength without a mandatory before questionnaire', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'running',
    equipment: ['bodyweight'],
    experience: 'some',
  });
  window.location.hash = '#/traning/A';
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Börja passet' }));
  await screen.findByRole('button', { name: 'Klar set' });
  expect(
    screen.queryByRole('heading', { name: 'Hur känns kroppen?' }),
  ).toBeNull();
  expect(await getDb().sessions.count()).toBe(1);
});

it('keeps first-use answers when leaving through the nav and coming back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
  await user.click(screen.getByRole('link', { name: 'Inställningar' }));
  await screen.findByRole('heading', { name: 'Inställningar' });
  expect(screen.queryByRole('checkbox', { name: 'Hantlar' })).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Träning' }));
  const box = await screen.findByRole('checkbox', { name: 'Hantlar' });
  expect((box as HTMLInputElement).checked).toBe(true);
});
