// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';
import { toLocalDate } from '../../lib/dates';

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);
const next = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Nästa' }));

it('asks one question per screen and keeps answers through Back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad vill du träna?' });
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('heading', { name: /Vecka/ })).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Huvudmeny' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Knärehab' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Träna knäna' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Bli starkare' }));
  const heading = screen.getByRole('heading', {
    name: 'Egenvikt eller utrustning?',
  });
  expect(document.activeElement).toBe(heading);
  expect(
    (
      screen.getByRole('radio', {
        name: 'Egenvikt – kroppen, en stol och en vägg',
      }) as HTMLInputElement
    ).checked,
  ).toBe(true);
  expect(screen.queryByRole('checkbox', { name: 'Hantlar' })).toBeNull();
  await user.click(screen.getByRole('radio', { name: 'Utrustning' }));
  await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Antal hantlar' }),
    '2',
  );
  // Owning dumbbells opens the weights panel by itself.
  expect(
    screen.getByText('Ange vikterna du äger').closest('details')?.open,
  ).toBe(true);
  await next(user);
  expect(screen.getByRole('group', { name: 'Träningsvana' })).toBeTruthy();
  expect(screen.queryByText(/rekommenderad/i)).toBeNull();
  await user.click(screen.getByRole('radio', { name: /Viss vana/ }));
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(screen.getByRole('button', { name: 'Bli starkare' }));
  expect(
    (
      screen.getByRole('combobox', {
        name: 'Antal hantlar',
      }) as HTMLSelectElement
    ).value,
  ).toBe('2');
  await next(user);
  expect(
    (screen.getByRole('radio', { name: /Viss vana/ }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Visa mitt pass' }));
  await screen.findByRole('button', { name: 'Börja passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'general',
    equipment: ['bodyweight', 'dumbbell-2'],
    experience: 'some',
  });
  expect(await getDb().sessions.count()).toBe(0);
});

it('saves bodyweight as body, chair and wall and a chosen body-part focus', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  await next(user);
  await next(user);
  await user.click(screen.getByRole('radio', { name: 'Välj kroppsdelar' }));
  const button = screen.getByRole('button', {
    name: 'Visa mitt pass',
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(screen.getByText(/Välj minst en kroppsdel/)).toBeTruthy();
  // Shoulders have no exercise with bodyweight only at the beginner level.
  expect(
    (screen.getByRole('checkbox', { name: 'Axlar' }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  await user.click(screen.getByRole('checkbox', { name: 'Ben & säte' }));
  expect(button.disabled).toBe(false);
  await user.click(button);
  await screen.findByRole('button', { name: 'Börja passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'general',
    equipment: ['bodyweight', 'chair', 'support'],
    experience: 'new',
    bodyParts: ['legs'],
  });
  expect(screen.getByText(/Fokus: Ben & säte/)).toBeTruthy();
});

it('always saves new for rehab and asks for the side at the equipment step', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Knärehab' }));
  expect(screen.queryByRole('button', { name: 'Nästa' })).toBeNull();
  await user.selectOptions(
    screen.getByRole('combobox', { name: /Arbetande sida/ }),
    'right',
  );
  await user.click(screen.getByRole('button', { name: 'Visa mitt pass' }));
  await screen.findByRole('button', { name: 'Börja passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'rehab',
    experience: 'new',
    rehabFocus: 'knee',
    rehabSide: 'right',
  });
});

it('falls back to defaults for an old or damaged draft', async () => {
  sessionStorage.setItem(
    'stomme.quickstart.draft',
    JSON.stringify({ goal: 'general', equipment: ['laser'], experience: 7 }),
  );
  render(<App />);
  await screen.findByRole('heading', { name: 'Egenvikt eller utrustning?' });
  expect(
    (
      screen.getByRole('radio', {
        name: 'Egenvikt – kroppen, en stol och en vägg',
      }) as HTMLInputElement
    ).checked,
  ).toBe(true);
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
    date: toLocalDate(new Date()),
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    programWeek: 1,
    plan: [],
    feedback: {},
    checkins: {
      before: {
        recordedAt: new Date().toISOString(),
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
  await user.click(screen.getByRole('radio', { name: 'Utrustning' }));
  await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
  await user.click(screen.getByRole('link', { name: 'Inställningar' }));
  await screen.findByRole('heading', { name: 'Inställningar' });
  expect(screen.queryByRole('checkbox', { name: 'Hantlar' })).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Träning' }));
  const box = await screen.findByRole('checkbox', { name: 'Hantlar' });
  expect((box as HTMLInputElement).checked).toBe(true);
});

it('builds your own first workout: nothing is saved until Skapa pass', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Skapa eget pass' }),
  );
  await user.click(screen.getByRole('radio', { name: 'Utrustning' }));
  await user.click(
    screen.getByRole('checkbox', { name: 'Stabil stol eller bänk' }),
  );
  await next(user);
  await user.click(screen.getByRole('radio', { name: /Viss vana/ }));
  expect(screen.getByText('Steg 3 av 4')).toBeTruthy();
  await next(user);
  const heading = screen.getByRole('heading', { name: 'Välj dina övningar' });
  expect(document.activeElement).toBe(heading);
  expect(screen.getByText('Steg 4 av 4')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Nästa' })).toBeNull();
  const create = screen.getByRole('button', {
    name: 'Skapa pass',
  }) as HTMLButtonElement;
  expect(create.disabled).toBe(true);
  expect(screen.getByText('Välj minst en övning.')).toBeTruthy();
  expect(screen.getByText('Inga övningar valda än.')).toBeTruthy();

  const rows = screen.getAllByRole('button', { name: /^Välj: / });
  await user.click(rows[0] as HTMLElement);
  await user.click(rows[1] as HTMLElement);
  expect(screen.getByText(/2 av 12 övningar/)).toBeTruthy();
  expect(screen.getByText(/ca \d+ min/)).toBeTruthy();
  expect(create.disabled).toBe(false);
  expect(await getDb().meta.get('training')).toBeUndefined();
  expect(await getDb().meta.get('customWorkouts')).toBeUndefined();

  // Back keeps the picks.
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await next(user);
  expect(screen.getByText(/2 av 12 övningar/)).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Skapa pass' }));
  await screen.findByRole('button', { name: 'Börja passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'general',
    experience: 'some',
    equipment: ['bodyweight', 'chair'],
  });
  const workouts = (await getDb().meta.get('customWorkouts'))?.value as {
    name: string;
    exerciseIds: string[];
  }[];
  expect(workouts).toHaveLength(1);
  expect(workouts[0]?.exerciseIds).toHaveLength(2);
  expect(workouts[0]?.name).toMatch(/^Eget pass /);
  expect(await getDb().sessions.count()).toBe(0);
  expect(sessionStorage.getItem('stomme.quickstart.draft')).toBeNull();
  expect(sessionStorage.getItem('stomme.quickstart.selection')).toBeNull();
  expect(screen.getByLabelText('Namn på passet')).toBeTruthy();
});

it('forgets the picks when another goal is chosen', async () => {
  sessionStorage.setItem('stomme.quickstart.selection', JSON.stringify(['E1']));
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  expect(sessionStorage.getItem('stomme.quickstart.selection')).toBeNull();
});

it('never reaches the pick step for knee rehab', async () => {
  sessionStorage.setItem(
    'stomme.quickstart.draft',
    JSON.stringify({ goal: 'knee', step: 'pick' }),
  );
  render(<App />);
  await screen.findByRole('heading', { name: 'Egenvikt eller utrustning?' });
  expect(
    screen.queryByRole('heading', { name: 'Välj dina övningar' }),
  ).toBeNull();
});
